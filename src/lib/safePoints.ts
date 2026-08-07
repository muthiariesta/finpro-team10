/**
 * Safe point: tempat umum yang bisa dituju saat merasa tidak aman -
 * pos polisi, rumah sakit, SPBU, apotek, minimarket.
 *
 * Datanya dari OpenStreetMap (Overpass API), bukan dari model Risk Score.
 * Bedanya penting: Risk Score hanya punya data Chicago, sedangkan OSM
 * mencakup seluruh dunia - termasuk Indonesia. Jadi fitur ini tetap berguna
 * di Jabodetabek meski skor risikonya belum tersedia.
 *
 * Catatan: label di bawah adalah teks yang dilihat pengguna, sehingga
 * ditulis dalam bahasa Inggris mengikuti bahasa antarmuka aplikasi.
 * Komentar kode tetap berbahasa Indonesia untuk tim.
 */

import { Fuel, Hospital, Pill, ShieldCheck, Store, type LucideIcon } from 'lucide-react';

import { evaluateOpening, type OpenState } from './openingHours';
import type { LatLng } from './riskApi';

export type { OpenState };

export type SafePointType =
  | 'police'
  | 'hospital'
  | 'fuel'
  | 'pharmacy'
  | 'convenience';

export interface SafePoint {
  id: string;
  /**
   * true bila tempat ini didaftarkan pengelola SafeHer, bukan diambil dari
   * OpenStreetMap. Perlu dibedakan karena keduanya punya tingkat keandalan
   * berbeda: OSM luas tapi jam bukanya sering usang, sedangkan daftar
   * pengelola sudah diperiksa.
   */
  curated?: boolean;
  /** Nomor yang bisa dihubungi; hanya ada pada tempat kurasi pengelola. */
  phone?: string | null;
  type: SafePointType;
  name: string;
  position: LatLng;
  /** true bila OSM menandai tempat ini buka 24 jam. */
  open24h: boolean;
  /** Tag opening_hours apa adanya; ditafsirkan lewat evaluateOpening(). */
  openingHours?: string | null;
  /** Jarak ke titik acuan dalam meter; diisi setelah pengurutan. */
  distanceM?: number;
}

export const SAFE_POINT_LABELS: Record<SafePointType, string> = {
  police: 'Police Station',
  hospital: 'Hospital',
  fuel: 'Gas Station',
  pharmacy: 'Pharmacy',
  convenience: 'Convenience Store',
};

export const SAFE_POINT_ICONS: Record<SafePointType, LucideIcon> = {
  police: ShieldCheck,
  hospital: Hospital,
  fuel: Fuel,
  pharmacy: Pill,
  convenience: Store,
};

/**
 * Apakah tempat ini buka pada waktu tertentu - biasanya perkiraan waktu
 * tiba, bukan waktu berangkat. Tempat yang buka saat kita berangkat tidak
 * ada gunanya kalau sudah tutup ketika kita sampai di sana.
 *
 * Hasil 'unknown' bukan kegagalan, melainkan jawaban yang sah dan sering
 * terjadi: sebagian besar tempat di OSM tidak mencantumkan jam buka sama
 * sekali. Tempat seperti itu tetap ditampilkan, hanya tanpa janji.
 */
export function openStateAt(point: SafePoint, at: Date): OpenState {
  if (point.open24h) return 'open';
  return evaluateOpening(point.openingHours, at);
}

/** Jarak dua koordinat dalam meter (haversine). */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Memformat jarak agar enak dibaca: 320 m / 1.4 km. */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Mengambil safe point di sekitar sebuah rute.
 * Tidak pernah throw - kegagalan dikembalikan sebagai array kosong, karena
 * safe point bersifat pelengkap dan tidak boleh menggagalkan pencarian rute.
 */
export async function fetchSafePoints(
  path: LatLng[],
  /** ~10 menit jalan kaki. Radius lebih sempit sering tidak menemukan apa pun. */
  radiusM = 800
): Promise<SafePoint[]> {
  if (path.length === 0) return [];

  try {
    const res = await fetch('/api/safe-points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, radiusM }),
    });
    if (!res.ok) return [];

    const data = await res.json();
    return Array.isArray(data.points) ? (data.points as SafePoint[]) : [];
  } catch (err) {
    console.warn('Gagal mengambil safe point:', err);
    return [];
  }
}

/**
 * Mengurutkan safe point berdasarkan jarak ke sebuah titik acuan
 * (biasanya tujuan perjalanan), sekaligus mengisi field distanceM.
 */
export function sortByDistanceTo(points: SafePoint[], ref: LatLng): SafePoint[] {
  return points
    .map((p) => ({ ...p, distanceM: distanceMeters(p.position, ref) }))
    .sort((a, b) => a.distanceM - b.distanceM);
}
