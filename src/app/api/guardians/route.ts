import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Kontak darurat milik satu perangkat.
 *
 * Tidak ada akun pengguna, jadi kepemilikan ditandai ownerToken dari
 * localStorage - pola yang sama dengan laporan anonim. Tanpa penyaringan itu,
 * nomor telepon orang terdekat akan terbaca oleh siapa pun yang membuka
 * aplikasi.
 */

export async function GET(request: Request) {
  const ownerToken = new URL(request.url).searchParams.get('ownerToken');

  if (!ownerToken) {
    return NextResponse.json({ error: 'ownerToken is required' }, { status: 400 });
  }

  const guardians = await prisma.guardian.findMany({
    where: { ownerToken },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      name: true,
      role: true,
      phone: true,
      isPrimary: true,
      channels: true,
    },
  });

  return NextResponse.json({ guardians });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { ownerToken, name, role, phone, isPrimary, channels } = body;

  if (!ownerToken) {
    return NextResponse.json({ error: 'ownerToken is required' }, { status: 400 });
  }
  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  if (typeof phone !== 'string' || phone.replace(/\D/g, '').length < 8) {
    return NextResponse.json({ error: 'a valid phone number is required' }, { status: 400 });
  }

  const guardian = await prisma.guardian.create({
    data: {
      ownerToken,
      name: name.trim(),
      role: (typeof role === 'string' && role.trim()) || 'Guardian',
      phone: phone.trim(),
      isPrimary: Boolean(isPrimary),
      channels: Array.isArray(channels) && channels.length > 0 ? channels : ['WhatsApp', 'SMS'],
    },
    select: {
      id: true,
      name: true,
      role: true,
      phone: true,
      isPrimary: true,
      channels: true,
    },
  });

  return NextResponse.json(guardian, { status: 201 });
}
