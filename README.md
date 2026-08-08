# SafeHer — Frontend

Aplikasi web keselamatan perempuan: merencanakan rute lengkap dengan penilaian
risikonya, menjaga perjalanan tetap terpantau orang terdekat, dan melaporkan
kejadian secara anonim.

Final project SISTECH 2026 · Tim 10 · frontend Next.js.
Layanan machine learning berada di repositori terpisah
([RiskScore-API](https://riskscore-api.onrender.com/docs)).

---

## Tech stack

| Lapisan | Pilihan | Alasan |
|---|---|---|
| Framework | Next.js 16 — App Router, Turbopack | Server Component untuk halaman berbasis data, Route Handler sebagai lapisan API |
| Bahasa | TypeScript 5 | Kontrak data dipaksakan compiler, bukan sekadar disepakati |
| UI | Tailwind CSS 4, lucide-react | Utility styling; satu set ikon untuk DOM *dan* marker peta |
| Peta | Leaflet 1.9 + react-leaflet 5, leaflet.heat | Open source, tanpa API key, tanpa biaya per tile |
| Database | Neon Postgres via Prisma 7 (`@prisma/adapter-neon`) | Driver serverless lewat HTTP, cocok untuk lingkungan tanpa server tetap |
| Autentikasi | `jose` (JWT) + bcryptjs, cookie httpOnly | `jose` jalan di edge runtime, sehingga penjaga rute bisa memverifikasi sesi |
| Berkas | Vercel Blob | Unggahan bukti laporan |
| Hosting | Vercel (aplikasi) + Render (API ML) | Keduanya free tier |

### Layanan luar (tanpa API key)

| Layanan | Dipakai untuk |
|---|---|
| [OSRM](https://project-osrm.org/) | Geometri jalan, durasi tempuh, rute alternatif |
| [Nominatim](https://nominatim.org/) | Geocoding, autocomplete, reverse geocoding |
| [Overpass](https://overpass-api.de/) | Safe point dari OpenStreetMap |
| RiskScore API | Skor risiko (FastAPI, buatan tim sendiri) |

---

## Arsitektur frontend

```
Peramban
   │
   ├── Client Component ──► Route Handler ──► Layanan luar
   │   peta, form, state       /api/*          RiskScore · Overpass
   │
   └── Server Component ──► Prisma ──► Neon Postgres
       halaman admin, daftar laporan
```

Tiga keputusan yang membentuk struktur ini:

**Peramban tidak pernah memanggil layanan luar secara langsung.** Semua lewat
Route Handler di `src/app/api/`. Alasannya bukan gaya: tidak ada CORS yang perlu
diurus, tidak ada URL upstream atau token yang ikut masuk ke bundle JavaScript,
dan kalau alamat layanan berubah cukup satu berkas yang disunting.

**Halaman yang bergantung data dirender di server.** Panel admin dan daftar
laporan mengambil datanya lewat Prisma di Server Component, jadi tidak ada
kedipan skeleton dan tidak ada endpoint tambahan yang perlu dibuat hanya untuk
mengisi tabel.

**Peta selalu dimuat dinamis.** Leaflet menyentuh `window` saat diimpor,
sehingga setiap komponen peta dibungkus `dynamic(..., { ssr: false })`.

---

## Halaman

| Rute | Isi |
|---|---|
| `/` | **Safe Route** — pencarian rute + penilaian risiko + heatmap + safe point |
| `/in-trip` | **In-Trip Protection** — pelacakan langsung, hitung mundur ETA, peringatan otomatis |
| `/report` · `/report/new` | Daftar laporan (All / My Reports) dan formulir pelaporan |
| `/emergency` | Kontak darurat dan tombol SOS |
| `/login` · `/register` | Masuk sebagai User atau Admin |
| `/admin` | Antrean verifikasi laporan |
| `/admin/public-feed` | Laporan yang sudah tayang |
| `/admin/safe-points` | Daftar tempat aman kurasi pengelola |
| `/admin/risk-areas` | Penilaian risiko wilayah secara manual |

Penjagaan rute berdasarkan peran ada di `src/proxy.ts` — pengganti
`middleware.ts` sejak Next.js 16. Pengunjung yang belum masuk diarahkan ke
`/login`, dan admin diarahkan ke panelnya sendiri.

---

## Fitur utama

**Safe Route.** OSRM mengembalikan sampai tiga rute alternatif yang benar-benar
berbeda jalannya. Tiap rute dinilai terpisah di beberapa titik sampel. Kartunya
bisa dipilih dan peta ikut berubah; rute yang tidak dipilih tetap tampak sebagai
garis abu-abu yang bisa diklik. Urutan kartu mengikuti tingkat keamanan, bukan
kecepatan.

**Heatmap risiko.** Mengambil sampel grid pada area peta yang sedang terlihat,
lalu mewarnai sel yang punya skor.

**Safe point.** Pos polisi, rumah sakit, apotek, SPBU, dan minimarket di sekitar
rute, diambil dari OpenStreetMap. Dinilai terhadap **perkiraan waktu tiba**
(jam berangkat + durasi OSRM), bukan waktu berangkat — tempat yang tutup sebelum
kita sampai tidak ada gunanya. Statusnya tiga: `OPEN`, `CLOSED`, `HOURS N/A`.

**In-Trip Protection.** Pelacakan GPS terhadap rute yang direncanakan dengan
hitung mundur ETA. Bila ETA terlewat tanpa konfirmasi, tenggang 10 menit
berjalan sebelum kontak darurat dihubungi. Tanpa GPS, pergerakan disimulasikan
sepanjang rute.

**SOS.** Ditahan tiga detik untuk aktif, supaya tidak menyala karena tersenggol.

**Lapor kejadian.** Anonim. Lokasi bisa diambil dari GPS perangkat, pin peta
yang digeser, atau diketik langsung; asal koordinat ikut disimpan. Maksimal
lima lampiran, dengan pratinjau.

**Panel admin.** Verifikasi laporan, kurasi safe point, dan tabel risk area yang
menutup celah data Indonesia.

---

## Kontrak data dengan RiskScore API

Model dilatih dengan dataset **Chicago Open Data**, jadi koordinat di luar
cakupannya dijawab `match_type: "no_data"` — dengan `risk_score: 0.0` dan
`level: "Low"`.

Ditampilkan apa adanya, Jakarta akan tampil sebagai rute hijau "Safe 100%".
Karena itu klien tidak pernah meneruskan level mentah. `fetchRiskScore()`
mengembalikan discriminated union:

```ts
type RiskResult =
  | { status: 'ok';      score: number; level: RiskLevel; source: 'model' | 'admin' }
  | { status: 'no_data'; disclaimer: string }
  | { status: 'error';   message: string }
```

TypeScript menolak pembacaan `.score` sebelum `status` dipersempit, sehingga
setiap tampilan wajib menangani keadaan tanpa data. Itu sebabnya rute tanpa
skor selalu muncul sebagai kartu abu-abu "Not scored", bukan hijau.

Tiga aturan turunannya:

- Skor rute diambil dari **segmen terburuk**, bukan rata-rata.
- **"Tidak diketahui" adalah keadaan tersendiri**, tidak digabung ke "aman".
- Penilaian manusia diberi label *"Assessed by SafeHer, not by the historical
  model."*

---

## Langkah memakai API

### 1. Arahkan aplikasi ke layanan

```bash
# .env.local
NEXT_PUBLIC_RISK_API_URL="https://riskscore-api.onrender.com"
```

Peramban tetap memanggil `/api/risk-score`; nilai di atas dibaca di sisi
server oleh Route Handler.

### 2. Panaskan layanannya

Render free tier tidur setelah ~15 menit menganggur, dan permintaan pertama
butuh sekitar 50 detik untuk membangunkannya.

```bash
curl https://riskscore-api.onrender.com/health
```

### 3. Bentuk permintaannya

```
GET /risk-score?lat=41.8781&lon=-87.6298&datetime=2026-08-12T21:30:00
```

```jsonc
{
  "risk_score": 62.4,
  "level": "High",
  "match_type": "exact",     // "exact" | "nearest" | "no_data"
  "distance_km": null,
  "model_version": "v1.2.0",
  "disclaimer": "Estimasi berbasis pola kejahatan historis…",
  "latency_ms": 12.3
}
```

`datetime` memakai ISO 8601 **tanpa timezone**. Gunakan komponen waktu lokal,
bukan `toISOString()` — kalau tidak, keberangkatan 21:30 akan dinilai sebagai
siang hari UTC. Fungsi `toApiDatetime()` sudah menanganinya.

Jamnya berpengaruh nyata: API menyaring riwayat kejahatan menurut
`(day_of_week, hour)` sebelum memprediksi, jadi jalan yang sama mendapat skor
berbeda pada 08:00 dan 02:00.

### 4. Panggil dari komponen

```ts
import { fetchRouteRisk, fetchRiskAreas, toApiDatetime } from '@/lib/riskApi';

const areas = await fetchRiskAreas();            // penilaian cadangan dari admin
const risk  = await fetchRouteRisk(
  path,                                          // LatLng[] dari OSRM
  toApiDatetime('21:30'),
  6,                                             // jumlah titik sampel
  areas
);
```

### 5. Tangani ketiga keadaannya

```tsx
switch (risk.overall.status) {
  case 'ok':
    return <RouteCard level={risk.overall.level} score={risk.overall.score} />;
  case 'no_data':
    return <NotScoredCard />;   // abu-abu, bukan hijau
  case 'error':
    return <UnavailableCard message={risk.overall.message} />;
}
```

`fetchRouteRisk` menilai titik secara berurutan, bukan paralel — beberapa
lookup DNS serentak gagal berjamaah di Windows. Setelah layanan hangat satu
titik hanya ~12 ms, jadi enam titik tetap di bawah satu detik.

---

## Komponen yang bisa dipakai ulang

Berdiri sendiri, tanpa asumsi khusus SafeHer:

| Modul | Fungsinya |
|---|---|
| `lib/openingHours.ts` | Mengurai `opening_hours` OSM → `'open' \| 'closed' \| 'unknown'`. Menangani rentang hari, beberapa jendela waktu, dan rentang yang melewati tengah malam. |
| `components/LocationInput.tsx` | Autocomplete Nominatim. Dirender lewat portal berposisi fixed, sehingga tidak terpotong `overflow` induknya. |
| `components/IncidentLocationPicker.tsx` | GPS + pin peta yang bisa digeser + ketik bebas, dengan reverse geocoding. |
| `components/DateTimePicker.tsx` | Kalender sendiri, tanpa dependensi tambahan. |
| `components/HeatmapLayer.tsx` | Pembungkus react-leaflet untuk `leaflet.heat`. |
| `lib/trip.ts` | Sesi perjalanan di `sessionStorage` dan `pointAlongPath()` untuk interpolasi sepanjang polyline. |
| `components/admin/AdminCard.tsx` | Kerangka `AdminCard` / `AdminTable` beserta keadaan kosongnya. |

---

## Struktur proyek

```
src/
├── app/
│   ├── page.tsx              Safe Route (beranda)
│   ├── report/               Daftar laporan · /new formulir
│   ├── emergency/            Kontak darurat + SOS
│   ├── in-trip/              Pelacakan langsung
│   ├── login/ · register/
│   ├── admin/                Review · public-feed · safe-points · risk-areas
│   └── api/                  Route Handler
├── components/               UI bersama · admin/ khusus admin
├── lib/                      Logika domain, tanpa JSX
├── generated/prisma/         Klien Prisma (hasil generate)
└── proxy.ts                  Penjagaan rute berdasarkan peran
```

### Route API

| Route | Kegunaan |
|---|---|
| `GET /api/risk-score` | Proxy ke layanan ML |
| `POST /api/risk-grid` | Pengambilan sampel grid untuk heatmap |
| `POST /api/safe-points` | Proxy Overpass |
| `GET POST /api/reports` · `PATCH DELETE /api/reports/[id]` · `GET /api/reports/mine` | Laporan kejadian |
| `GET POST /api/guardians` · `DELETE /api/guardians/[id]` | Kontak darurat |
| `POST /api/sos` | Pengiriman peringatan |
| `/api/auth/login · register · logout · me` | Sesi |
| `/api/admin/*` | Operasi admin, dijaga `requireAdmin()` |

Penjaga rute melewati `/api`, jadi setiap route admin memanggil
`requireAdmin()` sendiri.

---

## Menjalankan proyek

```bash
npm install                  # postinstall menjalankan `prisma generate`
cp .env.example .env.local   # lalu isi nilainya
npx prisma db push           # membuat tabel
npx tsx prisma/seed.ts       # akun demo
npm run dev
```

Buka <http://localhost:3000>.

### Akun demo

| Peran | Identifier | Kata sandi |
|---|---|---|
| User | `user@safeher.org` | `safeher123` |
| Admin | `admin@safeher.org` | `admin123456` |

### Environment

| Variabel | Wajib | Bila tidak diisi |
|---|---|---|
| `DATABASE_URL` | ya | Aplikasi berhenti saat mulai |
| `AUTH_SECRET` | ya | Aplikasi menolak jalan (min. 16 karakter) |
| `NEXT_PUBLIC_RISK_API_URL` | ya | Menembak `http://localhost:8000` |
| `BLOB_READ_WRITE_TOKEN` | tidak | Unggah bukti gagal; laporan tanpa berkas tetap terkirim |
| `FONNTE_TOKEN` | tidak | SOS melaporkan dirinya sebagai simulasi |

```bash
# membuat AUTH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
