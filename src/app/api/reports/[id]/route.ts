import { del } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { ownerToken } = body;

  if (!ownerToken) {
    return NextResponse.json({ error: 'ownerToken is required' }, { status: 400 });
  }

  const incident = await prisma.incident.findUnique({ where: { id } });

  if (!incident) {
    return NextResponse.json({ error: 'report not found' }, { status: 404 });
  }

  if (incident.ownerToken !== ownerToken) {
    return NextResponse.json({ error: 'not authorized to delete this report' }, { status: 403 });
  }

  await prisma.incident.delete({ where: { id } });

  if (incident.evidenceUrl) {
    await del(incident.evidenceUrl, { token: process.env.BLOB_READ_WRITE_TOKEN }).catch(() => {});
  }

  return NextResponse.json({ success: true });
}
