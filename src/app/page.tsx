'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Check, Info, Loader2, Map, TriangleAlert } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import LocationInput, { type PlaceSuggestion } from '../components/LocationInput';
import {
  fetchRiskAreas,
  fetchRouteRisk,
  toApiDatetime,
  toSafetyPercentage,
  type LatLng,
  type RouteRisk,
} from '../lib/riskApi';
import { saveTripPlan } from '../lib/trip';
import {
  fetchSafePoints,
  formatDistance,
  sortByDistanceTo,
  SAFE_POINT_ICONS,
  SAFE_POINT_LABELS,
  type SafePoint,
} from '../lib/safePoints';

// Import SafeRouteMap secara dynamic khusus untuk Client Side
const SafeRouteMap = dynamic(() => import('../components/SafeRouteMap'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 font-medium">
      Loading map...
    </div>
  )
});

/**
 * Banyaknya titik yang dinilai di sepanjang rute.
 *
 * Lebih sedikit ketika ada beberapa alternatif: penilaian berjalan berurutan
 * (lihat fetchRouteRisk), jadi tiga rute x enam titik berarti 18 panggilan
 * beruntun. Empat titik per rute tetap cukup untuk membandingkan, dan
 * perbandingannya jadi adil karena semua rute dinilai dengan cara yang sama.
 */
const RISK_SAMPLE_COUNT = 6;
const RISK_SAMPLE_COUNT_MULTI = 4;

/** Banyaknya rute yang diminta ke OSRM, termasuk rute utama. */
const MAX_ROUTES = 3;

/** Satu pilihan rute yang benar-benar berasal dari OSRM. */
interface RouteOption {
  id: number;
  path: LatLng[];
  viaRoad: string;
  durationMin: number;
  distanceKm: string;
  risk: RouteRisk | null;
}

/**
 * Nilai urut sebuah rute: makin kecil makin didahulukan.
 *
 * Rute yang sudah dinilai selalu di atas rute tanpa data, berapa pun
 * skornya. Rute yang tidak terjangkau penilaian bukan rute aman - ia hanya
 * rute yang belum diketahui, dan menempatkannya di puncak daftar sama saja
 * merekomendasikan sesuatu yang tidak kita ketahui.
 */
function rankOf(route: RouteOption): number {
  const overall = route.risk?.overall;
  if (overall?.status === 'ok') return overall.score;
  return 1000 + route.durationMin;
}

/** Mengubah nama tempat menjadi koordinat lewat Nominatim. */
async function geocode(query: string): Promise<LatLng | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`
    );
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    }
  } catch (err) {
    console.warn(`Geocoding gagal untuk "${query}":`, err);
  }
  return null;
}

export default function SafeRoutePage() {
  const router = useRouter();
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [originCoords, setOriginCoords] = useState<LatLng>([41.8781, -87.6298]);
  const [destCoords, setDestCoords] = useState<LatLng>([41.8814, -87.7280]);
  /** Semua rute dari OSRM, sudah dinilai. Kosong jika routing gagal. */
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedId, setSelectedId] = useState(0);
  /** Pesan kegagalan pencarian rute; menggantikan seluruh kartu hasil. */
  const [routeError, setRouteError] = useState<string | null>(null);
  /**
   * Safe point per rute. Disimpan terpisah, bukan satu daftar, karena tiap
   * rute melewati jalan berbeda sehingga tempat aman di sekitarnya pun
   * berbeda - itulah salah satu alasan sebuah rute layak dipilih.
   */
  const [safePointsByRoute, setSafePointsByRoute] = useState<Record<number, SafePoint[]>>({});

  const selected = routes.find((r) => r.id === selectedId) ?? routes[0] ?? null;
  const routePath = selected?.path ?? [];
  const routeRisk = selected?.risk ?? null;
  const safePoints = safePointsByRoute[selected?.id ?? -1] ?? [];

  // State Input Form
  const [originText, setOriginText] = useState('The Loop, Chicago');
  const [destinationText, setDestinationText] = useState('West Garfield Park, Chicago');
  const [departureTime, setDepartureTime] = useState('21:30');
  /** Koordinat dari saran yang dipilih; menghindari geocoding ulang. */
  const [pickedOrigin, setPickedOrigin] = useState<LatLng | null>(null);
  const [pickedDest, setPickedDest] = useState<LatLng | null>(null);

  // Fungsi Fetch ke Nominatim, OSRM, & RiskScore API
  const handleFindRoutes = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setRoutes([]);
    setSelectedId(0);
    setRouteError(null);
    setSafePointsByRoute({});

    // 1. Ubah kedua input menjadi koordinat. Berurutan, bukan paralel:
    //    Nominatim membatasi 1 permintaan per detik.
    const origin = pickedOrigin ?? (await geocode(originText));
    const dest = pickedDest ?? (await geocode(destinationText));

    if (!origin || !dest) {
      const failed = !origin ? originText : destinationText;
      setRouteError(`We could not find "${failed}". Try being more specific, for example include the city name.`);
      setHasSearched(true);
      setIsLoading(false);
      return;
    }

    setOriginCoords(origin);
    setDestCoords(dest);

    // 2. Fetch OSRM Routing. overview=full + geometries=geojson memberi
    //    geometri jalan sungguhan, bukan sekadar jarak & durasi.
    //    alternatives meminta rute lain lewat jalan berbeda; OSRM hanya
    //    memberinya bila memang ada, jadi jumlahnya bisa saja tetap satu.
    let found: Omit<RouteOption, 'risk'>[] = [];
    try {
      const osrmRes = await fetch(
        `https://router.project-osrm.org/route/v1/driving/` +
          `${origin[1]},${origin[0]};${dest[1]},${dest[0]}` +
          // alternatives=true, bukan angka. Server demo OSRM menerima
          // keduanya pada versi baru, tetapi hanya bentuk boolean yang
          // dijamin ada sejak lama - dan jumlahnya toh sudah dibatasi
          // slice(0, MAX_ROUTES) di bawah.
          `?overview=full&geometries=geojson&alternatives=true`
      );
      const osrmData = await osrmRes.json();

      found = ((osrmData.routes ?? []) as Record<string, never>[])
        .slice(0, MAX_ROUTES)
        .map((route, id) => ({
          id,
          // GeoJSON memakai urutan [lon, lat]; Leaflet memakai [lat, lon].
          path: (
            (route as unknown as { geometry?: { coordinates?: [number, number][] } })
              .geometry?.coordinates ?? []
          ).map(([lng, lt]) => [lt, lng] as LatLng),
          viaRoad: `Via ${
            (route as unknown as { legs?: { summary?: string }[] }).legs?.[0]?.summary ||
            destinationText.split(',')[0]
          }`,
          durationMin: Math.round(
            (route as unknown as { duration: number }).duration / 60
          ),
          distanceKm: `${(
            (route as unknown as { distance: number }).distance / 1000
          ).toFixed(1)} km`,
        }))
        .filter((r) => r.path.length > 1);
    } catch (osrmErr) {
      console.warn('OSRM routing gagal:', osrmErr);
    }

    // Tanpa rute, JANGAN mengarang garis lurus lalu menilainya. Dulu hal itu
    // membuat perjalanan di Jakarta memperoleh skor milik titik asal di
    // Chicago - persis rasa aman palsu yang harus dihindari produk ini.
    if (found.length === 0) {
      setRouteError(
        'No road route was found between these two locations. ' +
          'Make sure the start and destination are in the same region.'
      );
      setHasSearched(true);
      setIsLoading(false);
      return;
    }

    // 3. Nilai risiko di beberapa titik sepanjang SETIAP rute, memakai jam
    //    keberangkatan pilihan user - risiko berubah menurut waktu (PRD FR#6).
    // Wilayah yang dinilai pengelola dipakai sebagai cadangan ketika model
    // tidak mencakup lokasi tersebut - yaitu seluruh Indonesia.
    const areas = await fetchRiskAreas();
    const samples = found.length > 1 ? RISK_SAMPLE_COUNT_MULTI : RISK_SAMPLE_COUNT;

    const scored: RouteOption[] = [];
    for (const route of found) {
      const risk = await fetchRouteRisk(
        route.path,
        toApiDatetime(departureTime),
        samples,
        areas
      );
      scored.push({ ...route, risk });
      // Ditampilkan begitu selesai, tidak menunggu semuanya: penilaian
      // berjalan berurutan, jadi menunggu rute ketiga berarti layar kosong
      // padahal rute pertama sudah punya jawaban.
      setRoutes([...scored]);
    }

    // Rute paling aman didahulukan, bukan yang paling cepat - itu inti
    // produknya. Rute tanpa data tidak pernah naik ke atas rute yang sudah
    // dinilai, karena "belum dinilai" bukan berarti "aman".
    scored.sort((a, b) => rankOf(a) - rankOf(b));
    setRoutes(scored);
    setSelectedId(scored[0].id);

    setHasSearched(true);
    setIsLoading(false);
  };

  /**
   * Safe point diambil untuk rute yang sedang dipilih, bukan sekali untuk
   * semuanya. Mengambil ketiganya di muka berarti tiga permintaan Overpass
   * beruntun yang lambat, padahal dua di antaranya mungkin tidak pernah
   * dilihat. Hasilnya di-cache per rute supaya berpindah bolak-balik antar
   * rute tidak memanggil ulang.
   */
  useEffect(() => {
    if (!selected || safePointsByRoute[selected.id]) return;

    let cancelled = false;
    fetchSafePoints(selected.path).then((points) => {
      if (cancelled) return;
      setSafePointsByRoute((prev) => ({
        ...prev,
        [selected.id]: sortByDistanceTo(points, destCoords),
      }));
    });

    return () => {
      cancelled = true;
    };
  }, [selected, safePointsByRoute, destCoords]);

  /**
   * Meneruskan rute terpilih ke In-Trip Protection.
   *
   * Rencana perjalanan dititipkan lewat sessionStorage, bukan query string,
   * karena geometri jalan bisa ratusan titik dan tidak muat di URL.
   */
  const startNavigation = () => {
    saveTripPlan({
      originLabel: originText,
      destinationLabel: destinationText,
      originCoords,
      destCoords,
      routePath: routePath.length > 1 ? routePath : [originCoords, destCoords],
      durationMin: selected?.durationMin ?? 10,
      distanceKm: selected?.distanceKm ?? '',
      riskSegments: routeRisk?.segments ?? [],
      safePoints,
    });
    router.push('/in-trip');
  };

  return (
    <div className="min-h-screen bg-white font-sans flex flex-col overflow-x-hidden">
      
      {/* FIXED NAVBAR ATAS */}
      <header className="fixed top-0 left-0 right-0 h-[72px] z-50 bg-white border-b border-gray-200">
        <Navbar />
      </header>

      {/* KONTEN UTAMA */}
      <div className="flex flex-col lg:flex-row flex-1 lg:h-screen pt-[72px] lg:overflow-hidden"> 
        
        {/* PANEL KIRI: Form & Hasil Rute */}
        <div className="w-full lg:w-[420px] bg-white px-4 sm:px-6 py-5 border-b lg:border-b-0 lg:border-r border-gray-200 flex flex-col justify-between z-10 shadow-lg lg:overflow-y-auto lg:max-h-full">
          <div>
            
            {/* 1. CONTAINER FORM LOKASI UTAMA */}
            <div className="border border-gray-400 rounded-2xl p-3.5 mb-3 bg-white relative shadow-sm">
              <div className="absolute left-[23px] top-[32px] bottom-[32px] w-[1px] border-l-2 border-dotted border-gray-400 pointer-events-none z-0" />

              {/* INPUT 1: CURRENT LOCATION */}
              <div className="flex items-center gap-3 relative z-10 pb-2.5">
                <div className="text-gray-600 pl-0.5">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="6" />
                    <path strokeLinecap="round" d="M12 2v3m0 14v3M2 12h3m14 0h3" />
                  </svg>
                </div>
                
                <LocationInput
                  value={originText}
                  onChange={(v) => {
                    setOriginText(v);
                    setPickedOrigin(null);
                  }}
                  onSelect={(p: PlaceSuggestion) => setPickedOrigin(p.coords)}
                  placeholder="Where are you starting from?"
                />
              </div>

              {/* GARIS PEMBATAS HORIZONTAL & SWAP BUTTON */}
              <div className="relative flex items-center my-0.5 z-10">
                <div className="w-full border-t border-gray-300 ml-8 mr-8" />
                <button
                  type="button"
                  onClick={() => {
                    setOriginText(destinationText);
                    setDestinationText(originText);
                    setPickedOrigin(pickedDest);
                    setPickedDest(pickedOrigin);
                  }}
                  className="absolute right-0 text-gray-600 hover:text-black transition-colors cursor-pointer bg-white px-1"
                  title="Swap locations"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </button>
              </div>

              {/* INPUT 2: DESTINATION */}
              <div className="flex items-center gap-3 relative z-10 pt-2.5">
                <div className="text-gray-600 pl-0.5">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>

                <LocationInput
                  value={destinationText}
                  onChange={(v) => {
                    setDestinationText(v);
                    setPickedDest(null);
                  }}
                  onSelect={(p: PlaceSuggestion) => setPickedDest(p.coords)}
                  placeholder="Where are you going?"
                />
              </div>
            </div>

            {/* 2. SELECT DEPARTURE TIME */}
            <div className="border border-gray-400 rounded-2xl px-4 py-2.5 mb-4 bg-white flex items-center justify-between cursor-pointer hover:border-gray-500 transition-colors">
              <div className="flex items-center gap-3 w-full">
                <svg className="w-5 h-5 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" />
                </svg>
                
                <select 
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  className="w-full text-sm font-semibold text-gray-800 bg-transparent outline-none cursor-pointer appearance-none"
                >
                  <option value="21:30">Departure Time: Leave Now (21:30)</option>
                  <option value="22:00">Departure Time: 22:00</option>
                  <option value="23:00">Departure Time: 23:00</option>
                </select>
              </div>

              <svg className="w-4 h-4 text-black flex-shrink-0 pointer-events-none" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>

            {/* 3. TOMBOL FIND ROUTES */}
            <button 
              onClick={handleFindRoutes}
              disabled={isLoading}
              className="w-full bg-[#D91176] hover:bg-[#b80d63] disabled:bg-gray-400 text-white font-bold py-3 rounded-xl shadow-sm transition-colors text-sm tracking-wide uppercase cursor-pointer mb-4 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> ASSESSING ROUTE RISK...
                </>
              ) : (
                'FIND ROUTES'
              )}
            </button>

            {/* Pencarian pertama menunggu server penilaian bangun dari idle.
                Tanpa keterangan ini, jeda panjang terasa seperti aplikasi hang. */}
            {isLoading && (
              <p className="text-[11px] text-gray-500 text-center -mt-2 mb-4 leading-snug">
                The first search may take up to a minute while the assessment
                service wakes up. Later searches are much faster.
              </p>
            )}

            {/* KEGAGALAN PENCARIAN RUTE */}
            {hasSearched && routeError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 animate-fadeIn">
                <h4 className="text-sm font-bold text-rose-900 mb-1">Route not found</h4>
                <p className="text-[11px] text-rose-800 leading-snug">{routeError}</p>
              </div>
            )}

            {/* HASIL RUTE DARI API */}
            {hasSearched && !routeError && (
              <div className="flex flex-col gap-3.5 animate-fadeIn">
                
                {/* A. TIME RISK WARNING CARD */}
                <div className="bg-[#FFF4D3] border border-[#F5E0A3] rounded-xl p-3.5 flex gap-2.5 items-start">
                  <TriangleAlert className="w-4 h-4 text-black mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-xs font-black tracking-wide text-black uppercase mb-1">
                      TIME RISK WARNING
                    </h4>
                    <p className="text-[11px] text-gray-800 font-medium leading-snug">
                      Risk level for this route is higher after 21:00 on weekends. Consider leaving earlier or choosing an alternative route.
                    </p>
                  </div>
                </div>

                {/* B. DAFTAR RUTE - satu kartu per rute nyata dari OSRM */}
                {routes.length > 1 && (
                  <p className="text-[11px] text-gray-500 -mb-1">
                    {routes.length} routes found. Tap a card or a grey line on
                    the map to compare them.
                  </p>
                )}

                {routes.map((route, idx) => (() => {
                  const isSelected = route.id === selected?.id;
                  const displayRoad = route.viaRoad;
                  const displayTimeDist = `${route.durationMin} min (${route.distanceKm})`;
                  const routeRisk = route.risk;
                  const overall = routeRisk?.overall;

                  /** Membungkus kartu agar bisa dipilih dan terlihat terpilih. */
                  const wrap = (children: React.ReactNode, tone: string) => (
                    <div
                      key={route.id}
                      onClick={() => setSelectedId(route.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedId(route.id);
                        }
                      }}
                      aria-pressed={isSelected}
                      className={`${tone} border rounded-xl p-4 shadow-sm cursor-pointer transition-all ${
                        isSelected
                          ? 'ring-2 ring-[#D91176] ring-offset-1'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      {routes.length > 1 && (
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                            Option {idx + 1}
                          </span>
                          {isSelected && (
                            <span className="flex items-center gap-1 text-[10px] font-black uppercase text-[#D91176]">
                              <Check className="w-3 h-3" /> Showing on map
                            </span>
                          )}
                        </div>
                      )}
                      {children}
                    </div>
                  );

                  // Tanpa data keamanan, rute TIDAK BOLEH tampil hijau/aman.
                  // Netral (abu-abu) + ajakan berhati-hati. Lihat PRD AC#1 Edge Case.
                  if (!overall || overall.status !== 'ok') {
                    const isError = overall?.status === 'error';

                    return wrap(
                      <>
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-bold text-gray-900">Route Available</h4>
                          <span className="text-[10px] bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full font-extrabold uppercase">
                            Not Scored
                          </span>
                        </div>

                        <div className="border-b border-black/10 pb-1 mb-2">
                          <p className="text-sm font-extrabold text-black truncate">{displayRoad}</p>
                        </div>

                        <p className="text-sm font-black text-black mb-2">{displayTimeDist}</p>

                        <div className="bg-white border border-gray-200 rounded-lg p-2.5 mb-3">
                          <p className="text-[11px] font-bold text-gray-800 mb-0.5">
                            Safety data not available
                          </p>
                          <p className="text-[11px] text-gray-600 leading-snug">
                            {isError
                              ? `${overall.message} The route is still shown, but its risk level could not be assessed.`
                              : `None of the ${routeRisk?.total ?? 0} points checked along this route are covered by risk assessment data. Please stay alert.`}
                          </p>
                        </div>

                        {isSelected && (
                          <button onClick={startNavigation} className="w-full bg-gray-700 hover:bg-gray-800 text-white font-bold py-2.5 rounded-lg text-xs uppercase tracking-wider transition-colors cursor-pointer">
                            START NAVIGATION
                          </button>
                        )}
                      </>,
                      'bg-gray-50 border-gray-300'
                    );
                  }

                  const { score, level, approximate, source, areaName } = overall;
                  const safetyPercentage = toSafetyPercentage(score);
                  const { covered = 0, total = 0 } = routeRisk ?? {};
                  const partialCoverage = covered < total;

                  let cardBg = 'bg-[#E2F7E9] border-[#C3E8CE]';
                  let badgeColor = 'text-[#15803D]';
                  let badgeText = `Safe ${safetyPercentage}%`;
                  // "Recommended" hanya untuk kartu teratas: daftar sudah
                  // diurutkan dari yang paling aman, jadi menyebut dua rute
                  // sekaligus sebagai rekomendasi menghapus artinya.
                  let titleText = idx === 0 ? 'Safe Route (Recommended)' : 'Safe Route';
                  let showCaution = false;
                  let btnBg = 'bg-[#16A34A] hover:bg-[#15803D]';

                  if (level === 'Medium') {
                    cardBg = 'bg-amber-50/80 border-amber-200';
                    badgeColor = 'text-amber-800';
                    badgeText = `Moderate Risk (${Math.round(score)}%)`;
                    titleText = 'Moderate Route';
                    btnBg = 'bg-amber-600 hover:bg-amber-700';
                  } else if (level === 'High' || level === 'Very High') {
                    cardBg = 'bg-rose-50 border-rose-200';
                    badgeColor = 'text-rose-800';
                    badgeText = `High Risk (${Math.round(score)}%)`;
                    titleText = 'Safest Available Route';
                    showCaution = true;
                    btnBg = 'bg-rose-600 hover:bg-rose-700';
                  }

                  return wrap(
                    <>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-bold text-gray-900">
                            {titleText}
                          </h4>
                          {showCaution && (
                            <span className="text-[10px] bg-rose-200 text-rose-900 px-2 py-0.5 rounded-full font-extrabold uppercase">
                              <TriangleAlert className="w-3 h-3 inline mr-0.5" />{level} Risk
                            </span>
                          )}
                        </div>

                        {/* Nama Jalan Dinamis */}
                        <div className="border-b border-black/10 pb-1 mb-2">
                          <p className="text-sm font-extrabold text-black truncate">
                            {displayRoad}
                          </p>
                        </div>

                        {/* Durasi, Jarak, & Status Risk Dinamis */}
                        <p className="text-sm font-black text-black mb-1">
                          {displayTimeDist} <span className="font-normal">|</span>{' '}
                          <span className={`font-black ${badgeColor}`}>
                            {badgeText}
                          </span>
                        </p>

                        <p className="text-[11px] text-gray-600 font-medium mb-1">
                          Risk Assessment: <strong className="capitalize">{level}</strong>
                          {source === 'model' && approximate && ' • based on nearest area'}
                          {' • at '}
                          {departureTime}
                          {source === 'admin' && (
                            <span className="block text-[10px] text-blue-700 font-semibold mt-0.5">
                              Assessed by SafeHer for {areaName}, not by the historical model
                            </span>
                          )}
                        </p>

                        {/* Penilaian mengikuti segmen paling berisiko, jadi
                            dasarnya perlu terlihat oleh pengguna. */}
                        <p className="text-[10px] text-gray-500 mb-3">
                          Based on the riskiest segment among {covered} scored
                          point{covered === 1 ? '' : 's'}
                          {total > 0 && ` (of ${total} checked)`}
                          {partialCoverage && ' • part of the route has no data'}
                        </p>
                      </div>

                      {isSelected && (
                        <button onClick={startNavigation} className={`w-full ${btnBg} text-white font-bold py-2.5 rounded-lg text-xs uppercase tracking-wider transition-colors cursor-pointer`}>
                          START NAVIGATION
                        </button>
                      )}
                    </>,
                    cardBg
                  );
                })())}

                {/* B2. SAFE POINT DI SEKITAR RUTE
                    Sumbernya OpenStreetMap, bukan model Risk Score, jadi
                    tetap terisi di wilayah yang belum punya data risiko. */}
                <div className="bg-white border border-gray-300 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-gray-900">
                      Nearest Safe Points
                    </h4>
                    {safePoints.length > 0 && (
                      <span className="text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-bold">
                        {safePoints.length} found
                      </span>
                    )}
                  </div>

                  {safePoints.length === 0 ? (
                    <p className="text-[11px] text-gray-500 leading-snug">
                      No safe points were detected along this route.
                    </p>
                  ) : (
                    <>
                      <ul className="flex flex-col gap-1.5">
                        {safePoints.slice(0, 4).map((point) => {
                          const PointIcon = SAFE_POINT_ICONS[point.type];
                          return (
                          <li key={point.id} className="flex items-start gap-2">
                            <PointIcon className="w-4 h-4 text-gray-700 mt-0.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-[12px] font-semibold text-gray-900 truncate">
                                {point.name}
                              </p>
                              <p className="text-[10px] text-gray-500">
                                {SAFE_POINT_LABELS[point.type]}
                                {point.distanceM !== undefined &&
                                  ` • ${formatDistance(point.distanceM)} from destination`}
                              </p>
                              {point.curated && (
                                <p className="text-[10px] text-emerald-700 font-semibold">
                                  Verified by SafeHer
                                  {point.phone ? ` • ${point.phone}` : ''}
                                </p>
                              )}
                            </div>
                            {point.open24h && (
                              <span className="text-[9px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded font-bold whitespace-nowrap">
                                24H
                              </span>
                            )}
                          </li>
                          );
                        })}
                      </ul>
                      <p className="text-[10px] text-gray-400 mt-2">
                        Source: OpenStreetMap. Opening hours come from community
                        data and may not always be up to date.
                      </p>
                    </>
                  )}
                </div>

                {/* Kartu "Fastest Route" yang lama dihapus. Isinya dikarang -
                    durasinya sekadar durasi rute utama dikurangi empat menit
                    dan nama jalannya dirangkai dari teks tujuan. Rute itu
                    tidak pernah ada, tidak pernah dinilai, dan tombolnya
                    menjalankan geometri yang sama persis dengan kartu di
                    atasnya. Alternatif di atas kini datang dari OSRM. */}

                {/* D. DISCLAIMER DATASET */}
                <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-xl text-[10px] text-gray-500 leading-relaxed">
                  <p className="font-bold text-gray-700 mb-0.5 flex items-center gap-1"><Info className="w-3 h-3" /> Risk assessment model note:</p>
                  {routeRisk && routeRisk.overall.status !== 'error'
                    ? routeRisk.overall.disclaimer
                    : 'Estimates are based on historical crime patterns (Chicago Open Data) as a proof-of-concept simulation.'}
                </div>

              </div>
            )}

          </div>

          {/* TEKS PANDUAN AWAL */}
          {!hasSearched && (
            <div className="text-center py-6 border-t border-gray-100 mt-4">
              <div className="w-14 h-14 mx-auto mb-2 bg-gray-50 rounded-full flex items-center justify-center border border-gray-200">
                <Map className="w-6 h-6 text-gray-500" />
              </div>
              <h3 className="font-bold text-gray-800 text-sm mb-1">Ready for a safe journey?</h3>
              <p className="text-xs text-gray-500 leading-relaxed px-2">
                Enter your destination above to preview safety ratings, well-lit paths, and real-time risk assessments for your route.
              </p>
            </div>
          )}

        </div>

        {/* PANEL KANAN: Peta */}
        <div className="flex-1 w-full h-[60vh] lg:h-[calc(100vh-72px)] bg-gray-100 relative z-0">
          <SafeRouteMap
            originCoords={originCoords}
            destCoords={destCoords}
            routePath={routePath}
            riskSegments={routeRisk?.segments ?? []}
            safePoints={safePoints}
            datetime={toApiDatetime(departureTime)}
            alternatives={routes
              .filter((r) => r.id !== selected?.id)
              .map((r) => ({ id: r.id, path: r.path }))}
            onSelectAlternative={setSelectedId}
          />
        </div>

      </div>
    </div>
  );
}