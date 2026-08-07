import { NextResponse } from 'next/server';

/**
 * Mengambil risk score untuk sebuah petak wilayah, dipakai sebagai sumber
 * heatmap.
 *
 * Pengambilan dilakukan di server, bukan di browser, karena satu heatmap
 * membutuhkan puluhan titik. Dari browser itu berarti puluhan permintaan
 * lintas jaringan; dari sini cukup satu, dan koneksi ke RiskScore API bisa
 * dipakai ulang.
 *
 * Titik diambil BERURUTAN dengan alasan yang sama seperti /api/risk-score:
 * permintaan serentak memicu banyak lookup DNS sekaligus yang gagal
 * berjamaah di Windows. Setelah server hangat satu titik hanya belasan
 * milidetik, jadi berurutan pun tetap cepat.
 */

const BASE_URL = (
  process.env.NEXT_PUBLIC_RISK_API_URL ?? 'http://localhost:8000'
).replace(/\/$/, '');

const TIMEOUT_MS = 90_000;
/** Batas atas jumlah titik agar satu permintaan tidak berkepanjangan. */
const MAX_STEPS = 10;

interface GridPoint {
  lat: number;
  lon: number;
  score: number;
}

export async function POST(request: Request) {
  let south: number, west: number, north: number, east: number;
  let datetime: string;
  let steps: number;

  try {
    const body = await request.json();
    [south, west, north, east] = body.bounds;
    datetime = body.datetime;
    steps = Math.min(Math.max(Number(body.steps) || 8, 2), MAX_STEPS);
    if (![south, west, north, east].every(Number.isFinite) || !datetime) {
      throw new Error('parameter tidak lengkap');
    }
  } catch {
    return NextResponse.json(
      { error: 'Body harus berisi bounds [south, west, north, east] dan datetime.' },
      { status: 400 }
    );
  }

  // Titik diambil di tengah tiap sel, bukan di sudutnya, supaya nilai yang
  // dihasilkan mewakili isi sel dan tepi petak tidak ikut terwarnai.
  const latStep = (north - south) / steps;
  const lonStep = (east - west) / steps;

  const points: GridPoint[] = [];
  let noData = 0;
  let failed = 0;

  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < steps; j++) {
      const lat = south + latStep * (i + 0.5);
      const lon = west + lonStep * (j + 0.5);

      try {
        const res = await fetch(
          `${BASE_URL}/risk-score?lat=${lat.toFixed(5)}&lon=${lon.toFixed(5)}` +
            `&datetime=${encodeURIComponent(datetime)}`,
          { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(TIMEOUT_MS) }
        );
        if (!res.ok) {
          failed++;
          continue;
        }

        const data = await res.json();
        if (data.match_type === 'no_data') {
          noData++;
          continue;
        }
        points.push({ lat, lon, score: data.risk_score });
      } catch {
        failed++;
      }
    }
  }

  const total = steps * steps;
  console.log(
    `[risk-grid] ${points.length}/${total} titik berskor (no_data: ${noData}, gagal: ${failed})`
  );

  return NextResponse.json({ points, total, noData, failed });
}
