import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/requireAdmin';

const LEVELS = new Set(['LOW', 'MEDIUM', 'HIGH', 'LIMITED']);

/** Mengubah tingkat risiko sebuah wilayah. Perubahan langsung dipakai
 *  pencarian rute berikutnya. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const riskLevel = String(body.riskLevel ?? '');

  if (!LEVELS.has(riskLevel)) {
    return NextResponse.json(
      { error: 'riskLevel must be LOW, MEDIUM, HIGH, or LIMITED.' },
      { status: 400 }
    );
  }

  const existing = await prisma.riskArea.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'risk area not found' }, { status: 404 });
  }

  const updated = await prisma.riskArea.update({
    where: { id },
    data: { riskLevel: riskLevel as 'LOW' | 'MEDIUM' | 'HIGH' | 'LIMITED' },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const existing = await prisma.riskArea.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'risk area not found' }, { status: 404 });
  }

  await prisma.riskArea.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
