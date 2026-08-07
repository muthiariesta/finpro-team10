import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, readSessionToken } from '@/lib/auth';
import AdminShell from '@/components/admin/AdminShell';

/**
 * Kerangka area admin.
 *
 * Peran diperiksa lagi di sini meski middleware sudah menjaganya. Middleware
 * hanya membaca tanda tangan cookie; pemeriksaan kedua ini memastikan tidak
 * ada halaman admin yang ter-render kalau sesinya ternyata tidak sah.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  const session = await readSessionToken(store.get(SESSION_COOKIE)?.value);

  if (!session) redirect('/login');
  if (session.role !== 'ADMIN') redirect('/');

  return <AdminShell name={session.name}>{children}</AdminShell>;
}
