import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
  normalizeIdentifier,
} from '@/lib/auth';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const identifier = normalizeIdentifier(String(body.identifier ?? ''));
  const password = String(body.password ?? '');
  const wantsAdmin = body.role === 'ADMIN';

  const user = await prisma.user.findUnique({ where: { identifier } });

  // Akun tidak ada dan sandi salah dibalas dengan pesan yang sama, supaya
  // formulir ini tidak bisa dipakai menebak alamat mana yang terdaftar.
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json({ error: 'Incorrect email/phone or password.' }, { status: 401 });
  }

  // Portal yang dipilih harus cocok dengan peran sebenarnya, agar admin tidak
  // tanpa sadar masuk lewat portal pengguna dan sebaliknya.
  if (wantsAdmin && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'This account does not have admin access.' }, { status: 403 });
  }
  if (!wantsAdmin && user.role === 'ADMIN') {
    return NextResponse.json({ error: 'This is an admin account. Use the admin portal.' }, { status: 403 });
  }

  const token = await createSessionToken({ sub: user.id, name: user.name, role: user.role });
  const res = NextResponse.json({ id: user.id, name: user.name, role: user.role });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
