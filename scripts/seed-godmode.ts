import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding God Mode data...');

  // ── 1. Service Connections ──────────────────────────────────────
  console.log('  → Seeding service connections...');

  const services = [
    {
      serviceType: 'whatsapp',
      displayName: 'WhatsApp',
      status: 'disconnected',
      capabilities: '["send_message", "read_messages", "send_file"]',
    },
    {
      serviceType: 'telegram',
      displayName: 'Telegram',
      status: 'disconnected',
      capabilities: '["send_message", "read_messages", "send_file"]',
    },
    {
      serviceType: 'email',
      displayName: 'Email (Gmail)',
      status: 'connected',
      capabilities: '["send_message", "read_messages", "send_file"]',
      config: JSON.stringify({ provider: 'gmail', address: 'tamanna@example.com' }),
    },
    {
      serviceType: 'discord',
      displayName: 'Discord',
      status: 'disconnected',
      capabilities: '["send_message", "read_messages"]',
    },
  ];

  for (const s of services) {
    await db.serviceConnection.upsert({
      where: { serviceType: s.serviceType },
      update: { displayName: s.displayName, status: s.status, capabilities: s.capabilities },
      create: s,
    });
  }
  console.log(`    ✅ ${services.length} service connections seeded`);

  // ── 2. Workflows ────────────────────────────────────────────────
  console.log('  → Seeding workflows...');

  const workflows = [
    {
      name: 'Morning Briefing',
      description: 'Daily morning briefing with weather, news summary, and upcoming reminders.',
      trigger: 'schedule',
      triggerConfig: JSON.stringify({ cron: '0 8 * * *', timezone: 'Asia/Karachi' }),
      stepsJson: JSON.stringify([
        { step: 1, action: 'web_search', label: 'Get weather forecast', config: { query: 'weather today Karachi Pakistan' } },
        { step: 2, action: 'web_search', label: 'Get top news', config: { query: 'top news today world' } },
        { step: 3, action: 'read_reminders', label: 'Check today\'s reminders', config: {} },
        { step: 4, action: 'summarize', label: 'Generate briefing', config: {} },
      ]),
      status: 'active',
      enabled: true,
    },
    {
      name: 'Web Research Pipeline',
      description: 'Deep web research on a topic: search, read top results, and generate a comprehensive summary.',
      trigger: 'manual',
      triggerConfig: null,
      stepsJson: JSON.stringify([
        { step: 1, action: 'web_search', label: 'Initial search', config: { num: 10 } },
        { step: 2, action: 'web_browse', label: 'Read top 3 results', config: { maxPages: 3 } },
        { step: 3, action: 'summarize', label: 'Synthesize findings', config: {} },
      ]),
      status: 'draft',
      enabled: false,
    },
  ];

  for (const w of workflows) {
    // Check if a workflow with same name already exists
    const existing = await db.workflow.findFirst({ where: { name: w.name } });
    if (!existing) {
      await db.workflow.create({ data: w });
    }
  }
  console.log(`    ✅ ${workflows.length} workflows seeded`);

  // ── 3. Quick Actions ────────────────────────────────────────────
  console.log('  → Seeding quick actions...');

  const quickActions = [
    {
      title: 'Search Web',
      prompt: 'Search the web for: ',
      icon: 'Search',
      color: '#10b981',
      sortOrder: 0,
    },
    {
      title: 'Compare Prices',
      prompt: 'Compare prices for: ',
      icon: 'BarChart3',
      color: '#f59e0b',
      sortOrder: 1,
    },
    {
      title: 'Set Reminder',
      prompt: 'Set a reminder: ',
      icon: 'Bell',
      color: '#ef4444',
      sortOrder: 2,
    },
    {
      title: 'Read Article',
      prompt: 'Read and summarize this article: ',
      icon: 'FileText',
      color: '#8b5cf6',
      sortOrder: 3,
    },
    {
      title: 'Summarize Page',
      prompt: 'Summarize this webpage: ',
      icon: 'BookOpen',
      color: '#06b6d4',
      sortOrder: 4,
    },
  ];

  for (const qa of quickActions) {
    const existing = await db.quickAction.findFirst({ where: { title: qa.title } });
    if (!existing) {
      await db.quickAction.create({ data: qa });
    }
  }
  console.log(`    ✅ ${quickActions.length} quick actions seeded`);

  // ── 4. Reminders ────────────────────────────────────────────────
  console.log('  → Seeding reminders...');

  const now = new Date();
  const reminders = [
    {
      title: 'Team standup meeting',
      description: 'Daily standup with the engineering team',
      scheduledFor: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2 hours from now
      category: 'meeting' as const,
      priority: 'high' as const,
      sourceMessage: 'Remind me about the team standup in 2 hours',
    },
    {
      title: 'Project deadline — Q4 report',
      description: 'Submit the Q4 quarterly report to management',
      scheduledFor: new Date(now.getTime() + 48 * 60 * 60 * 1000), // 2 days
      category: 'task' as const,
      priority: 'urgent' as const,
      sourceMessage: 'The Q4 report is due in 2 days',
    },
    {
      title: 'Health checkup appointment',
      description: 'Annual health checkup at City Hospital',
      scheduledFor: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days
      category: 'health' as const,
      priority: 'medium' as const,
      sourceMessage: 'My health checkup is next week on Wednesday',
    },
  ];

  for (const r of reminders) {
    await db.reminder.create({ data: r });
  }
  console.log(`    ✅ ${reminders.length} reminders seeded`);

  // ── 5. Action Logs ──────────────────────────────────────────────
  console.log('  → Seeding action logs...');

  const actionLogs = [
    {
      actionType: 'web_search',
      command: 'Search for best budget smartphones 2025',
      intent: 'web_search',
      status: 'completed',
      resultJson: JSON.stringify({
        results: [
          { title: 'Best Budget Smartphones 2025', url: 'https://example.com/phones1', snippet: 'Top picks under $300' },
          { title: 'Budget Phone Comparison', url: 'https://example.com/phones2', snippet: 'Detailed specs and pricing' },
        ],
      }),
      summary: 'Found 8 results for budget smartphones. Top picks include models from Xiaomi, Samsung, and Motorola, all under $300.',
      durationMs: 3200,
      completedAt: new Date(now.getTime() - 3600 * 1000),
      createdAt: new Date(now.getTime() - 3700 * 1000),
    },
    {
      actionType: 'web_search',
      command: 'What is the weather like in Islamabad today?',
      intent: 'web_search',
      status: 'completed',
      resultJson: JSON.stringify({
      results: [
        { title: 'Islamabad Weather', url: 'https://example.com/weather', snippet: 'Sunny, 28°C, low humidity' },
      ],
      }),
      summary: 'Islamabad weather: Sunny skies, 28°C with low humidity. Clear conditions expected throughout the day.',
      durationMs: 2800,
      completedAt: new Date(now.getTime() - 7200 * 1000),
      createdAt: new Date(now.getTime() - 7300 * 1000),
    },
    {
      actionType: 'web_browse',
      command: 'Read this article: https://example.com/ai-trends-2025',
      intent: 'web_browse',
      status: 'completed',
      sourceUrl: 'https://example.com/ai-trends-2025',
      resultJson: JSON.stringify({
        title: 'AI Trends 2025: What to Expect',
        content: 'The article discusses emerging AI trends including multimodal AI, autonomous agents, and small language models...',
        summary: 'Article covers top AI trends for 2025: multimodal AI becoming mainstream, autonomous agents for complex tasks, and the rise of efficient small language models.',
      }),
      summary: 'Read and summarized an article about AI trends in 2025. Key themes: multimodal AI, autonomous agents, and small language models.',
      durationMs: 5100,
      completedAt: new Date(now.getTime() - 10800 * 1000),
      createdAt: new Date(now.getTime() - 11000 * 1000),
    },
    {
      actionType: 'compare_prices',
      command: 'Compare iPhone 16 vs Samsung Galaxy S25 prices',
      intent: 'compare_prices',
      status: 'completed',
      resultJson: JSON.stringify({
        items: ['iPhone 16', 'Samsung Galaxy S25'],
        summary: 'iPhone 16 starts at $799 while Samsung Galaxy S25 starts at $849. iPhone offers better ecosystem integration while Samsung offers more customization and a larger screen.',
      }),
      summary: 'Compared iPhone 16 ($799) vs Samsung Galaxy S25 ($849). iPhone has better ecosystem; Samsung has more customization and larger display.',
      durationMs: 7500,
      completedAt: new Date(now.getTime() - 14400 * 1000),
      createdAt: new Date(now.getTime() - 14600 * 1000),
    },
    {
      actionType: 'send_message',
      command: 'Send a message to Mom saying I\'ll be home late tonight',
      intent: 'send_message',
      status: 'completed',
      resultJson: JSON.stringify({
        status: 'would_send',
        recipient: 'Mom',
        serviceType: 'whatsapp',
        message: "I'll be home late tonight",
      }),
      summary: 'Would send message to Mom via WhatsApp: "I\'ll be home late tonight" (real messaging integration coming soon)',
      durationMs: 800,
      completedAt: new Date(now.getTime() - 18000 * 1000),
      createdAt: new Date(now.getTime() - 18100 * 1000),
    },
  ];

  for (const log of actionLogs) {
    await db.actionLog.create({ data: log });
  }
  console.log(`    ✅ ${actionLogs.length} action logs seeded`);

  console.log('\n🎉 God Mode seed complete!');
}

seed()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
