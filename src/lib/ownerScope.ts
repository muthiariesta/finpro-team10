import { cookies } from 'next/headers';
import { SESSION_COOKIE, readSessionToken } from './auth';

/**
 * Menentukan pemilik sebuah data milik pengguna.
 *
 * Sejak ada akun, kepemilikan sebaiknya mengikuti akun - bukan localStorage.
 * Token di localStorage hilang begitu pengguna berganti peramban, membuka
 * mode penyamaran, atau membersihkan data peramban, dan kontak daruratnya
 * ikut lenyap. Pada aplikasi keselamatan itu kegagalan yang serius: kontak
 * darurat justru harus ada saat keadaan tidak biasa.
 *
 * Token perangkat tetap diterima sebagai cadangan supaya data yang sudah
 * telanjur tersimpan sebelum fitur akun ada tidak menjadi yatim.
 */
export async function resolveOwnerScope(fallbackToken?: string | null): Promise<string | null> {
  const store = await cookies();
  const session = await readSessionToken(store.get(SESSION_COOKIE)?.value);

  if (session) return `user:${session.sub}`;
  return fallbackToken || null;
}
