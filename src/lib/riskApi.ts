/**
 * Client untuk RiskScore API (FastAPI).
 *
 * PENTING - kontrak keselamatan:
 * API mengembalikan risk_score 0.0 + level "Low" ketika lokasi tidak ada di
 * dataset (match_type "no_data"). Model dilatih dengan dataset Chicago, jadi
 * SEMUA koordinat Indonesia mengembalikan no_data.
 *
 * Menampilkan "Low" apa adanya = memberi rasa aman palsu. Karena itu fungsi
 * di file ini TIDAK PERNAH mengembalikan level mentah. Hasilnya berupa
 * discriminated union sehingga pemanggil wajib menangani kasus tanpa data.
 * Lihat PRD Acceptance Criteria #1 (Skenario Edge Case).
 */

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Very High';

/** Bentuk mentah response dari GET /risk-score */
interface RawRiskScoreResponse {
  risk_score: number;
  level: RiskLevel;
  model_version: string;
  last_updated: string | null;
  match_type: 'exact' | 'nearest' | 'no_data';
  distance_km: number | null;
  disclaimer: string;
  request_id: string;
  latency_ms: number;
}

export type RiskResult =
  /** Data keamanan tersedia dan layak ditampilkan sebagai skor. */
  | {
      status: 'ok';
      score: number;
      level: RiskLevel;
      /** true jika skor diambil dari cell tetangga, bukan lokasi persis. */
      approximate: boolean;
      distanceKm: number | null;
      disclaimer: string;
      modelVersion: string;
      /**
       * Asal angka ini. 'model' berarti dari RiskScore API; 'admin' berarti
       * dari penilaian wilayah yang ditetapkan pengelola. Perlu dibedakan
       * supaya pengguna tahu penilaian mana yang berbasis data historis dan
       * mana yang penilaian manusia.
       */
      source: 'model' | 'admin';
      /** Nama wilayah, hanya terisi bila source === 'admin'. */
      areaName?: string;
    }
  /** Lokasi di luar cakupan dataset. JANGAN tampilkan sebagai "aman". */
  | { status: 'no_data'; disclaimer: string }
  /** API tidak bisa dihubungi. JANGAN tampilkan sebagai "aman". */
  | { status: 'error'; message: string };

/**
 * Memanggil route proxy milik aplikasi sendiri, bukan FastAPI langsung.
 * Lihat src/app/api/risk-score/route.ts - di sanalah alamat upstream dibaca.
 * Path relatif berarti tidak ada CORS dan tidak ada URL yang perlu di-inline.
 */
const RISK_ENDPOINT = '/api/risk-score';

/**
 * Render free tier menidurkan service setelah ~15 menit idle. Request pertama
 * setelah tidur butuh ~50 detik untuk bangun, jadi timeout dibuat longgar.
 * Sedikit lebih panjang dari timeout proxy agar pesan error dari server
 * yang lebih spesifik sempat diterima.
 */
const TIMEOUT_MS = 100_000;

/**
 * Menggabungkan tanggal hari ini dengan jam keberangkatan pilihan user
 * menjadi ISO 8601 tanpa timezone - format yang diminta API
 * (contoh: 2026-08-05T21:30:00).
 *
 * Sengaja memakai komponen waktu lokal, bukan toISOString(), supaya
 * "21:30" yang dipilih user tidak bergeser ke UTC dan berakhir jadi siang
 * hari di mata model.
 */
export function toApiDatetime(timeHHmm: string, base: Date = new Date()): string {
  const [hours = 0, minutes = 0] = timeHHmm.split(':').map(Number);
  const dt = new Date(base);
  dt.setHours(hours, minutes, 0, 0);

  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}` +
    `T${pad(dt.getHours())}:${pad(dt.getMinutes())}:00`
  );
}

/**
 * Mengambil risk score untuk satu titik & waktu.
 * Tidak pernah throw - semua kegagalan dipetakan ke status 'error'.
 */
export async function fetchRiskScore(
  lat: number,
  lon: number,
  datetime: string
): Promise<RiskResult> {
  const url =
    `${RISK_ENDPOINT}` +
    `?lat=${lat}&lon=${lon}&datetime=${encodeURIComponent(datetime)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!res.ok) {
      // Proxy mengirim penjelasan yang lebih spesifik di field `error`.
      const detail = await res
        .json()
        .then((b) => b?.error as string | undefined)
        .catch(() => undefined);
      return {
        status: 'error',
        message: detail ?? `Layanan membalas status ${res.status}.`,
      };
    }

    const data: RawRiskScoreResponse = await res.json();

    if (data.match_type === 'no_data') {
      return { status: 'no_data', disclaimer: data.disclaimer };
    }

    return {
      status: 'ok',
      score: data.risk_score,
      level: data.level,
      approximate: data.match_type === 'nearest',
      distanceKm: data.distance_km,
      disclaimer: data.disclaimer,
      modelVersion: data.model_version,
      source: 'model',
    };
  } catch (err) {
    const aborted = err instanceof DOMException && err.name === 'AbortError';
    return {
      status: 'error',
      message: aborted
        ? 'Server membutuhkan waktu terlalu lama untuk merespons.'
        : 'Tidak dapat terhubung ke layanan penilaian risiko.',
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Mengubah skor risiko (0-100) menjadi persentase keamanan. */
export function toSafetyPercentage(score: number): number {
  return Math.max(0, Math.min(100, Math.round(100 - score)));
}

/* -------------------------------------------------------------------------
 * Penilaian risiko sepanjang rute
 *
 * Menilai satu titik tujuan saja tidak cukup: PRD meminta rute yang
 * menghindari segmen sepi, jadi rute perlu dinilai per bagian. Kita ambil
 * beberapa titik sampel di sepanjang geometri rute, nilai masing-masing,
 * lalu ambil kesimpulan berbasis kasus terburuk - bukan rata-rata, karena
 * satu segmen berbahaya tidak menjadi aman hanya karena sisanya aman.
 * ---------------------------------------------------------------------- */

export type LatLng = [number, number];

/* -------------------------------------------------------------------------
 * Penilaian wilayah dari pengelola
 *
 * Model dilatih dengan dataset Chicago, sehingga setiap koordinat Indonesia
 * dijawab "tidak ada data". Tabel wilayah yang diisi pengelola menutup celah
 * itu: bila model tidak punya jawaban untuk sebuah titik, penilaian manusia
 * yang dipakai - dan asalnya selalu disebutkan.
 * ---------------------------------------------------------------------- */

export interface AdminRiskArea {
  id: string;
  areaName: string;
  streetSegment: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'LIMITED';
  lat: number;
  lon: number;
  radiusM: number;
}

/** Skor mewakili titik tengah tiap tingkat, sekadar agar tampilan seragam. */
const AREA_SCORES: Record<string, { score: number; level: RiskLevel }> = {
  LOW: { score: 20, level: 'Low' },
  MEDIUM: { score: 50, level: 'Medium' },
  HIGH: { score: 80, level: 'High' },
};

export async function fetchRiskAreas(): Promise<AdminRiskArea[]> {
  try {
    const res = await fetch('/api/admin/risk-areas');
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.areas) ? data.areas : [];
  } catch {
    return [];
  }
}

/** Jarak dua koordinat dalam meter (haversine). */
function metersBetween(a: LatLng, b: LatLng): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Mencari penilaian pengelola untuk sebuah titik.
 *
 * Bila beberapa wilayah bertumpuk, yang paling berisiko menang - bukan yang
 * terdekat. Satu ruas berbahaya tidak menjadi aman hanya karena kebetulan
 * berada di dalam wilayah lain yang tenang.
 */
function areaFallback(point: LatLng, areas: AdminRiskArea[]): RiskResult | null {
  const matches = areas
    .filter((a) => AREA_SCORES[a.riskLevel] && metersBetween(point, [a.lat, a.lon]) <= a.radiusM)
    .sort((x, y) => AREA_SCORES[y.riskLevel].score - AREA_SCORES[x.riskLevel].score);

  const best = matches[0];
  if (!best) return null;

  const { score, level } = AREA_SCORES[best.riskLevel];
  return {
    status: 'ok',
    score,
    level,
    approximate: true,
    distanceKm: null,
    disclaimer:
      'Penilaian ini ditetapkan pengelola SafeHer untuk wilayah tersebut, ' +
      'bukan hasil model prediksi berbasis data historis.',
    modelVersion: 'admin',
    source: 'admin',
    areaName: best.areaName,
  };
}

export interface RouteRiskSegment {
  position: LatLng;
  result: RiskResult;
}

export interface RouteRisk {
  segments: RouteRiskSegment[];
  /** Kesimpulan seluruh rute, diambil dari segmen paling berisiko. */
  overall: RiskResult;
  /** Jumlah titik sampel yang punya data keamanan. */
  covered: number;
  /** Total titik sampel yang dinilai. */
  total: number;
}

const LEVEL_SEVERITY: Record<RiskLevel, number> = {
  Low: 0,
  Medium: 1,
  High: 2,
  'Very High': 3,
};

/**
 * Memilih titik sampel yang tersebar merata di sepanjang jalur.
 * Titik awal dan akhir selalu ikut, sisanya dibagi rata berdasarkan indeks.
 */
export function sampleAlongPath(path: LatLng[], count: number): LatLng[] {
  if (path.length === 0) return [];
  if (path.length <= count) return [...path];

  const step = (path.length - 1) / (count - 1);
  return Array.from({ length: count }, (_, i) => path[Math.round(i * step)]);
}

/**
 * Menilai risiko beberapa titik di sepanjang rute, satu per satu.
 *
 * Sengaja BERURUTAN, bukan paralel. Mengirim semua titik serentak memicu
 * beberapa lookup DNS bersamaan yang gagal berjamaah di Windows
 * (getaddrinfo ENOTFOUND). Secara berurutan, alamat cukup di-resolve sekali
 * dan koneksinya dipakai ulang.
 *
 * Biaya kecepatannya nyaris nol: setelah server hangat satu titik hanya
 * ~12 ms, jadi enam titik pun masih di bawah satu detik. Yang benar-benar
 * memakan waktu hanyalah membangunkan server pada titik pertama.
 */
export async function fetchRouteRisk(
  path: LatLng[],
  datetime: string,
  sampleCount = 6,
  areas: AdminRiskArea[] = []
): Promise<RouteRisk> {
  const points = sampleAlongPath(path, sampleCount);
  if (points.length === 0) {
    return {
      segments: [],
      overall: { status: 'error', message: 'Rute tidak memiliki titik yang dapat dinilai.' },
      covered: 0,
      total: 0,
    };
  }

  const segments: RouteRiskSegment[] = [];
  for (const position of points) {
    let result = await fetchRiskScore(position[0], position[1], datetime);

    // Model tidak punya jawaban untuk titik ini; coba penilaian pengelola.
    if (result.status === 'no_data') {
      result = areaFallback(position, areas) ?? result;
    }

    segments.push({ position, result });
  }

  const scored = segments
    .map((s) => s.result)
    .filter((r): r is Extract<RiskResult, { status: 'ok' }> => r.status === 'ok');

  let overall: RiskResult;
  if (scored.length > 0) {
    // Kasus terburuk menentukan penilaian rute secara keseluruhan.
    overall = scored.reduce((worst, current) =>
      LEVEL_SEVERITY[current.level] > LEVEL_SEVERITY[worst.level] ||
      (LEVEL_SEVERITY[current.level] === LEVEL_SEVERITY[worst.level] &&
        current.score > worst.score)
        ? current
        : worst
    );
  } else {
    // Tidak ada satu pun titik yang punya data. Laporkan apa adanya:
    // error jika memang gagal terhubung, no_data jika di luar cakupan.
    const anyNoData = segments.find((s) => s.result.status === 'no_data');
    overall = anyNoData
      ? anyNoData.result
      : segments[0]?.result ?? {
          status: 'error',
          message: 'Rute tidak memiliki titik yang dapat dinilai.',
        };
  }

  return {
    segments,
    overall,
    covered: scored.length,
    total: segments.length,
  };
}
