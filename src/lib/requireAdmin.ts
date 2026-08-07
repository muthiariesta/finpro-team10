import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE, readSessionToken, type SessionPayload } from './auth';

/**
 * Penjagaan peran untuk route handler admin.
 *
 * Middleware sudah menjaga halaman, tetapi route API harus memeriksa sendiri:
 * middleware sengaja melewati /api, dan alamat endpoint bisa dipanggil
 * langsung tanpa melalui halaman mana pun.
 */
export async function requireAdmin(): Promise<
  { ok: true; session: SessionPayload } | { ok: false; response: NextResponse }
> {
  const store = await cookies();
  const session = await readSessionToken(store.get(SESSION_COOKIE)?.value);

  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'You need to sign in.' }, { status: 401 }),
    };
  }
  if (session.role !== 'ADMIN') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Admin access required.' }, { status: 403 }),
    };
  }

  return { ok: true, session };
}
