import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

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

interface StepResult {
  phase: string;
  stepIndex: number;
  agent: string;
  description: string;
  result: string;
  timestamp: string;
}

/**
 * Call the LLM to execute a single plan step.
 * Returns the LLM's text output for this step.
 */
async function executeStepWithLLM(
  goal: string,
  phaseName: string,
  step: PlanStep,
  stepNumber: number,
  totalSteps: number,
  previousResults: StepResult[]
): Promise<string> {
  const zai = await ZAI.create();

  // Build context from previous step results
  const contextBlock =
    previousResults.length > 0
      ? `\n\n--- Previous Step Results ---\n${previousResults
          .map(
            (r, i) =>
              `[Step ${i + 1} - ${r.phase} (${r.agent})]: ${r.result}`
          )
          .join('\n')}\n--- End Previous Results ---\n`
      : '';

  const messages = [
    {
      role: 'system',
      content: `You are an autonomous AI agent executing a multi-step plan to achieve a user's goal. You are currently on step ${stepNumber} of ${totalSteps}.

Your job is to execute the specific step described below and produce a concise, actionable result. Do NOT skip ahead to future steps — focus only on the current step.

Respond with a clear, structured result that can be passed as context to subsequent steps. If your step involves producing code, analysis, or content, include the output directly in your response. Do not add unnecessary preamble — give the result directly.`,
    },
    {
      role: 'user',
      content: `**Goal:** ${goal}\n\n**Current Phase:** ${phaseName}\n**Current Step (${stepNumber}/${totalSteps}):** ${step.description}\n**Assigned Agent:** ${step.agent}${contextBlock}\n\nExecute this step now and return the result.`,
    },
  ];

  const response = await zai.chat.completions.create({
    messages,
  });

  // The SDK returns the completion; extract the text content
  const content =
    response?.choices?.[0]?.message?.content ??
    response?.content ??
    (typeof response === 'string' ? response : JSON.stringify(response));

  return String(content);
}

/**
 * Auto-execute all plan steps sequentially using the LLM.
 * Updates project progress after each step and saves final output.
 */
async function autoExecutePlan(
  projectId: string,
  goal: string,
  plan: Plan,
  startedAt: Date
): Promise<void> {
  const allSteps: Array<{ phase: PlanPhase; step: PlanStep; globalIndex: number }> = [];
  let globalIndex = 0;

  for (const phase of plan.phases) {
    for (const step of phase.steps) {
      allSteps.push({ phase, step, globalIndex });
      globalIndex++;
    }
  }

  const totalSteps = allSteps.length;
  const stepResults: StepResult[] = [];

  try {
    for (const { phase, step, globalIndex: idx } of allSteps) {
      // Check if project is still executing (could have been paused/cancelled externally)
      const current = await db.autonomousProject.findUnique({
        where: { id: projectId },
        select: { status: true },
      });

      if (!current || current.status !== 'executing') {
        return; // Bail out if no longer executing
      }

      // Update progress to show which step is running
      const progressPct =
        Math.round(((idx + 1) / totalSteps) * 1000) / 10;

      await db.autonomousProject.update({
        where: { id: projectId },
        data: {
          currentPhase: idx,
          currentStep: idx + 1,
          progress: progressPct,
        },
      });

      // Call LLM for this step
      const result = await executeStepWithLLM(
        goal,
        phase.name,
        step,
        idx + 1,
        totalSteps,
        stepResults
      );

      // Record the result
      stepResults.push({
        phase: phase.name,
        stepIndex: idx,
        agent: step.agent,
        description: step.description,
        result,
        timestamp: new Date().toISOString(),
      });

      // Save incremental output so the frontend can show progress
      await db.autonomousProject.update({
        where: { id: projectId },
        data: {
          outputJson: JSON.stringify(stepResults),
        },
      });
    }

    // All steps completed successfully
    const completedAt = new Date();
    await db.autonomousProject.update({
      where: { id: projectId },
      data: {
        status: 'completed',
        currentStep: totalSteps,
        progress: 100,
        completedAt,
        durationMs: completedAt.getTime() - startedAt.getTime(),
        outputJson: JSON.stringify(stepResults),
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const failedAt = new Date();

    // Save whatever results we have so far
    await db.autonomousProject.update({
      where: { id: projectId },
      data: {
        status: 'failed',
        error: errorMsg,
        completedAt: failedAt,
        durationMs: failedAt.getTime() - startedAt.getTime(),
        outputJson:
          stepResults.length > 0
            ? JSON.stringify(stepResults)
            : undefined,
      },
    });
  }
}

/** POST /api/autonomous/[id]/execute — start/resume execution */
export async function POST(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const project = await db.autonomousProject.findUnique({ where: { id } });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (!['planning', 'paused'].includes(project.status)) {
      return NextResponse.json(
        { error: 'Can only execute projects in planning or paused status' },
        { status: 400 }
      );
    }

    if (!project.planJson) {
      return NextResponse.json(
        { error: 'No plan found. Generate a plan first.' },
        { status: 400 }
      );
    }

    const startedAt = project.startedAt || new Date();

    // Set status to executing
    const updated = await db.autonomousProject.update({
      where: { id },
      data: {
        status: 'executing',
        startedAt,
      },
    });

    // If autoExecute is enabled, kick off LLM-driven sequential execution in the background
    if (project.autoExecute) {
      // Fire-and-forget: the auto-execution runs asynchronously after the response is sent.
      // We intentionally do NOT await this promise so the client gets an immediate response.
      (async () => {
        try {
          const plan: Plan = JSON.parse(project.planJson!);
          await autoExecutePlan(id, project.goal, plan, startedAt);
        } catch (err: unknown) {
          // Fallback: if auto-execution fails entirely, mark as failed
          const errorMsg =
            err instanceof Error ? err.message : String(err);
          await db.autonomousProject.update({
            where: { id },
            data: {
              status: 'failed',
              error: `Auto-execution failed: ${errorMsg}`,
              completedAt: new Date(),
            },
          });
        }
      })();
    }

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      currentPhase: updated.currentPhase,
      currentStep: updated.currentStep,
      totalSteps: updated.totalSteps,
      progress: updated.progress,
      autoExecute: project.autoExecute,
      message: project.autoExecute
        ? 'Execution started — auto-executing all steps via LLM'
        : 'Execution started',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** PATCH /api/autonomous/[id]/execute — update step progress */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      currentPhase,
      currentStep,
      progress,
      status,
      error,
      outputJson,
    } = body;

    const project = await db.autonomousProject.findUnique({ where: { id } });
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (project.status !== 'executing') {
      return NextResponse.json(
        { error: 'Project is not currently executing' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (currentPhase !== undefined) updateData.currentPhase = currentPhase;
    if (currentStep !== undefined) updateData.currentStep = currentStep;

    // Auto-calculate progress if not provided
    if (progress !== undefined) {
      updateData.progress = Math.min(100, Math.max(0, progress));
    } else if (currentStep !== undefined && project.totalSteps > 0) {
      updateData.progress =
        Math.round((currentStep / project.totalSteps) * 1000) / 10;
    }

    // Handle completion
    if (status === 'completed' || status === 'failed') {
      updateData.status = status;
      updateData.completedAt = new Date();
      if (project.startedAt) {
        updateData.durationMs =
          Date.now() - project.startedAt.getTime();
      }
      if (status === 'failed' && error) updateData.error = error;
      if (status === 'completed' && outputJson)
        updateData.outputJson = outputJson;
    }

    const updated = await db.autonomousProject.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      currentPhase: updated.currentPhase,
      currentStep: updated.currentStep,
      totalSteps: updated.totalSteps,
      progress: updated.progress,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
