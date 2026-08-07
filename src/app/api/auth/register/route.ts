import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
  normalizeIdentifier,
} from '@/lib/auth';

/** Pendaftaran selalu menghasilkan peran USER. Peran ADMIN hanya bisa
 *  diberikan lewat seed atau langsung di basis data - kalau tidak, siapa pun
 *  bisa mengangkat dirinya menjadi admin lewat formulir pendaftaran. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const name = String(body.name ?? '').trim();
  const identifier = normalizeIdentifier(String(body.identifier ?? ''));
  const password = String(body.password ?? '');

  if (!name || !identifier || !password) {
    return NextResponse.json({ error: 'Name, email or phone, and password are required.' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { identifier } });
  if (existing) {
    return NextResponse.json({ error: 'An account with this email or phone already exists.' }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: { name, identifier, passwordHash: await bcrypt.hash(password, 10), role: 'USER' },
  });

  const token = await createSessionToken({ sub: user.id, name: user.name, role: 'USER' });
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
