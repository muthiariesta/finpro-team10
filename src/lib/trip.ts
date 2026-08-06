import type { LatLng, RouteRiskSegment } from './riskApi';
import type { SafePoint } from './safePoints';

/**
 * Sesi perjalanan In-Trip Protection.
 *
 * Rute hasil pencarian dioper dari halaman Safe Route lewat sessionStorage,
 * bukan query string: geometri jalan bisa ratusan titik dan tidak muat di URL.
 * sessionStorage juga otomatis bersih saat tab ditutup, sejalan dengan prinsip
 * PRD bahwa berbagi lokasi hanya berlaku selama sesi perjalanan.
 */

export const TRIP_STORAGE_KEY = 'safeher-trip';

export interface TripPlan {
  originLabel: string;
  destinationLabel: string;
  originCoords: LatLng;
  destCoords: LatLng;
  /** Geometri jalan dari OSRM. */
  routePath: LatLng[];
  /** Estimasi waktu tempuh dalam menit. */
  durationMin: number;
  distanceKm: string;
  /** Hasil penilaian risiko per segmen, bila tersedia. */
  riskSegments: RouteRiskSegment[];
  safePoints: SafePoint[];
}

export function saveTripPlan(plan: TripPlan) {
  try {
    sessionStorage.setItem(TRIP_STORAGE_KEY, JSON.stringify(plan));
  } catch (err) {
    console.warn('Gagal menyimpan rencana perjalanan:', err);
  }
}

export function loadTripPlan(): TripPlan | null {
  try {
    const raw = sessionStorage.getItem(TRIP_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TripPlan) : null;
  } catch {
    return null;
  }
}

export function clearTripPlan() {
  try {
    sessionStorage.removeItem(TRIP_STORAGE_KEY);
  } catch {
    // Diabaikan: gagal membersihkan tidak boleh menggagalkan penutupan sesi.
  }
}

/* ------------------------------------------------------------------ */

/** Jarak dua koordinat dalam meter (haversine). */
export function distanceMeters(a: LatLng, b: LatLng): number {
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
 * Menentukan titik pada jalur sesuai porsi perjalanan yang sudah ditempuh.
 *
 * Dipakai untuk menggerakkan penanda ketika GPS tidak tersedia, misalnya saat
 * demo di komputer atau ketika izin lokasi ditolak. Perhitungannya memakai
 * jarak kumulatif, bukan indeks titik, supaya lajunya tetap wajar pada ruas
 * panjang maupun pendek.
 */
export function pointAlongPath(path: LatLng[], fraction: number): LatLng {
  if (path.length === 0) return [0, 0];
  if (path.length === 1) return path[0];

  const clamped = Math.max(0, Math.min(1, fraction));

  const segments: number[] = [];
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const d = distanceMeters(path[i - 1], path[i]);
    segments.push(d);
    total += d;
  }
  if (total === 0) return path[0];

  let target = total * clamped;
  for (let i = 0; i < segments.length; i++) {
    if (target <= segments[i]) {
      const t = segments[i] === 0 ? 0 : target / segments[i];
      const [lat1, lon1] = path[i];
      const [lat2, lon2] = path[i + 1];
      return [lat1 + (lat2 - lat1) * t, lon1 + (lon2 - lon1) * t];
    }
    target -= segments[i];
  }
  return path[path.length - 1];
}

/** Memformat sisa waktu menjadi teks pendek: "7 mins remaining". */
export function formatRemaining(seconds: number): string {
  if (seconds <= 0) return 'ETA passed';
  const mins = Math.ceil(seconds / 60);
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} remaining`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m remaining`;
}
