import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/requireAdmin';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const existing = await prisma.safePointEntry.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'safe point not found' }, { status: 404 });
  }

  await prisma.safePointEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
