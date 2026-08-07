import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/requireAdmin';

/**
 * Keputusan admin atas sebuah laporan.
 *
 * VERIFIED membuat laporan tampil di feed publik; REJECTED menyembunyikannya
 * tanpa menghapus, agar keputusan tetap dapat ditelusuri kembali.
 */
const ALLOWED = new Set(['PENDING', 'VERIFIED', 'REJECTED']);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const status = String(body.status ?? '');

  if (!ALLOWED.has(status)) {
    return NextResponse.json(
      { error: 'status must be PENDING, VERIFIED, or REJECTED.' },
      { status: 400 }
    );
  }

  const existing = await prisma.incident.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'report not found' }, { status: 404 });
  }

  const updated = await prisma.incident.update({
    where: { id },
    data: {
      status: status as 'PENDING' | 'VERIFIED' | 'REJECTED',
      adminNote: typeof body.adminNote === 'string' ? body.adminNote.trim() || null : undefined,
      // Dikosongkan kembali bila laporan dikembalikan ke antrean.
      reviewedAt: status === 'PENDING' ? null : new Date(),
    },
    // ownerToken tidak pernah ikut keluar: token itu satu-satunya bukti
    // kepemilikan laporan anonim.
    select: {
      id: true,
      category: true,
      location: true,
      timestamp: true,
      description: true,
      evidenceUrl: true,
      status: true,
      adminNote: true,
      reviewedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json(updated);
}

/** Menghapus laporan dari feed publik secara permanen. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const existing = await prisma.incident.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'report not found' }, { status: 404 });
  }

  await prisma.incident.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
