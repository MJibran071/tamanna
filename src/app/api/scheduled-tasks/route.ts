import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/** GET /api/scheduled-tasks — list all scheduled tasks */
export async function GET() {
  try {
    const tasks = await db.scheduledTask.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(
      tasks.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        prompt: t.prompt,
        scheduleType: t.scheduleType,
        cronExpr: t.cronExpr,
        intervalSec: t.intervalSec,
        runAt: t.runAt?.toISOString() ?? null,
        timezone: t.timezone,
        enabled: t.enabled,
        lastRunAt: t.lastRunAt?.toISOString() ?? null,
        nextRunAt: t.nextRunAt?.toISOString() ?? null,
        runCount: t.runCount,
        lastError: t.lastError,
        createdAt: t.createdAt.toISOString(),
      }))
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** POST /api/scheduled-tasks — create a new scheduled task */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, prompt, scheduleType, cronExpr, intervalSec, runAt, timezone } = body;

    if (!name?.trim() || !prompt?.trim() || !scheduleType) {
      return NextResponse.json(
        { error: 'name, prompt, and scheduleType are required' },
        { status: 400 }
      );
    }

    if (!['cron', 'fixed_rate', 'one_time'].includes(scheduleType)) {
      return NextResponse.json(
        { error: 'scheduleType must be cron, fixed_rate, or one_time' },
        { status: 400 }
      );
    }

    // Calculate nextRunAt
    let nextRunAt: Date | null = null;
    const tz = timezone || 'Asia/Karachi';

    if (scheduleType === 'cron' && cronExpr) {
      // Parse a simple 5-field cron: minute hour day month weekday
      // Calculate the next occurrence
      nextRunAt = computeNextCronRun(cronExpr, tz);
    } else if (scheduleType === 'fixed_rate' && intervalSec) {
      nextRunAt = new Date(Date.now() + intervalSec * 1000);
    } else if (scheduleType === 'one_time' && runAt) {
      nextRunAt = new Date(runAt);
    }

    const task = await db.scheduledTask.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        prompt: prompt.trim(),
        scheduleType,
        cronExpr: cronExpr || null,
        intervalSec: intervalSec || null,
        runAt: runAt ? new Date(runAt) : null,
        timezone: tz,
        nextRunAt,
      },
    });

    return NextResponse.json({
      id: task.id,
      name: task.name,
      description: task.description,
      prompt: task.prompt,
      scheduleType: task.scheduleType,
      cronExpr: task.cronExpr,
      intervalSec: task.intervalSec,
      runAt: task.runAt?.toISOString() ?? null,
      timezone: task.timezone,
      enabled: task.enabled,
      lastRunAt: null,
      nextRunAt: task.nextRunAt?.toISOString() ?? null,
      runCount: task.runCount,
      lastError: null,
      createdAt: task.createdAt.toISOString(),
    }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** Simple cron parser — calculates the next run time from a 5-field cron expression.
 *  Format: minute hour day-of-month month day-of-week
 *  Supports: * (any), specific numbers, comma-separated values
 */
function computeNextCronRun(cronExpr: string, _timezone: string): Date {
  const parts = cronExpr.trim().split(/\s+/);
  if (parts.length < 5) return new Date(Date.now() + 86400000);

  const now = new Date();
  const next = new Date(now);

  // For simplicity, check each minute in the next 24 hours
  // A production system would use a proper cron library
  for (let i = 0; i < 1440; i++) {
    next.setMinutes(next.getMinutes() + 1, 0, 0);

    const min = next.getMinutes();
    const hour = next.getHours();
    const dom = next.getDate();
    const month = next.getMonth() + 1;
    const dow = next.getDay();

    if (matchesField(parts[0], min, 0, 59) &&
        matchesField(parts[1], hour, 0, 23) &&
        matchesField(parts[2], dom, 1, 31) &&
        matchesField(parts[3], month, 1, 12) &&
        matchesField(parts[4], dow, 0, 6)) {
      return next;
    }
  }

  // Fallback: tomorrow same time
  next.setDate(next.getDate() + 1);
  return next;
}

function matchesField(field: string, value: number, min: number, max: number): boolean {
  if (field === '*') return true;
  const vals = field.split(',').map(Number);
  return vals.some((v) => {
    if (isNaN(v)) return false;
    // Handle ranges like 1-5
    if (field.includes('-')) {
      const [lo, hi] = field.split('-').map(Number);
      return value >= lo && value <= hi;
    }
    return v === value;
  });
}
