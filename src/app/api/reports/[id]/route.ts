import { del } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Mengubah laporan yang sudah dikirim.
 *
 * Kepemilikan dibuktikan lewat ownerToken yang disimpan di localStorage
 * pelapor, bukan lewat akun. Dengan begitu pelapor tetap bisa memperbaiki
 * laporannya tanpa kami perlu mengetahui identitasnya sama sekali.
 *
 * Bukti (evidenceUrl) sengaja tidak dapat diubah di sini: mengganti berkas
 * menuntut unggah dan penghapusan blob lama, dan itu ranah endpoint upload.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { ownerToken, category, location, timestamp, description } = body;

  if (!ownerToken) {
    return NextResponse.json({ error: 'ownerToken is required' }, { status: 400 });
  }

  const incident = await prisma.incident.findUnique({ where: { id } });

  if (!incident) {
    return NextResponse.json({ error: 'report not found' }, { status: 404 });
  }

  if (incident.ownerToken !== ownerToken) {
    return NextResponse.json({ error: 'not authorized to edit this report' }, { status: 403 });
  }

  const data: {
    category?: string;
    location?: string;
    timestamp?: Date;
    description?: string | null;
  } = {};

  if (typeof category === 'string' && category.trim()) data.category = category;
  if (typeof location === 'string' && location.trim()) data.location = location.trim();
  if (typeof description === 'string') data.description = description.trim() || null;

  if (timestamp) {
    const parsed = new Date(timestamp);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: 'timestamp is invalid' }, { status: 400 });
    }
    data.timestamp = parsed;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'no fields to update' }, { status: 400 });
  }

  const updated = await prisma.incident.update({ where: { id }, data });

  // ownerToken tidak pernah dikembalikan: itu satu-satunya bukti kepemilikan,
  // jadi jangan sampai tersebar lewat respons, log, atau cache perantara.
  const { ownerToken: _omit, ...safe } = updated;
  return NextResponse.json(safe);
}

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
