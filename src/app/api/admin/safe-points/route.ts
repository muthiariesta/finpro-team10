import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/requireAdmin';

const TYPES = new Set(['MEDICAL', 'POLICE', 'COMMERCIAL']);

/**
 * Daftar safe point kurasi admin.
 *
 * Sengaja dapat dibaca tanpa masuk sebagai admin: peta pengguna juga
 * memerlukannya, dan isinya memang tempat umum - bukan data pribadi.
 */
export async function GET() {
  const points = await prisma.safePointEntry.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ points });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const name = String(body.name ?? '').trim();
  const type = String(body.type ?? '');
  const location = String(body.location ?? '').trim();
  const phone = String(body.phone ?? '').trim() || null;

  if (!name || !location || !TYPES.has(type)) {
    return NextResponse.json(
      { error: 'name, location, and a valid type are required.' },
      { status: 400 }
    );
  }

  // Koordinat opsional: tanpa itu tempatnya tetap tercatat, hanya tidak
  // muncul di peta. Lebih baik tercatat daripada ditolak karena admin
  // belum sempat mencari titik pastinya.
  const lat = Number.isFinite(Number(body.lat)) && body.lat !== '' ? Number(body.lat) : null;
  const lon = Number.isFinite(Number(body.lon)) && body.lon !== '' ? Number(body.lon) : null;

  const point = await prisma.safePointEntry.create({
    data: { name, type: type as 'MEDICAL' | 'POLICE' | 'COMMERCIAL', location, phone, lat, lon },
  });

  return NextResponse.json(point, { status: 201 });
}
