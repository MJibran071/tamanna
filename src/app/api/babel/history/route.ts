import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10), 1), 100);
    const sourceLang = searchParams.get('sourceLang') || undefined;
    const targetLang = searchParams.get('targetLang') || undefined;
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const where: Record<string, unknown> = {};
    if (sourceLang && targetLang) {
      where.sourceLang = sourceLang;
      where.targetLang = targetLang;
    } else if (sourceLang) {
      where.OR = [
        { sourceLang },
        { targetLang: sourceLang },
      ];
    }

    const [logs, total] = await Promise.all([
      db.translationLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          sourceText: true,
          translatedText: true,
          sourceLang: true,
          targetLang: true,
          engineUsed: true,
          mode: true,
          durationMs: true,
          audioSize: true,
          createdAt: true,
        },
      }),
      db.translationLog.count({ where }),
    ]);

    return NextResponse.json({
      logs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + logs.length < total,
      },
    });
  } catch (error) {
    console.error('[Babel] History error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch translation history' },
      { status: 500 },
    );
  }
}