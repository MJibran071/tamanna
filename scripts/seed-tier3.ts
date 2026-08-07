import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Tier 3 demo data...\n');

  // ─── 1. AUTONOMOUS PROJECTS ────────────────────────────────────

  const completedPlan = {
    phases: [
      {
        name: 'Research & Analysis',
        steps: [
          { agent: 'research', description: 'Research latest React 19 features and migration guide', dependsOn: [] },
          { agent: 'analysis', description: 'Analyze breaking changes and new patterns', dependsOn: [0] },
        ],
      },
      {
        name: 'Implementation',
        steps: [
          { agent: 'code_assistant', description: 'Migrate components to React 19 API', dependsOn: [1] },
          { agent: 'code_assistant', description: 'Update hooks and state management', dependsOn: [2] },
        ],
      },
      {
        name: 'Validation',
        steps: [
          { agent: 'analysis', description: 'Run type checks and validate build', dependsOn: [3] },
          { agent: 'summarizer', description: 'Generate migration summary report', dependsOn: [4] },
        ],
      },
    ],
  };

  const completedProject = await db.autonomousProject.create({
    data: {
      title: 'React 19 Migration',
      description: 'Migrate the entire codebase from React 18 to React 19',
      goal: 'Migrate all React components to use React 19 APIs including use() hook, Server Components improvements, and new form actions',
      status: 'completed',
      planJson: JSON.stringify(completedPlan),
      currentPhase: 2,
      currentStep: 5,
      totalSteps: 6,
      progress: 100,
      mode: 'thorough',
      maxSteps: 10,
      autoExecute: true,
      startedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      durationMs: 2 * 60 * 60 * 1000,
      outputJson: JSON.stringify({
        summary: 'Successfully migrated 47 components to React 19',
        filesChanged: 52,
        breakingChanges: 0,
        newFeaturesUsed: ['use() hook', 'Server Actions', 'Form actions'],
      }),
    },
  });
  console.log('  ✅ Created completed project:', completedProject.title);

  const planningProject = await db.autonomousProject.create({
    data: {
      title: 'API Documentation Generator',
      description: 'Auto-generate API docs from codebase',
      goal: 'Analyze all API routes and automatically generate comprehensive OpenAPI documentation with examples and type information',
      status: 'planning',
      mode: 'balanced',
      maxSteps: 8,
    },
  });
  console.log('  ✅ Created planning project:', planningProject.title);

  // ─── 2. USER PATTERNS ─────────────────────────────────────────

  const patterns = [
    {
      patternType: 'frequent_topic',
      key: 'react_development',
      value: 'User frequently asks about React patterns and best practices',
      frequency: 23,
      weight: 3.5,
      confidence: 0.92,
      tags: JSON.stringify(['react', 'frontend', 'development']),
    },
    {
      patternType: 'time_preference',
      key: 'morning_routine',
      value: 'User is most active between 9-11 AM',
      frequency: 45,
      weight: 2.0,
      confidence: 0.88,
      metadata: JSON.stringify({ peakHour: 10, avgSessionLength: 15 }),
      tags: JSON.stringify(['morning', 'high-activity']),
    },
    {
      patternType: 'tool_usage',
      key: 'code_assistant',
      value: 'User frequently uses code assistant for TypeScript tasks',
      frequency: 34,
      weight: 4.0,
      confidence: 0.95,
      tags: JSON.stringify(['code', 'typescript', 'frequent']),
    },
    {
      patternType: 'query_pattern',
      key: 'debug_request',
      value: 'User often pastes error messages for debugging',
      frequency: 18,
      weight: 2.5,
      confidence: 0.78,
      tags: JSON.stringify(['debugging', 'error-resolution']),
    },
    {
      patternType: 'workflow',
      key: 'research_then_code',
      value: 'User typically researches a topic then asks for implementation',
      frequency: 12,
      weight: 3.0,
      confidence: 0.72,
      tags: JSON.stringify(['research', 'implementation', 'two-step']),
    },
  ];

  const createdPatterns = [];
  for (const p of patterns) {
    const pattern = await db.userPattern.create({ data: p });
    createdPatterns.push(pattern);
    console.log(`  ✅ Created pattern: ${p.patternType}/${p.key}`);
  }

  // ─── 3. PROACTIVE SUGGESTIONS ──────────────────────────────────

  const suggestions = [
    {
      title: 'Enable React 19 Deep Dive',
      description: 'Based on your frequent React questions, would you like a comprehensive overview of React 19 features?',
      action: 'ask_question',
      actionData: JSON.stringify({ question: 'Give me a deep dive on React 19 new features' }),
      relevanceScore: 0.92,
      urgencyScore: 0.4,
      triggerPatternId: createdPatterns[0].id,
    },
    {
      title: 'Morning Briefing Mode',
      description: 'You\'re most active in the mornings. Want to set up a daily code review briefing?',
      action: 'enable_plugin',
      actionData: JSON.stringify({ plugin: 'scheduled_tasks', config: { time: '09:00' } }),
      relevanceScore: 0.85,
      urgencyScore: 0.6,
      triggerPatternId: createdPatterns[1].id,
    },
    {
      title: 'Quick Debug Assistant',
      description: 'Since you often debug errors, try using the dedicated debug workflow for faster resolution.',
      action: 'use_tool',
      actionData: JSON.stringify({ tool: 'code_assistant', mode: 'debug' }),
      relevanceScore: 0.78,
      urgencyScore: 0.3,
      triggerPatternId: createdPatterns[3].id,
    },
  ];

  for (const s of suggestions) {
    await db.proactiveSuggestion.create({ data: s });
    console.log(`  ✅ Created suggestion: ${s.title}`);
  }

  // ─── 4. TEAM WORKSPACE ─────────────────────────────────────────

  const workspace = await db.teamWorkspace.create({
    data: {
      name: 'Frontend Squad',
      description: 'Collaborative workspace for frontend development tasks',
      createdBy: 'user_alice',
      accessCode: 'FRNTSQ',
      isPublic: false,
      maxMembers: 8,
      memberCount: 2,
    },
  });
  console.log(`  ✅ Created workspace: ${workspace.name} (${workspace.accessCode})`);

  await db.teamMember.create({
    data: {
      workspaceId: workspace.id,
      userId: 'user_alice',
      displayName: 'Alice',
      role: 'owner',
      avatar: '🟢',
    },
  });

  await db.teamMember.create({
    data: {
      workspaceId: workspace.id,
      userId: 'user_bob',
      displayName: 'Bob',
      role: 'admin',
      avatar: '🔵',
    },
  });
  console.log('  ✅ Added 2 members (Alice, Bob)');

  const demoMessages = [
    { role: 'user', content: 'Let\'s refactor the auth component to use the new pattern', timestamp: new Date(Date.now() - 3600000).toISOString() },
    { role: 'assistant', content: 'I\'ve analyzed the current auth component. Here\'s the refactored version with improved error handling and type safety.', timestamp: new Date(Date.now() - 3500000).toISOString() },
    { role: 'user', content: 'Looks great! Can you also add the refresh token logic?', timestamp: new Date(Date.now() - 3400000).toISOString() },
  ];

  await db.sharedSession.create({
    data: {
      workspaceId: workspace.id,
      title: 'Auth Component Refactor',
      description: 'Refactoring the authentication component with new patterns',
      messagesJson: JSON.stringify(demoMessages),
      artifacts: JSON.stringify([
        { type: 'code', title: 'auth-component.tsx', description: 'Refactored auth component' },
      ]),
      agentConfig: JSON.stringify({ mode: 'balanced', tools: ['code_assistant', 'analysis'] }),
      status: 'active',
      createdBy: 'user_alice',
      updatedBy: 'user_bob',
    },
  });
  console.log('  ✅ Created shared session: Auth Component Refactor');

  console.log('\n🎉 Tier 3 seed complete!');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
