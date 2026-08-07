import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Laporan milik perangkat pemanggil, apa pun statusnya.
 *
 * Dibuat terpisah dari daftar publik dengan sengaja. Daftar publik hanya
 * memuat laporan yang sudah diverifikasi, supaya tuduhan yang belum
 * diperiksa siapa pun tidak ikut membentuk persepsi tentang suatu wilayah.
 * Tetapi pelapor sendiri tetap harus bisa memantau laporannya - itu keluhan
 * terbesar pada riset pengguna: laporan terasa hilang setelah dikirim.
 *
 * Token dikirim lewat body POST, bukan query string, agar tidak tercatat di
 * log server maupun riwayat peramban.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const tokens: string[] = Array.isArray(body.tokens)
    ? body.tokens.filter((t: unknown) => typeof t === 'string' && t.length > 0).slice(0, 200)
    : [];

  if (tokens.length === 0) return NextResponse.json({ reports: [] });

  const reports = await prisma.incident.findMany({
    where: { ownerToken: { in: tokens } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      category: true,
      location: true,
      timestamp: true,
      createdAt: true,
      description: true,
      evidenceUrl: true,
      evidenceUrls: true,
      status: true,
      adminNote: true,
    },
  });

  return NextResponse.json({ reports });
}
