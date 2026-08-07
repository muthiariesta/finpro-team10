import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, readSessionToken } from '@/lib/auth';

/**
 * Penjaga rute.
 *
 * Next.js 16 mengganti konvensi "middleware" menjadi "proxy"; berkas dan
 * nama fungsinya mengikuti nama baru itu, perilakunya sama persis.
 *
 * Berjalan di edge runtime, jadi keabsahan sesi diperiksa lewat tanda tangan
 * JWT tanpa memanggil basis data sama sekali.
 *
 * Halaman yang boleh diakses tanpa masuk sengaja dibuat sesempit mungkin:
 * seluruh isi aplikasi ini menyangkut lokasi, kontak terdekat, dan laporan
 * insiden seseorang.
 */

const PUBLIC_PAGES = ['/login', '/register'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  const isPublic = PUBLIC_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // Sudah masuk tapi membuka halaman login: antarkan ke tujuan yang benar
  // menurut perannya, jangan biarkan mengisi formulir untuk kedua kalinya.
  if (isPublic && session) {
    return NextResponse.redirect(new URL(session.role === 'ADMIN' ? '/report' : '/', request.url));
  }

  if (isPublic) return NextResponse.next();

  if (!session) {
    const url = new URL('/login', request.url);
    // Tujuan semula disimpan agar setelah masuk pengguna kembali ke sana,
    // bukan selalu terlempar ke beranda.
    if (pathname !== '/') url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Area admin hanya untuk peran ADMIN. Tanpa penjagaan ini, alamatnya cukup
  // diketik langsung untuk membaca seluruh laporan insiden.
  if (pathname.startsWith('/admin') && session.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  /**
   * Aset statis, berkas gambar, dan seluruh /api dilewati.
   *
   * /api sengaja tidak dijaga di sini karena tiap route sudah memeriksa
   * kepemilikannya sendiri, dan /api/auth/* justru harus bisa diakses
   * sebelum sesi ada.
   */
  matcher: [
    // Berkas statis harus dikecualikan secara eksplisit. Tanpa itu penjaga
    // ini juga mencegat skrip dan gambar, lalu mengalihkannya ke /login -
    // peramban menerima halaman HTML alih-alih berkas yang diminta, dan
    // kegagalannya sulit dilacak karena tidak ada pesan error yang jelas.
    '/((?!api|_next/static|_next/image|favicon.ico|assets|vendor|.*\\.(?:js|css|png|jpg|jpeg|gif|svg|webp|ico|woff2?)$).*)',
  ],
};
