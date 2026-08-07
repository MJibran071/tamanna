import { db } from '../src/lib/db';

async function seed() {
  // Create a conversation for the demo artifacts
  const conversation = await db.conversation.create({
    data: { title: 'Demo Artifacts' },
  });

  // Create a task to attach artifacts to
  const task = await db.task.create({
    data: {
      conversationId: conversation.id,
      agentType: 'image_gen',
      status: 'completed',
      stepIndex: 0,
    },
  });

  const codeContent = `interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: Date;
}

async function fetchUser(id: string): Promise<UserProfile> {
  const response = await fetch('/api/users/' + id);
  if (!response.ok) {
    throw new Error('Failed to fetch user');
  }
  return response.json();
}

// Usage
const user = await fetchUser('abc123');
console.log('Hello, ' + user.name);`;

  const codeBase64 = Buffer.from(codeContent).toString('base64');

  const docContent = `Tamanna AI Voice Assistant — Project Overview

Tamanna is a next-generation AI voice assistant built with Next.js 16,
Tailwind CSS 4, and the Lumina design system. It features real-time
voice interaction, multi-agent orchestration, and a beautiful
glassmorphic UI.

Key Features:
- Voice input/output with real-time transcription
- Multi-agent system (11 specialized AI agents)
- DAG-based memory system
- Plugin architecture for extensibility
- File workspace for browsing generated artifacts
- Cross-platform support (web, PWA, mobile)`;

  const docBase64 = Buffer.from(docContent).toString('base64');

  const jsonData = [
    { name: "React", category: "Frontend", popularity: 92, year: 2013 },
    { name: "Vue", category: "Frontend", popularity: 78, year: 2014 },
    { name: "Angular", category: "Frontend", popularity: 65, year: 2016 },
    { name: "Svelte", category: "Frontend", popularity: 45, year: 2016 },
    { name: "Next.js", category: "Framework", popularity: 88, year: 2016 },
    { name: "Nuxt", category: "Framework", popularity: 55, year: 2016 },
    { name: "Express", category: "Backend", popularity: 82, year: 2010 },
    { name: "Fastify", category: "Backend", popularity: 58, year: 2016 },
    { name: "Prisma", category: "ORM", popularity: 72, year: 2019 },
    { name: "Drishti", category: "ORM", popularity: 60, year: 2020 },
  ];

  const dataBase64 = Buffer.from(JSON.stringify(jsonData, null, 2)).toString('base64');

  const audioContent = Buffer.from('Sample audio data placeholder').toString('base64');

  // Create artifacts
  await db.artifact.createMany({
    data: [
      {
        taskId: task.id,
        type: 'image',
        mimeType: 'image/jpeg',
        url: 'https://picsum.photos/seed/tamanna1/800/600',
        title: 'Mountain Landscape',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
      {
        taskId: task.id,
        type: 'image',
        mimeType: 'image/jpeg',
        url: 'https://picsum.photos/seed/tamanna2/800/600',
        title: 'Ocean Sunset',
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      },
      {
        taskId: task.id,
        type: 'code',
        mimeType: 'text/typescript',
        contentBase64: codeBase64,
        title: 'User Profile API',
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      },
      {
        taskId: task.id,
        type: 'document',
        mimeType: 'text/plain',
        contentBase64: docBase64,
        title: 'Project Overview',
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      },
      {
        taskId: task.id,
        type: 'data',
        mimeType: 'application/json',
        contentBase64: dataBase64,
        title: 'Frontend Framework Popularity',
        createdAt: new Date(Date.now() - 30 * 60 * 1000),
      },
      {
        taskId: task.id,
        type: 'audio',
        mimeType: 'audio/wav',
        contentBase64: audioContent,
        title: 'Voice Response Sample',
        createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
      },
    ],
  });

  console.log('Seeded 6 demo artifacts successfully');
  console.log('Task ID:', task.id);
  console.log('Conversation ID:', conversation.id);
}

seed()
  .catch(console.error)
  .finally(() => db.$disconnect());
