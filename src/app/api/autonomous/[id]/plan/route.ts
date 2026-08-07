'use server';

import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface PlanStep {
  agent: string;
  description: string;
  dependsOn: number[];
}

interface PlanPhase {
  name: string;
  steps: PlanStep[];
}

interface Plan {
  phases: PlanPhase[];
}

const VALID_AGENTS = [
  'research',
  'analysis',
  'code_assistant',
  'writer',
  'summarizer',
  'web_search',
  'math_solver',
] as const;

/** POST /api/autonomous/[id]/plan — generate execution plan via LLM */
export async function POST(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const project = await db.autonomousProject.findUnique({ where: { id } });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!['draft', 'planning'].includes(project.status)) {
      return NextResponse.json(
        { error: 'Can only plan draft or planning projects' },
        { status: 400 }
      );
    }

    // Mark as planning
    await db.autonomousProject.update({
      where: { id },
      data: { status: 'planning' },
    });

    // Generate a structured plan via LLM, falling back to heuristic on failure
    let plan: Plan;
    try {
      plan = await generatePlanViaLLM(project.goal, project.mode, project.maxSteps);
    } catch {
      // LLM failed — use heuristic fallback
      plan = generateFallbackPlan(project.goal, project.mode, project.maxSteps);
    }

    // Count total steps
    const totalSteps = plan.phases.reduce((sum, p) => sum + p.steps.length, 0);

    // Save plan and update project
    const updated = await db.autonomousProject.update({
      where: { id },
      data: {
        planJson: JSON.stringify(plan),
        totalSteps,
        status: project.autoExecute ? 'executing' : 'planning',
        startedAt: project.autoExecute ? new Date() : undefined,
      },
    });

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      plan,
      totalSteps,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ------------------------------------------------------------------
// LLM-based plan generation
// ------------------------------------------------------------------

async function generatePlanViaLLM(
  goal: string,
  mode: string,
  maxSteps: number
): Promise<Plan> {
  const zai = await ZAI.create();

  const systemPrompt = `You are an expert task planning agent. Given a user goal, you break it down into a structured execution plan consisting of sequential phases, each containing concrete steps.

Each step is assigned to one of the following agent types:
- "research" — gathers information, context, or data from knowledge
- "analysis" — analyzes data, identifies patterns, evaluates options
- "code_assistant" — writes, refines, or debugs code
- "writer" — produces prose, documentation, reports, or copy
- "summarizer" — condenses information into concise summaries
- "web_search" — searches the web for real-time information
- "math_solver" — performs mathematical or numerical computations

Rules:
1. The plan must be thorough yet concise. Respect the max step count.
2. Each step's "dependsOn" array contains zero-based indices of PRECEDING steps that must complete first (across all phases, counting globally). The first step always has dependsOn: [].
3. Steps within a phase may run in parallel (same dependsOn) when there are no dependencies between them.
4. Only use agent types from the list above.
5. Return ONLY valid JSON, no extra commentary.

You MUST return a JSON object with this exact structure:
{
  "phases": [
    {
      "name": "Phase Name",
      "steps": [
        {
          "agent": "research",
          "description": "What this step does",
          "dependsOn": []
        }
      ]
    }
  ]
}`;

  const userPrompt = `Goal: ${goal}
Mode: ${mode}
Max steps: ${maxSteps}

Generate a structured execution plan as JSON. The mode "fast" means fewer steps, "thorough" means maximum detail, and "balanced" is in between. Respect the max steps limit — do not exceed ${maxSteps} total steps across all phases.`;

  const response = await zai.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  const raw = response?.choices?.[0]?.message?.content ?? '';
  const parsed = parsePlanJSON(raw);
  const validated = validateAndSanitizePlan(parsed, maxSteps);
  return validated;
}

/**
 * Extracts JSON from the LLM response, handling optional ```json ... ``` wrapping.
 */
function parsePlanJSON(raw: string): Plan {
  // Try direct JSON parse first
  try {
    const obj = JSON.parse(raw);
    if (obj && Array.isArray(obj.phases)) {
      return obj as Plan;
    }
  } catch {
    // Not direct JSON — try extracting from markdown code fence
  }

  // Try to find ```json ... ``` block
  const fenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch?.[1]) {
    try {
      const obj = JSON.parse(fenceMatch[1].trim());
      if (obj && Array.isArray(obj.phases)) {
        return obj as Plan;
      }
    } catch {
      // Continue to last resort
    }
  }

  // Last resort: find the first { and last } to extract JSON object
  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const extracted = raw.slice(firstBrace, lastBrace + 1);
    const obj = JSON.parse(extracted);
    if (obj && Array.isArray(obj.phases)) {
      return obj as Plan;
    }
  }

  throw new Error('Failed to parse LLM response as a valid plan JSON');
}

/**
 * Validates the plan structure and sanitizes agent names / dependency indices.
 * Falls back to the heuristic if the plan is fundamentally broken.
 */
function validateAndSanitizePlan(plan: Plan, maxSteps: number): Plan {
  if (!plan.phases || !Array.isArray(plan.phases) || plan.phases.length === 0) {
    throw new Error('Plan has no phases');
  }

  let globalStepIndex = 0;
  const totalStepIndices = new Set<number>();

  const sanitizedPhases: PlanPhase[] = plan.phases.map((phase) => {
    const phaseName = typeof phase.name === 'string' ? phase.name : 'Unnamed Phase';

    const steps: PlanStep[] = (Array.isArray(phase.steps) ? phase.steps : [])
      .slice(0, maxSteps) // hard cap per phase
      .map((step: Record<string, unknown>) => {
        // Sanitize agent
        let agent = String(step.agent ?? 'analysis');
        if (!VALID_AGENTS.includes(agent as (typeof VALID_AGENTS)[number])) {
          agent = 'analysis';
        }

        // Sanitize description
        const description =
          typeof step.description === 'string' && step.description.trim().length > 0
            ? step.description.trim()
            : 'Execute task step';

        // Sanitize dependsOn — ensure all values are valid numbers within range
        const rawDeps = Array.isArray(step.dependsOn) ? step.dependsOn : [];
        const dependsOn = rawDeps
          .filter((d): d is number => typeof d === 'number' && d >= 0 && d < globalStepIndex)
          .map((d) => Math.floor(d));

        const idx = globalStepIndex;
        globalStepIndex++;
        totalStepIndices.add(idx);

        return { agent, description, dependsOn };
      });

    return { name: phaseName, steps };
  });

  // Trim to maxSteps
  let trimmedTotal = 0;
  const trimmedPhases: PlanPhase[] = [];
  for (const phase of sanitizedPhases) {
    const remaining = maxSteps - trimmedTotal;
    if (remaining <= 0) break;
    const phaseSteps = phase.steps.slice(0, remaining);
    trimmedPhases.push({ name: phase.name, steps: phaseSteps });
    trimmedTotal += phaseSteps.length;
  }

  return { phases: trimmedPhases.filter((p) => p.steps.length > 0) };
}

// ------------------------------------------------------------------
// Heuristic fallback (original generatePlan logic)
// ------------------------------------------------------------------

/**
 * Generates a structured execution plan using a heuristic breakdown.
 * Used as a fallback when the LLM is unavailable or returns invalid data.
 */
function generateFallbackPlan(
  goal: string,
  mode: string,
  maxSteps: number
): Plan {
  const stepCount =
    mode === 'fast'
      ? Math.min(maxSteps, 3)
      : mode === 'thorough'
        ? maxSteps
        : Math.min(maxSteps, 6);

  const phases: PlanPhase[] = [
    {
      name: 'Research & Analysis',
      steps: [
        {
          agent: 'research',
          description: `Research and gather context for: ${goal}`,
          dependsOn: [],
        },
        {
          agent: 'analysis',
          description: 'Analyze research findings and identify key requirements',
          dependsOn: [0],
        },
      ],
    },
  ];

  if (stepCount >= 4) {
    phases.push({
      name: 'Implementation',
      steps: [
        {
          agent: 'code_assistant',
          description: `Implement core solution for: ${goal}`,
          dependsOn: [1],
        },
        {
          agent: 'code_assistant',
          description: 'Refine and optimize the implementation',
          dependsOn: [2],
        },
      ],
    });
  }

  if (stepCount >= 6) {
    phases.push({
      name: 'Validation & Review',
      steps: [
        {
          agent: 'analysis',
          description: 'Validate the solution against original requirements',
          dependsOn: [3],
        },
        {
          agent: 'summarizer',
          description: 'Generate final summary and documentation',
          dependsOn: [4],
        },
      ],
    });
  }

  // Trim steps if needed
  let total = 0;
  for (const phase of phases) {
    if (total + phase.steps.length > stepCount) {
      const allowed = stepCount - total;
      if (allowed <= 0) {
        phase.steps = [];
      } else {
        phase.steps = phase.steps.slice(0, allowed);
      }
    }
    total += phase.steps.length;
  }

  // Remove empty phases
  return { phases: phases.filter((p) => p.steps.length > 0) };
}
