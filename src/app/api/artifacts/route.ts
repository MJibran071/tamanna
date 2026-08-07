import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const VALID_TYPES = ['image', 'document', 'code', 'data', 'audio'];

/** GET /api/artifacts — list artifacts with filtering, pagination */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const taskId = searchParams.get('taskId');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const where: Record<string, unknown> = {};
    if (type && VALID_TYPES.includes(type)) {
      where.type = type;
    }
    if (taskId) {
      where.taskId = taskId;
    }

    const [artifacts, total] = await Promise.all([
      db.artifact.findMany({
        where,
        select: {
          id: true,
          taskId: true,
          type: true,
          mimeType: true,
          url: true,
          title: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: Math.min(Math.max(limit, 1), 100),
        skip: Math.max(offset, 0),
      }),
      db.artifact.count({ where }),
    ]);

    return NextResponse.json({
      artifacts: artifacts.map((a) => ({
        id: a.id,
        taskId: a.taskId,
        type: a.type,
        mimeType: a.mimeType,
        url: a.url,
        title: a.title,
        createdAt: a.createdAt.toISOString(),
      })),
      total,
      limit,
      offset,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** POST /api/artifacts — create a new artifact */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { taskId, type, mimeType, contentBase64, url, title } = body;

    if (!taskId?.trim() || !type?.trim()) {
      return NextResponse.json(
        { error: 'taskId and type are required' },
        { status: 400 }
      );
    }

    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `type must be one of: ${VALID_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    const artifact = await db.artifact.create({
      data: {
        taskId: taskId.trim(),
        type,
        mimeType: mimeType?.trim() || 'application/octet-stream',
        contentBase64: contentBase64 || null,
        url: url || null,
        title: title?.trim() || null,
      },
    });

    return NextResponse.json({
      id: artifact.id,
      taskId: artifact.taskId,
      type: artifact.type,
      mimeType: artifact.mimeType,
      url: artifact.url,
      title: artifact.title,
      createdAt: artifact.createdAt.toISOString(),
    }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
