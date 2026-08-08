# SafeHer — Frontend

Aplikasi web keselamatan perempuan: merencanakan rute lengkap dengan penilaian
risikonya, menjaga perjalanan tetap terpantau orang terdekat, dan melaporkan
kejadian secara anonim.

Final project SISTECH 2026 · Tim 10 · frontend Next.js.
Layanan machine learning-nya berada di repositori terpisah
([RiskScore-API](https://riskscore-api.onrender.com/docs)).

---

## Hal pertama yang perlu dipahami

Model risikonya dilatih dengan dataset kriminal **Chicago Open Data**. Setiap
koordinat di luar dataset itu — termasuk seluruh Indonesia — dijawab
`match_type: "no_data"`.

Untuk `no_data`, API mengembalikan `risk_score: 0.0` dan `level: "Low"`.
Ditampilkan apa adanya, Jakarta akan tampil sebagai rute hijau **"Safe 100%"**.
Pada produk keselamatan itu bukan sekadar salah tampilan: aplikasi mengarang
rasa aman yang tidak ada buktinya.

Karena itu klien tidak pernah menampilkan level mentah. `fetchRiskScore()`
mengembalikan discriminated union yang membuat keadaan berbahaya mustahil
diabaikan:

```ts
type RiskResult =
  | { status: 'ok';      score: number; level: RiskLevel; source: 'model' | 'admin'; /* … */ }
  | { status: 'no_data'; disclaimer: string }
  | { status: 'error';   message: string }
```

TypeScript tidak mengizinkan pemanggil membaca `.score` sebelum mempersempit
`status` lebih dulu. Satu keputusan itulah sebabnya "tidak ada data" selalu
muncul sebagai kartu abu-abu **"Not scored"**, bukan kartu hijau — dan itu pula
yang membentuk sebagian besar antarmuka di bawah.

Tiga aturan turunannya, dipakai konsisten di seluruh aplikasi:

- **Skor sebuah rute diambil dari segmen terburuknya, bukan rata-rata.** Satu
  ruas berbahaya tidak menjadi aman hanya karena sisa perjalanannya tenang.
- **"Tidak diketahui" adalah keadaan tersendiri.** Safe point menampilkan
  `OPEN` / `CLOSED` / `HOURS N/A` — bukan dua keadaan dengan yang ketiga
  diam-diam dihitung sebagai "buka".
- **Penilaian manusia diberi label.** Wilayah yang dinilai admin tampil sebagai
  *"Assessed by SafeHer, not by the historical model."*

---

## Tech stack

| Lapisan | Pilihan | Alasan |
|---|---|---|
| Framework | Next.js 16 (App Router, Turbopack) | Server component untuk halaman admin, route handler sebagai lapisan API |
| Bahasa | TypeScript 5 | Union `RiskResult` hanya berguna kalau dipaksakan compiler |
| UI | Tailwind CSS 4, lucide-react | Utility styling; satu set ikon untuk DOM *dan* marker Leaflet |
| Peta | Leaflet 1.9 + react-leaflet 5, leaflet.heat | Open source, tanpa API key, tanpa biaya per tile |
| Database | Neon Postgres via Prisma 7 (`@prisma/adapter-neon`) | Driver serverless lewat HTTP — tidak ada connection pool yang habis di Vercel |
| Autentikasi | `jose` (JWT) + bcryptjs, cookie httpOnly | `jose` jalan di edge runtime, sehingga `proxy.ts` bisa memverifikasi sesi |
| Berkas | Vercel Blob | Unggahan bukti laporan |
| Hosting | Vercel (aplikasi) + Render (API ML) | Keduanya free tier |

### Layanan luar (tanpa API key)

| Layanan | Dipakai untuk |
|---|---|
| [OSRM](https://project-osrm.org/) | Geometri jalan, durasi, rute alternatif |
| [Nominatim](https://nominatim.org/) | Geocoding, autocomplete, reverse geocoding |
| [Overpass](https://overpass-api.de/) | Safe point dari OpenStreetMap |
| RiskScore API | Skor risiko (buatan tim sendiri, FastAPI di Render) |

---

## Fitur

**Safe Route** (`/`) — Isi asal dan tujuan, pilih jam berangkat. OSRM
mengembalikan sampai tiga alternatif nyata; masing-masing dinilai di beberapa
titik secara terpisah. Kartunya bisa dipilih dan peta ikut berubah — rute yang
tidak dipilih tetap terlihat sebagai garis abu-abu yang bisa diklik. Urutannya
mengikuti keamanan, dan rute tanpa data tidak pernah menyalip rute yang sudah
dinilai.

**Heatmap risiko** — Mengambil sampel grid pada area yang terlihat lalu
mewarnai sel yang punya skor. Wilayah di luar dataset dibiarkan polos; kekosongan
itu justru jawaban yang jujur.

**Safe point** — Pos polisi, rumah sakit, apotek, SPBU, dan minimarket di
sekitar rute, dari OpenStreetMap. Dinilai terhadap **perkiraan waktu tiba**
(jam berangkat + durasi OSRM), bukan waktu berangkat — tempat yang tutup
sebelum kita sampai bukan tempat berlindung. Tag `opening_hours` diurai untuk
bentuk-bentuk umum termasuk yang melewati tengah malam; yang tidak dikenali
dilaporkan `HOURS N/A`, bukan ditebak.

**In-Trip Protection** (`/in-trip`) — Pelacakan GPS langsung terhadap rute yang
direncanakan, dengan hitung mundur ETA. Bila ETA terlewat tanpa konfirmasi,
tenggang 10 menit berjalan, lalu kontak darurat dihubungi. Bila GPS tidak
tersedia, pergerakan disimulasikan sepanjang rute — dan itu dinyatakan.

**SOS** (`SosButton`) — Ditahan tiga detik untuk aktif, supaya tidak menyala
karena tersenggol di dalam tas. Mengirim lokasi dan detail perjalanan ke
kontak darurat.

**Lapor kejadian** (`/report/new`) — Anonim, kepemilikan ditandai token. Lokasi
bisa dari GPS perangkat, pin peta yang digeser, atau diketik langsung; asal
koordinatnya disimpan agar admin tahu seberapa teliti. Maksimal lima lampiran.

**Kontak darurat** (`/emergency`) — Daftar guardian beserta pilihan kanal
pengiriman per kontak.

**Panel admin** (`/admin`) — Antrean verifikasi, feed publik, daftar safe point,
dan tabel risk area yang menutup celah data Indonesia.

---

## Keputusan soal keselamatan & privasi

Ini semua disengaja — mohon jangan "disederhanakan".

- **`ownerToken` tidak pernah keluar dari server.** Token itu satu-satunya
  bukti kepemilikan laporan anonim, jadi tidak ada query yang menyertakannya
  ke dalam respons.
- **Hanya laporan `VERIFIED` yang masuk feed publik.** Laporan yang belum
  diperiksa tidak boleh ikut membentuk persepsi orang tentang suatu wilayah.
- **Pesan galat login dibuat sama persis** untuk akun tidak dikenal maupun
  sandi salah — kalau dibedakan, formulirnya berubah jadi alat penebak akun.
- **SOS menyatakan bila hanya simulasi.** Tanpa `FONNTE_TOKEN`, endpoint
  mengembalikan `simulated: true` dan antarmuka wajib mengatakannya. Menulis
  "terkirim ke 2 kontak" padahal tidak ada yang terkirim bisa membuat orang
  berhenti mencari pertolongan lain.
- **Menghapus laporan menghapus semua lampirannya**, bukan hanya yang pertama.

---

## Menjalankan proyek

```bash
git clone <repo-url> && cd finpro-team10
npm install                  # postinstall menjalankan `prisma generate`
cp .env.example .env.local   # lalu isi nilainya — lihat di bawah
npx prisma db push           # membuat tabel
npx tsx prisma/seed.ts       # akun demo
npm run dev
```

Buka <http://localhost:3000>. Halaman pertama adalah login; `proxy.ts`
mengarahkan pengunjung yang belum masuk ke sana.

### Akun demo

| Peran | Identifier | Kata sandi |
|---|---|---|
| User | `user@safeher.org` | `safeher123` |
| Admin | `admin@safeher.org` | `admin123456` |

Admin mendarat di `/admin` dan tidak bisa masuk ke aplikasi pengguna — akun
admin tidak punya kontak darurat maupun perjalanan, jadi halaman itu hanya akan
tampil kosong.

### Environment

| Variabel | Wajib | Bila tidak diisi |
|---|---|---|
| `DATABASE_URL` | ya | Aplikasi berhenti saat mulai, dengan pesan yang menyebut penyebabnya |
| `AUTH_SECRET` | ya | Aplikasi menolak jalan (min. 16 karakter; pemegangnya bisa membuat sesi admin sendiri) |
| `NEXT_PUBLIC_RISK_API_URL` | ya | Menembak `http://localhost:8000` |
| `BLOB_READ_WRITE_TOKEN` | tidak | Unggah bukti gagal; laporan tanpa berkas tetap terkirim |
| `FONNTE_TOKEN` | tidak | SOS melaporkan dirinya sebagai simulasi |

Membuat secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

> **Windows:** File Explorer menyembunyikan ekstensi, jadi berkas yang tersimpan
> sebagai `.env.local.txt` terlihat benar padahal tidak terbaca sama sekali.

---

## Cara memakai RiskScore API

Peramban tidak pernah memanggil layanan ML secara langsung, melainkan lewat
`/api/risk-score` — route handler yang membaca `NEXT_PUBLIC_RISK_API_URL` di
sisi server. Dengan begitu tidak ada CORS, tidak ada URL upstream yang ikut
masuk ke bundle, dan hanya ada satu tempat yang perlu diubah bila modelnya
pindah.

### Panggilan langsung

```
GET https://riskscore-api.onrender.com/risk-score
      ?lat=41.8781&lon=-87.6298&datetime=2026-08-12T21:30:00
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
siang hari waktu UTC. Fungsi `toApiDatetime()` di `src/lib/riskApi.ts` sudah
menanganinya.

Jamnya berpengaruh nyata. API menyaring riwayat kejahatan menurut
`(day_of_week, hour)` sebelum memprediksi, sekaligus memberi `hour_sin/cos`
sebagai fitur — sehingga jalan yang sama mendapat skor berbeda pada 08:00 dan
02:00.

### Dari dalam aplikasi

```ts
import { fetchRouteRisk, fetchRiskAreas, toApiDatetime } from '@/lib/riskApi';

const areas = await fetchRiskAreas();               // penilaian cadangan dari admin
const risk  = await fetchRouteRisk(
  path,                                             // LatLng[] dari OSRM
  toApiDatetime('21:30'),
  6,                                                // jumlah titik sampel
  areas
);

if (risk.overall.status === 'ok') {
  console.log(risk.overall.level, risk.overall.source);
} // selain itu: 'no_data' atau 'error' — wajib ditangani, jangan pernah
  // ditampilkan sebagai aman
```

`fetchRouteRisk` menilai titik **secara berurutan, dan itu disengaja.**
Mengirimnya serentak memicu beberapa lookup DNS bersamaan yang gagal berjamaah
di Windows (`getaddrinfo ENOTFOUND`). Setelah server hangat, satu titik hanya
~12 ms, jadi enam titik pun masih jauh di bawah satu detik.

> **Render free tier tidur setelah ~15 menit menganggur.** Permintaan pertama
> butuh sekitar 50 detik untuk membangunkannya. Timeout disetel 90–100 detik
> dan antarmuka menjelaskan penantian itu. Panggil `/health` sebelum demo
> untuk memanaskannya.

---

## Bagian yang bisa dipakai ulang

Berdiri sendiri, tanpa asumsi khusus SafeHer:

| Modul | Fungsinya |
|---|---|
| `lib/openingHours.ts` | Mengurai `opening_hours` OSM → `'open' \| 'closed' \| 'unknown'`. Menangani rentang hari, beberapa jendela waktu, lewat tengah malam, dan `off`. Mengembalikan `unknown` untuk apa pun yang tidak dikenali, bukan menebak. |
| `components/LocationInput.tsx` | Autocomplete Nominatim. Dirender lewat portal dengan posisi fixed, sehingga tidak ada `overflow` induk yang bisa memotong dropdown-nya. |
| `components/IncidentLocationPicker.tsx` | GPS + pin peta yang bisa digeser + ketik bebas, lengkap dengan reverse geocoding. |
| `components/DateTimePicker.tsx` | Kalender sendiri; tanpa dependensi, tanpa tampilan bawaan peramban. |
| `components/HeatmapLayer.tsx` | Pembungkus react-leaflet untuk `leaflet.heat`. |
| `lib/trip.ts` | Sesi perjalanan di `sessionStorage`, plus `pointAlongPath()` untuk interpolasi sepanjang polyline. |
| `components/admin/AdminCard.tsx` | Kerangka `AdminCard` / `AdminTable` beserta keadaan kosongnya. |

**Catatan soal `leaflet.heat`:** pustaka ini lahir sebelum era modul — tidak
mengekspor apa pun dan menempel pada variabel global `L`. Mengimpornya lewat
bundler selalu gagal tanpa pesan, seberapa awal pun `window.L` disetel, karena
lingkup modul tidak pernah teresolusi ke sana. Karena itu berkasnya disalin ke
`public/vendor/` dan dimuat lewat tag `<script>`. Kalau suatu saat heatmap-nya
kosong, periksa apakah `proxy.ts` sedang mengalihkan `/vendor/*` ke `/login`.

---

## Struktur proyek

```
src/
├── app/
│   ├── page.tsx              Safe Route (beranda)
│   ├── report/               Daftar laporan · /new  formulir pengiriman
│   ├── emergency/            Guardian + SOS
│   ├── in-trip/              Pelacakan langsung
│   ├── login/ · register/
│   ├── admin/                Review · public-feed · safe-points · risk-areas
│   └── api/                  Route handler (lihat di bawah)
├── components/               UI bersama · admin/  khusus admin
├── lib/                      Logika domain, tanpa JSX
├── generated/prisma/         Klien Prisma (hasil generate — jangan diubah)
└── proxy.ts                  Penjagaan rute berdasarkan peran
```

`proxy.ts` adalah pengganti `middleware.ts` di Next.js 16. Matcher-nya harus
tetap mengecualikan aset statis, kalau tidak berkas di `public/` ikut
dialihkan ke `/login`.

### Route API

| Route | Kegunaan |
|---|---|
| `GET  /api/risk-score` | Proxy ke layanan ML |
| `POST /api/risk-grid` | Pengambilan sampel grid untuk heatmap |
| `POST /api/safe-points` | Proxy Overpass |
| `GET POST /api/reports` · `PATCH DELETE /api/reports/[id]` · `GET /api/reports/mine` | Laporan kejadian |
| `GET POST /api/guardians` · `DELETE /api/guardians/[id]` | Kontak darurat |
| `POST /api/sos` | Pengiriman peringatan |
| `/api/auth/login · register · logout · me` | Sesi |
| `/api/admin/*` | Operasi admin, dijaga `requireAdmin()` |

Middleware melewati `/api`, jadi **setiap route admin memanggil
`requireAdmin()` sendiri.** Jangan mengandalkan `proxy.ts` untuk otorisasi API.

---

## Catatan untuk tim

- Komentar kode berbahasa Indonesia; teks yang dilihat pengguna berbahasa
  Inggris.
- Komentar menjelaskan *kenapa*, terutama di tempat yang cara wajarnya sudah
  dicoba dan gagal. Handler Overpass mencatat bentuk query mana saja yang
  ditolak; loop penilaian berurutan mencatat kegagalan DNS-nya. Menghapus
  komentar itu berarti mengundang hari debugging yang sama terulang.
- Setelah mengubah `prisma/schema.prisma`: `npx prisma db push && npx prisma generate`,
  lalu **jalankan ulang dev server** — server yang dimulai sebelum generate
  memegang klien lama dan melaporkan model sebagai `undefined`.
- Jalankan `npx tsc --noEmit` dan `npm run build` sebelum push. Build menangkap
  hal yang tidak terlihat di mode dev, misalnya `useSearchParams` di luar batas
  `Suspense`.
