import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE, readSessionToken } from '@/lib/auth';

export async function GET() {
  const store = await cookies();
  const session = await readSessionToken(store.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user: { id: session.sub, name: session.name, role: session.role } });
}
