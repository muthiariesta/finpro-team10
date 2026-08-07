import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/requireAdmin';

const LEVELS = new Set(['LOW', 'MEDIUM', 'HIGH', 'LIMITED']);

/**
 * Penilaian risiko wilayah oleh admin.
 *
 * Dapat dibaca tanpa masuk karena pencarian rute pengguna memerlukannya
 * untuk mengisi wilayah yang tidak dicakup model.
 */
export async function GET() {
  const areas = await prisma.riskArea.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ areas });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const areaName = String(body.areaName ?? '').trim();
  const streetSegment = String(body.streetSegment ?? '').trim();
  const crowdDensity = String(body.crowdDensity ?? '').trim() || 'Unknown';
  const riskLevel = String(body.riskLevel ?? 'LIMITED');
  const lat = Number(body.lat);
  const lon = Number(body.lon);
  const radiusM = Number(body.radiusM) || 500;

  if (!areaName || !streetSegment || !LEVELS.has(riskLevel)) {
    return NextResponse.json(
      { error: 'areaName, streetSegment, and a valid riskLevel are required.' },
      { status: 400 }
    );
  }

  // Koordinat wajib di sini, tidak seperti safe point: penilaian wilayah
  // tanpa titik acuan tidak bisa dipakai menilai rute mana pun.
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json(
      { error: 'lat and lon are required so the area can be matched to a route.' },
      { status: 400 }
    );
  }

  const area = await prisma.riskArea.create({
    data: {
      areaName,
      streetSegment,
      crowdDensity,
      riskLevel: riskLevel as 'LOW' | 'MEDIUM' | 'HIGH' | 'LIMITED',
      lat,
      lon,
      radiusM: Math.min(Math.max(radiusM, 100), 5000),
    },
  });

  return NextResponse.json(area, { status: 201 });
}
