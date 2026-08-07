import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/** GET /api/artifacts/[id] — get full artifact with contentBase64, or download */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const download = searchParams.get('download') === 'true';

    const artifact = await db.artifact.findUnique({ where: { id } });
    if (!artifact) {
      return NextResponse.json({ error: 'Artifact not found' }, { status: 404 });
    }

    // Download mode: return raw content as file
    if (download && artifact.contentBase64) {
      const buffer = Buffer.from(artifact.contentBase64, 'base64');
      const fileName = (artifact.title || 'artifact')
        .replace(/[^a-zA-Z0-9._-]/g, '_');

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': artifact.mimeType || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'Content-Length': buffer.length.toString(),
        },
      });
    }

    // Normal mode: return JSON with full data
    return NextResponse.json({
      id: artifact.id,
      taskId: artifact.taskId,
      type: artifact.type,
      mimeType: artifact.mimeType,
      contentBase64: artifact.contentBase64,
      url: artifact.url,
      title: artifact.title,
      createdAt: artifact.createdAt.toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** DELETE /api/artifacts/[id] — delete an artifact */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.artifact.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // Prisma throws P2025 for record not found
    if (msg.includes('P2025') || msg.includes('Record to delete not found')) {
      return NextResponse.json({ error: 'Artifact not found' }, { status: 404 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
