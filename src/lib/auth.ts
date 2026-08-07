import { SignJWT, jwtVerify } from 'jose';

/**
 * Sesi berbasis JWT yang disimpan pada cookie httpOnly.
 *
 * Dipilih JWT, bukan sesi di basis data, karena middleware Next.js berjalan
 * di edge runtime yang tidak bisa memanggil Prisma. Dengan token yang bisa
 * diverifikasi sendiri, penjagaan halaman cukup membaca cookie tanpa
 * menyentuh basis data sama sekali.
 */

export const SESSION_COOKIE = 'safeher_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 hari

export type Role = 'USER' | 'ADMIN';

export interface SessionPayload {
  sub: string;
  name: string;
  role: Role;
}

/**
 * Kunci penanda tangan.
 *
 * Sengaja tidak menyediakan nilai bawaan: kunci bawaan yang ter-commit sama
 * saja dengan tanpa kunci, karena siapa pun yang membaca repositori bisa
 * membuat token admin sendiri.
 */
function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      'AUTH_SECRET belum diisi (minimal 16 karakter). ' +
        'Tambahkan ke .env.local, lalu jalankan ulang dev server. ' +
        'Buat nilai acak dengan: openssl rand -base64 32'
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ name: payload.name, role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

/** Mengembalikan null untuk token yang tidak sah atau kedaluwarsa. */
export async function readSessionToken(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      name: String(payload.name ?? ''),
      role: payload.role === 'ADMIN' ? 'ADMIN' : 'USER',
    };
  } catch {
    return null;
  }
}

/** Menyeragamkan surel/nomor telepon agar pencocokan saat masuk konsisten. */
export function normalizeIdentifier(value: string): string {
  return value.trim().toLowerCase();
}
