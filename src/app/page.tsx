'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Navbar } from '../components/Navbar';

// Import SafeRouteMap secara dynamic khusus untuk Client Side
const SafeRouteMap = dynamic(() => import('../components/SafeRouteMap'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 font-medium">
      Memuat Peta...
    </div>
  )
});

export default function SafeRoutePage() {
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiRiskData, setApiRiskData] = useState<any>(null);

  // State untuk Rute & Geocoding
  const [routeInfo, setRouteInfo] = useState<{
    viaRoad: string;
    durationMin: number;
    distanceKm: string;
  } | null>(null);

  // State Input Form
  const [originText, setOriginText] = useState('Current Location');
  const [destinationText, setDestinationText] = useState('West Garfield Park, Chicago');
  const [departureTime, setDepartureTime] = useState('21:30');

  // Helper untuk hitung % keamanan dari risk_score (0-100)
  const getSafetyPercentage = (score?: number) => {
    if (score === undefined || score === null) return 96; 
    const safety = 100 - score;
    return Math.max(0, Math.min(100, Math.round(safety)));
  };

  // Fungsi Fetch ke Nominatim, OSRM, & FastAPI ML
  const handleFindRoutes = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Default fallback (Chicago Loop) jika geocoding tidak terdeteksi
    let lat = 41.8781; 
    let lon = -87.6298;

    try {
      // 1. Ambil koordinat otomatis dari teks tujuan yang diketik user
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destinationText)}`
      );
      const geoData = await geoRes.json();

      if (geoData && geoData.length > 0) {
        lat = parseFloat(geoData[0].lat);
        lon = parseFloat(geoData[0].lon);
        console.log(`📍 Koordinat terdeteksi untuk "${destinationText}":`, lat, lon);
      }

      // 2. Fetch OSRM Routing untuk estimasi jarak, durasi, dan nama jalan
      try {
        const osrmRes = await fetch(
          `https://router.project-osrm.org/route/v1/driving/-87.6298,41.8781;${lon},${lat}?overview=false`
        );
        const osrmData = await osrmRes.json();

        if (osrmData.routes && osrmData.routes.length > 0) {
          const route = osrmData.routes[0];
          const duration = Math.round(route.duration / 60);
          const distance = (route.distance / 1000).toFixed(1);
          const roadName = route.legs[0]?.summary || `Route to ${destinationText.split(',')[0]}`;

          setRouteInfo({
            viaRoad: `Via ${roadName}`,
            durationMin: duration,
            distanceKm: `${distance} km`,
          });
        }
      } catch (osrmErr) {
        console.warn("OSRM routing warning, using fallback string:", osrmErr);
      }

      // 3. Kirim lat & lon aktual ke backend ML FastAPI
      const currentISO = new Date().toISOString().split('.')[0];
      const response = await fetch(
        `http://localhost:8000/risk-score?lat=${lat}&lon=${lon}&datetime=${encodeURIComponent(currentISO)}`,
        {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        }
      );

      if (!response.ok) throw new Error('Gagal terhubung ke API Risk Score');

      const data = await response.json();
      console.log('Response dari FastAPI ML:', data);

      setApiRiskData(data);
      setHasSearched(true);
    } catch (error) {
      console.error('Error fetching risk score, menggunakan fallback:', error);
      setHasSearched(true); 
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans flex flex-col overflow-x-hidden">
      
      {/* 🔴 FIXED NAVBAR ATAS */}
      <header className="fixed top-0 left-0 right-0 h-[72px] z-50 bg-white border-b border-gray-200">
        <Navbar />
      </header>

      {/* KONTEN UTAMA */}
      <div className="flex flex-col lg:flex-row flex-1 h-screen pt-[72px] overflow-hidden"> 
        
        {/* PANEL KIRI: Form & Hasil Rute */}
        <div className="w-full lg:w-[420px] bg-white p-5 border-r border-gray-200 flex flex-col justify-between z-10 shadow-lg overflow-y-auto max-h-full">
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
                
                <input
                  type="text"
                  value={originText}
                  onChange={(e) => setOriginText(e.target.value)}
                  placeholder="Where are you starting from?"
                  className="w-full text-sm font-semibold text-gray-800 bg-transparent outline-none placeholder-gray-400"
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

                <input
                  type="text"
                  value={destinationText}
                  onChange={(e) => setDestinationText(e.target.value)}
                  placeholder="Where are you going?"
                  className="w-full text-sm font-semibold text-gray-800 bg-transparent outline-none placeholder-gray-400 focus:placeholder-gray-300"
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
                  <span className="animate-spin">⏳</span> ANALYZING RISK...
                </>
              ) : (
                'FIND ROUTES'
              )}
            </button>

            {/* HASIL RUTE DARI API */}
            {hasSearched && (
              <div className="flex flex-col gap-3.5 animate-fadeIn">
                
                {/* A. TIME RISK WARNING CARD */}
                <div className="bg-[#FFF4D3] border border-[#F5E0A3] rounded-xl p-3.5 flex gap-2.5 items-start">
                  <span className="text-sm font-extrabold text-black mt-0.5">⚠️</span>
                  <div>
                    <h4 className="text-xs font-black tracking-wide text-black uppercase mb-1">
                      TIME RISK WARNING
                    </h4>
                    <p className="text-[11px] text-gray-800 font-medium leading-snug">
                      Risk level for this route is higher after 21:00 on weekends. Consider leaving earlier or choosing an alternative route.
                    </p>
                  </div>
                </div>

                {/* B. ROUTE CARD (DINAMIS & BEBAS ERROR) */}
                {(() => {
                  const riskScore = apiRiskData?.risk_score ?? 0;
                  const level = apiRiskData?.level || 'Low';
                  const safetyPercentage = getSafetyPercentage(riskScore);

                  let cardBg = 'bg-[#E2F7E9] border-[#C3E8CE]';
                  let badgeColor = 'text-[#15803D]';
                  let badgeText = `Safe ${safetyPercentage}%`;
                  let titleText = 'Safe Route (Recommended)';
                  let showCaution = false;
                  let btnBg = 'bg-[#16A34A] hover:bg-[#15803D]';

                  if (level === 'Medium') {
                    cardBg = 'bg-amber-50/80 border-amber-200';
                    badgeColor = 'text-amber-800';
                    badgeText = `Moderate Risk (${Math.round(riskScore)}%)`;
                    titleText = 'Moderate Route';
                    btnBg = 'bg-amber-600 hover:bg-amber-700';
                  } else if (level === 'High' || level === 'Very High') {
                    cardBg = 'bg-rose-50 border-rose-200';
                    badgeColor = 'text-rose-800';
                    badgeText = `High Risk (${Math.round(riskScore)}%)`;
                    titleText = 'Safest Available Route';
                    showCaution = true;
                    btnBg = 'bg-rose-600 hover:bg-rose-700';
                  }

                  const displayRoad = routeInfo?.viaRoad || `Via Main Route to ${destinationText.split(',')[0]}`;
                  const displayTimeDist = routeInfo 
                    ? `${routeInfo.durationMin} min (${routeInfo.distanceKm})` 
                    : '10 min (2.2 km)';

                  return (
                    <div className={`${cardBg} border rounded-xl p-4 flex flex-col justify-between transition-colors shadow-sm`}>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-bold text-gray-900">
                            {titleText}
                          </h4>
                          {showCaution && (
                            <span className="text-[10px] bg-rose-200 text-rose-900 px-2 py-0.5 rounded-full font-extrabold uppercase">
                              ⚠️ {level} Risk
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

                        <p className="text-[11px] text-gray-600 font-medium mb-3">
                          Risk Assessment: <strong className="capitalize">{level}</strong> • Well-lit main route
                        </p>
                      </div>

                      <button className={`w-full ${btnBg} text-white font-bold py-2.5 rounded-lg text-xs uppercase tracking-wider transition-colors cursor-pointer`}>
                        START NAVIGATION
                      </button>
                    </div>
                  );
                })()}

                {/* C. FASTEST ROUTE CARD */}
                <div className="bg-[#FDE8F3] border border-[#F9CBE2] rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-[#831843] mb-1">
                      Fastest Route
                    </h4>
                    <div className="border-b border-black/20 pb-1 mb-2">
                      <p className="text-sm font-extrabold text-black truncate">
                        Via {destinationText.split(',')[0]} Alleys
                      </p>
                    </div>
                    <p className="text-sm font-black text-black mb-1">
                      {routeInfo ? `${Math.max(1, routeInfo.durationMin - 4)} min` : '6 min'} <span className="font-normal">|</span> <span className="text-[#9D174D]">Moderate Risk (72%)</span>
                    </p>
                    <p className="text-[11px] text-gray-600 font-medium mb-3">
                      Shorter route with narrow &amp; quieter roads • Passes 1 dimly lit ...
                    </p>
                  </div>
                  <button className="w-full bg-[#D91176] hover:bg-[#b80d63] text-white font-bold py-2.5 rounded-lg text-xs uppercase tracking-wider transition-colors cursor-pointer">
                    START NAVIGATION
                  </button>
                </div>

                {/* D. DISCLAIMER DATASET */}
                <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-xl text-[10px] text-gray-500 leading-relaxed">
                  <p className="font-bold text-gray-700 mb-0.5">📌 Catatan Model Risk Assessment:</p>
                  {apiRiskData?.disclaimer || "Estimasi berbasis pola kejahatan historis (dataset Chicago Open Data) sebagai bentuk simulasi Proof of Concept."}
                </div>

              </div>
            )}

          </div>

          {/* TEKS PANDUAN AWAL */}
          {!hasSearched && (
            <div className="text-center py-6 border-t border-gray-100 mt-4">
              <div className="w-14 h-14 mx-auto mb-2 bg-gray-50 rounded-full flex items-center justify-center text-2xl border border-gray-200">
                🗺️
              </div>
              <h3 className="font-bold text-gray-800 text-sm mb-1">Ready for a safe journey?</h3>
              <p className="text-xs text-gray-500 leading-relaxed px-2">
                Enter your destination above to preview safety ratings, well-lit paths, and real-time risk assessments for your route.
              </p>
            </div>
          )}

        </div>

        {/* PANEL KANAN: Peta */}
        <div className="flex-1 w-full h-[calc(100vh-72px)] bg-gray-100 relative z-0">
          <SafeRouteMap />
        </div>

      </div>
    </div>
  );
}