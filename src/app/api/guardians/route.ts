import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveOwnerScope } from '@/lib/ownerScope';

/**
 * Kontak darurat milik seorang pengguna.
 *
 * Kepemilikan mengikuti akun bila pengguna sudah masuk, dan jatuh ke token
 * perangkat bila belum. Sebelumnya hanya token perangkat yang dipakai, dan
 * kontaknya lenyap begitu peramban berganti - kegagalan serius pada aplikasi
 * keselamatan, karena kontak darurat justru dibutuhkan di situasi tak biasa.
 */

export async function GET(request: Request) {
  const fallback = new URL(request.url).searchParams.get('ownerToken');
  const scope = await resolveOwnerScope(fallback);

  if (!scope) {
    return NextResponse.json({ error: 'ownerToken is required' }, { status: 400 });
  }

  // Data lama tersimpan dengan token perangkat, data baru dengan penanda
  // akun. Keduanya dibaca agar kontak yang sudah ada tidak hilang setelah
  // pengguna mulai memakai akun.
  const owners = fallback && fallback !== scope ? [scope, fallback] : [scope];

  const guardians = await prisma.guardian.findMany({
    where: { ownerToken: { in: owners } },
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
  const { name, role, phone, isPrimary, channels } = body;
  const ownerToken = await resolveOwnerScope(body.ownerToken);

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
