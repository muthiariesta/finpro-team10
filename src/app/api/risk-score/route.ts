import { NextResponse } from 'next/server';

/**
 * Proxy server-side ke RiskScore API (FastAPI).
 *
 * Browser memanggil route ini, bukan FastAPI langsung. Keuntungannya:
 * - CORS tidak pernah jadi masalah (request keluar dari server, bukan browser)
 * - URL upstream dibaca saat request, bukan di-inline saat compile, sehingga
 *   perubahan .env tidak menuntut rebuild dan tidak bisa "basi"
 * - Alamat backend tidak terekspos ke klien
 */

const UPSTREAM = (
  process.env.RISK_API_URL ??
  process.env.NEXT_PUBLIC_RISK_API_URL ??
  'http://localhost:8000'
).replace(/\/$/, '');

/**
 * Render free tier butuh ~50 detik untuk bangun dari tidur, kadang lebih.
 * Batas dibuat longgar agar request pemanasan sempat selesai.
 */
const TIMEOUT_MS = 90_000;

/**
 * Saat instance Render sedang tidur, koneksi pertama ditolak/di-reset dan
 * fetch langsung gagal dalam hitungan detik - bukan menunggu lalu timeout.
 * Percobaan itu sendiri yang membangunkan service, jadi percobaan berikutnya
 * biasanya berhasil. Tanpa retry, pencarian pertama setelah idle selalu gagal.
 */
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 4_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Merangkai rantai `cause` dari error fetch agar penyebab asli terlihat di log. */
function describeCause(err: unknown): string {
  const causes: string[] = [];
  let c: unknown = (err as { cause?: unknown })?.cause;
  for (let i = 0; c && i < 5; i++) {
    const e = c as { code?: string; message?: string; cause?: unknown };
    causes.push(`${e.code ?? ''} ${e.message ?? String(c)}`.trim());
    c = e.cause;
  }
  return causes.join(' <- ');
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const datetime = searchParams.get('datetime');

  if (!lat || !lon || !datetime) {
    return NextResponse.json(
      { error: 'Parameter lat, lon, dan datetime wajib diisi.' },
      { status: 400 }
    );
  }

  const url =
    `${UPSTREAM}/risk-score` +
    `?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}` +
    `&datetime=${encodeURIComponent(datetime)}`;

  let lastErr: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: 'no-store',
      });

      const body = await res.text();

      if (!res.ok) {
        // 502/503 juga muncul saat Render masih membangunkan instance.
        if (res.status >= 502 && attempt < MAX_ATTEMPTS) {
          console.warn(`[risk-score] upstream ${res.status}, mencoba lagi (${attempt}/${MAX_ATTEMPTS})`);
          await sleep(RETRY_DELAY_MS);
          continue;
        }
        console.error(`[risk-score] upstream ${res.status}: ${body.slice(0, 200)}`);
        return NextResponse.json(
          { error: `Layanan penilaian risiko membalas status ${res.status}.` },
          { status: 502 }
        );
      }

      return new NextResponse(body, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      lastErr = err;

      // Timeout sudah berarti menunggu penuh - retry tidak akan menolong.
      if (err instanceof Error && err.name === 'TimeoutError') break;

      if (attempt < MAX_ATTEMPTS) {
        console.warn(
          `[risk-score] percobaan ${attempt}/${MAX_ATTEMPTS} gagal ` +
            `(kemungkinan instance sedang bangun), mencoba lagi...`
        );
        await sleep(RETRY_DELAY_MS);
      }
    }
  }

  // Dicatat di log server supaya penyebab aslinya terlihat saat debug.
  const cause = describeCause(lastErr);
  console.error(
    `[risk-score] gagal menghubungi ${UPSTREAM}: ${String(lastErr)}` +
      (cause ? ` | cause: ${cause}` : '')
  );

  const timedOut = lastErr instanceof Error && lastErr.name === 'TimeoutError';
  return NextResponse.json(
    {
      error: timedOut
        ? 'Server membutuhkan waktu terlalu lama untuk merespons.'
        : 'Tidak dapat terhubung ke layanan penilaian risiko.',
    },
    { status: 504 }
  );
}
