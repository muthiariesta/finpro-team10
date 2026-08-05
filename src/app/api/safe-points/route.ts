import { NextResponse } from 'next/server';

/**
 * Proxy ke Overpass API (OpenStreetMap) untuk mencari safe point di
 * sekitar sebuah rute.
 *
 * Bentuk query di bawah ini hasil pengujian langsung terhadap server
 * Overpass, karena beberapa cara yang tampak wajar justru ditolak:
 *
 * - GET, bukan POST. POST dibalas 406 oleh instance utama.
 * - Bounding box, bukan `around` dengan banyak koordinat. Versi `around`
 *   melewati 60 detik tanpa hasil; bbox selesai dalam hitungan detik.
 * - Filter tag eksak, bukan regex. Regex membuat query jauh lebih mahal.
 * - Beberapa mirror dicoba bergantian, karena instance utama sering
 *   membalas 504 "server too busy".
 *
 * Penyaringan jarak ke rute dilakukan di sini, bukan di Overpass, supaya
 * beban di sisi server publik tetap ringan.
 */

/** Dicoba berurutan sampai ada yang berhasil. */
const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

const TIMEOUT_MS = 25_000;
const MAX_RESULTS = 200;

/** Etiket Overpass: identifikasi diri, jangan menyamar sebagai anonim. */
const USER_AGENT = 'SafeHer/1.0 (SISTECH 2026 student project)';

type LatLng = [number, number];

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/** Jarak dua koordinat dalam meter (haversine). */
function distanceMeters(a: LatLng, b: LatLng): number {
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
 * OSM menuliskan "buka 24 jam" dengan beberapa cara berbeda.
 * Hanya menerima "24/7" akan melewatkan banyak tempat yang sebenarnya buka.
 *
 * Sengaja TIDAK menebak dari merek (mis. menganggap semua Indomaret buka
 * 24 jam): pada aplikasi keselamatan, mengarahkan seseorang ke tempat yang
 * ternyata tutup lebih berbahaya daripada tidak menandainya sama sekali.
 */
function isOpen24h(tags: Record<string, string>): boolean {
  const oh = (tags.opening_hours ?? '').trim().toLowerCase();
  if (!oh) return false;
  return (
    oh === '24/7' ||
    oh.includes('24/7') ||
    /^(mo-su\s+)?00:00-24:00$/.test(oh) ||
    /^(mo-su\s+)?00:00-00:00$/.test(oh)
  );
}

function classify(tags: Record<string, string>): string | null {
  if (tags.amenity === 'police') return 'police';
  if (tags.amenity === 'hospital') return 'hospital';
  if (tags.amenity === 'fuel') return 'fuel';
  if (tags.amenity === 'pharmacy') return 'pharmacy';
  if (tags.shop === 'convenience') return 'convenience';
  return null;
}

/** Titik sampel rute untuk menyaring hasil bbox berdasarkan jarak. */
function pickAnchors(path: LatLng[], count: number): LatLng[] {
  if (path.length <= count) return path;
  const step = (path.length - 1) / (count - 1);
  return Array.from({ length: count }, (_, i) => path[Math.round(i * step)]);
}

export async function POST(request: Request) {
  let path: LatLng[];
  let radiusM: number;

  try {
    const body = await request.json();
    path = body.path;
    radiusM = Math.min(Math.max(Number(body.radiusM) || 400, 50), 2000);
    if (!Array.isArray(path) || path.length === 0) throw new Error('path kosong');
  } catch {
    return NextResponse.json(
      { error: 'Body harus berisi path berupa array [lat, lon].' },
      { status: 400 }
    );
  }

  // Bounding box rute, dilebarkan seukuran radius agar tempat di tepi
  // area pencarian tetap ikut terjaring.
  const lats = path.map((p) => p[0]);
  const lons = path.map((p) => p[1]);
  const padLat = radiusM / 111_000;
  const padLon =
    radiusM / (111_000 * Math.max(0.1, Math.cos((Math.min(...lats) * Math.PI) / 180)));

  const bbox = [
    (Math.min(...lats) - padLat).toFixed(4),
    (Math.min(...lons) - padLon).toFixed(4),
    (Math.max(...lats) + padLat).toFixed(4),
    (Math.max(...lons) + padLon).toFixed(4),
  ].join(',');

  // `nwr` hanya untuk yang sering dipetakan sebagai poligon (RS & pos polisi);
  // sisanya `node` saja agar query tetap ringan.
  const query =
    `[out:json][timeout:20];(` +
    `nwr["amenity"="police"](${bbox});` +
    `nwr["amenity"="hospital"](${bbox});` +
    `node["amenity"="fuel"](${bbox});` +
    `node["amenity"="pharmacy"](${bbox});` +
    `node["shop"="convenience"](${bbox});` +
    `);out center ${MAX_RESULTS};`;

  const anchors = pickAnchors(path, 40);
  let lastProblem = 'tidak ada mirror yang merespons';

  for (const mirror of MIRRORS) {
    try {
      const res = await fetch(`${mirror}?data=${encodeURIComponent(query)}`, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: 'no-store',
      });

      if (!res.ok) {
        lastProblem = `${new URL(mirror).host} membalas ${res.status}`;
        console.warn(`[safe-points] ${lastProblem}, mencoba mirror berikutnya`);
        continue;
      }

      const data = await res.json();
      const elements: OverpassElement[] = data.elements ?? [];

      const points = elements
        .map((el) => {
          const tags = el.tags ?? {};
          const type = classify(tags);
          const lat = el.lat ?? el.center?.lat;
          const lon = el.lon ?? el.center?.lon;
          if (!type || lat === undefined || lon === undefined) return null;

          // bbox berbentuk persegi, sedangkan rute berkelok. Buang tempat
          // yang masuk kotak tapi sebenarnya jauh dari jalur yang dilewati.
          const position: LatLng = [lat, lon];
          const nearest = Math.min(...anchors.map((a) => distanceMeters(a, position)));
          if (nearest > radiusM) return null;

          return {
            id: `${el.type}/${el.id}`,
            type,
            name: tags.name || tags['name:id'] || tags.brand || 'Tanpa nama',
            position,
            open24h: isOpen24h(tags),
          };
        })
        .filter(Boolean);

      console.log(
        `[safe-points] ${new URL(mirror).host}: ${elements.length} elemen -> ${points.length} dalam radius`
      );
      return NextResponse.json({ points });
    } catch (err) {
      const timedOut = err instanceof Error && err.name === 'TimeoutError';
      lastProblem = `${new URL(mirror).host} ${timedOut ? 'timeout' : 'tidak dapat dihubungi'}`;
      console.warn(`[safe-points] ${lastProblem}, mencoba mirror berikutnya`);
    }
  }

  // Safe point bersifat pelengkap: kegagalan dilaporkan sebagai daftar
  // kosong, bukan error, agar pencarian rute tetap berjalan normal.
  console.error(`[safe-points] semua mirror gagal (${lastProblem})`);
  return NextResponse.json({ points: [] });
}
