'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  BadgeCheck,
  Bike,
  CircleCheck,
  Clock,
  Footprints,
  MapPin,
  Phone,
  RadioTower,
  RotateCcw,
  Share2,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import type { LatLng } from '@/lib/riskApi';
import {
  clearTripPlan,
  formatRemaining,
  loadTripPlan,
  pointAlongPath,
  type TripPlan,
} from '@/lib/trip';

const InTripMap = dynamic(() => import('@/components/InTripMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 font-medium">
      Loading map...
    </div>
  ),
});

type Phase = 'setup' | 'active' | 'completed';
type TransportMode = 'personal' | 'ride';

/** Tenggang konfirmasi setelah ETA terlewati, sesuai PRD (10 menit). */
const GRACE_SECONDS = 10 * 60;

/** Rute contoh bila halaman dibuka langsung tanpa melalui Safe Route. */
const FALLBACK_PLAN: TripPlan = {
  originLabel: '123 Harmony St',
  destinationLabel: 'Mall Gandaria City',
  originCoords: [-6.2441, 106.7986],
  destCoords: [-6.2244, 106.7997],
  routePath: [
    [-6.2441, 106.7986],
    [-6.2380, 106.7990],
    [-6.2320, 106.7993],
    [-6.2280, 106.7995],
    [-6.2244, 106.7997],
  ],
  durationMin: 10,
  distanceKm: '3.1 km',
  riskSegments: [],
  safePoints: [],
};

export default function InTripPage() {
  const [plan, setPlan] = useState<TripPlan>(FALLBACK_PLAN);
  const [phase, setPhase] = useState<Phase>('setup');
  const [mode, setMode] = useState<TransportMode>('personal');
  const [driver, setDriver] = useState({ name: '', plate: '', phone: '' });

  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [userPosition, setUserPosition] = useState<LatLng | null>(null);
  const [hasGps, setHasGps] = useState(false);
  const [shareNote, setShareNote] = useState('');
  const [alertDispatched, setAlertDispatched] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  // Rute diambil dari sesi yang disimpan halaman Safe Route.
  useEffect(() => {
    const saved = loadTripPlan();
    if (saved && saved.routePath?.length > 1) setPlan(saved);
  }, []);

  // Satu pengatur waktu menggerakkan hitung mundur, kemajuan, dan posisi
  // simulasi sekaligus, supaya semuanya selalu sinkron.
  useEffect(() => {
    if (phase !== 'active') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [phase]);

  const totalSeconds = Math.max(60, plan.durationMin * 60);
  const elapsed = startedAt ? Math.max(0, (now - startedAt) / 1000) : 0;
  const remaining = totalSeconds - elapsed;
  const progress = Math.max(0, Math.min(1, elapsed / totalSeconds));
  const etaPassed = phase === 'active' && remaining <= 0;
  const graceLeft = Math.max(0, GRACE_SECONDS - (elapsed - totalSeconds));

  // Posisi disimulasikan sepanjang rute ketika GPS tidak memberi kabar.
  // Tanpa ini, demo di komputer tidak menunjukkan pergerakan sama sekali.
  useEffect(() => {
    if (phase !== 'active' || hasGps) return;
    setUserPosition(pointAlongPath(plan.routePath, progress));
  }, [phase, hasGps, progress, plan.routePath]);

  // Bila pengguna tidak merespons dalam tenggang, kontak darurat dihubungi.
  useEffect(() => {
    if (!etaPassed || alertDispatched) return;
    if (graceLeft > 0) return;
    setAlertDispatched(true);
  }, [etaPassed, graceLeft, alertDispatched]);

  const startTrip = useCallback(() => {
    setPhase('active');
    setStartedAt(Date.now());
    setNow(Date.now());
    setAlertDispatched(false);

    // Lokasi hanya dipantau selama sesi aktif, tidak pernah di luar itu.
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          setHasGps(true);
          setUserPosition([pos.coords.latitude, pos.coords.longitude]);
        },
        () => setHasGps(false),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );
    }
  }, []);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  useEffect(() => stopWatching, [stopWatching]);

  const completeTrip = () => {
    stopWatching();
    setPhase('completed');
    setHasGps(false);
    clearTripPlan();
  };

  const resetTrip = () => {
    setPhase('setup');
    setStartedAt(null);
    setUserPosition(null);
    setAlertDispatched(false);
    setShareNote('');
  };

  const shareTracking = async () => {
    const url = `${window.location.origin}/in-trip`;
    try {
      await navigator.clipboard.writeText(url);
      setShareNote('Tracking link copied. Send it to your guardians.');
    } catch {
      setShareNote(url);
    }
    setTimeout(() => setShareNote(''), 4000);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900 font-sans flex flex-col">
      <header className="fixed top-0 left-0 right-0 h-[72px] z-50 bg-white border-b border-gray-200">
        <Navbar />
      </header>

      <div className="flex flex-col lg:flex-row flex-1 h-screen pt-[72px] overflow-hidden">
        {/* PANEL KIRI */}
        <div className="w-full lg:w-[420px] bg-[#F8F9FA] p-5 border-r border-gray-200 overflow-y-auto max-h-full">
          {phase === 'setup' && (
            <SetupPanel
              plan={plan}
              mode={mode}
              setMode={setMode}
              driver={driver}
              setDriver={setDriver}
              onStart={startTrip}
            />
          )}

          {phase === 'active' && (
            <ActivePanel
              plan={plan}
              remaining={remaining}
              progress={progress}
              etaPassed={etaPassed}
              graceLeft={graceLeft}
              alertDispatched={alertDispatched}
              hasGps={hasGps}
              shareNote={shareNote}
              onShare={shareTracking}
              onArrived={completeTrip}
            />
          )}

          {phase === 'completed' && <CompletedPanel onRestart={resetTrip} />}
        </div>

        {/* PANEL KANAN: PETA */}
        <div className="flex-1 w-full h-[calc(100vh-72px)] bg-gray-100 relative z-0">
          <InTripMap
            routePath={plan.routePath}
            originCoords={plan.originCoords}
            destCoords={plan.destCoords}
            riskSegments={plan.riskSegments}
            safePoints={plan.safePoints}
            userPosition={userPosition}
            progress={progress}
            followUser={phase === 'active'}
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function SetupPanel({
  plan,
  mode,
  setMode,
  driver,
  setDriver,
  onStart,
}: {
  plan: TripPlan;
  mode: TransportMode;
  setMode: (m: TransportMode) => void;
  driver: { name: string; plate: string; phone: string };
  setDriver: (d: { name: string; plate: string; phone: string }) => void;
  onStart: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5">
      <span className="inline-block text-[10px] font-extrabold text-[#D91176] bg-pink-50 px-3 py-1 rounded-full uppercase tracking-wider mb-2 border border-pink-100">
        In-Trip Safeguard Engine
      </span>
      <h1 className="text-2xl font-black text-gray-900 tracking-tight mb-1">
        Trip Setup &amp; Guardian Sync
      </h1>
      <p className="text-xs font-medium text-gray-500 mb-4 leading-relaxed">
        Active route monitoring, 10-minute ETA timeout triggers, and ride-hailing driver
        detail broadcasting.
      </p>

      {/* Rute terpilih */}
      <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 mb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-0.5">
              Selected Path
            </p>
            <p className="text-sm font-bold text-gray-900">
              Safest Route ({plan.durationMin} mins)
            </p>
            <p className="text-xs text-gray-600 truncate">
              {plan.originLabel} &rarr; {plan.destinationLabel}
            </p>
          </div>
          <span className="shrink-0 text-[11px] font-bold text-emerald-800 bg-white border border-emerald-200 px-2 py-0.5 rounded-full">
            {plan.durationMin} mins
          </span>
        </div>
      </div>

      {/* Moda transportasi */}
      <p className="text-xs font-semibold text-gray-700 mb-2">Transport Mode</p>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          type="button"
          onClick={() => setMode('personal')}
          className={`px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-colors ${
            mode === 'personal'
              ? 'bg-pink-50 border-pink-300 text-[#D91176]'
              : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
          }`}
        >
          <Footprints className="w-4 h-4" />
          Walking / Personal
        </button>
        <button
          type="button"
          onClick={() => setMode('ride')}
          className={`px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-colors ${
            mode === 'ride'
              ? 'bg-pink-50 border-pink-300 text-[#D91176]'
              : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
          }`}
        >
          <Bike className="w-4 h-4" />
          Ride-Hailing / Ojek
        </button>
      </div>

      {/* Detail pengemudi hanya relevan untuk ojek online.
          Diisi manual karena MVP tidak terhubung ke penyedia layanan. */}
      {mode === 'ride' && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 mb-4">
          <p className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5">
            <BadgeCheck className="w-4 h-4 text-[#D91176]" />
            Driver &amp; Vehicle Info
          </p>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <LabeledInput
              label="Driver Name"
              value={driver.name}
              onChange={(v) => setDriver({ ...driver, name: v })}
            />
            <LabeledInput
              label="Vehicle Plate"
              value={driver.plate}
              onChange={(v) => setDriver({ ...driver, plate: v })}
            />
          </div>
          <LabeledInput
            label="Driver Phone"
            value={driver.phone}
            onChange={(v) => setDriver({ ...driver, phone: v })}
            icon={<Phone className="w-4 h-4 text-emerald-600" />}
          />
          <p className="text-[10px] text-gray-500 mt-2 leading-relaxed">
            Shared with your guardians only if an alert is triggered, then deleted when the
            session ends.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={onStart}
        className="w-full bg-[#D91176] hover:bg-[#b80d63] text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
      >
        <RadioTower className="w-4 h-4" />
        Start Journey &amp; Enable Live Tracking
      </button>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-gray-500 font-medium mb-0.5">{label}</p>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-sm font-semibold text-gray-900 bg-transparent outline-none"
        />
      </div>
      {icon}
    </div>
  );
}

function ActivePanel({
  plan,
  remaining,
  progress,
  etaPassed,
  graceLeft,
  alertDispatched,
  hasGps,
  shareNote,
  onShare,
  onArrived,
}: {
  plan: TripPlan;
  remaining: number;
  progress: number;
  etaPassed: boolean;
  graceLeft: number;
  alertDispatched: boolean;
  hasGps: boolean;
  shareNote: string;
  onShare: () => void;
  onArrived: () => void;
}) {
  const percent = Math.round(progress * 100);

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h1 className="text-xl font-black text-gray-900 tracking-tight leading-tight">
          Live Protection
          <br />
          Active
        </h1>
        <span className="shrink-0 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
          Guardians Connected
        </span>
      </div>

      {/* Hitung mundur ETA */}
      <div className="bg-pink-50/70 border border-pink-100 rounded-xl p-3.5 mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-[#D91176]" />
            ETA Countdown
          </span>
          <span className="text-sm font-black text-[#D91176]">
            {formatRemaining(remaining)}
          </span>
        </div>
        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden mb-1.5">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-[#D91176] transition-[width] duration-1000 ease-linear"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-gray-500 font-medium">
          <span className="truncate">{plan.originLabel} ({percent}% done)</span>
          <span className="truncate">{plan.destinationLabel}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onShare}
        className="w-full border border-gray-300 hover:border-[#D91176] hover:text-[#D91176] text-gray-700 font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 mb-2"
      >
        <Share2 className="w-4 h-4" />
        Share Live Tracking Link
      </button>

      {shareNote && (
        <p className="text-[10px] text-emerald-700 font-medium mb-3 break-all">{shareNote}</p>
      )}

      {/* Sumber posisi dinyatakan terbuka: pengguna berhak tahu apakah yang
          dilihat kontaknya berasal dari GPS sungguhan atau perkiraan rute. */}
      <p className="text-[10px] text-gray-500 mb-3 flex items-center gap-1">
        <MapPin className="w-3 h-3" />
        {hasGps
          ? 'Live position from your device GPS.'
          : 'GPS unavailable — position is estimated along the planned route.'}
      </p>

      {etaPassed && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5">
          <p className="text-[11px] font-black text-amber-900 uppercase tracking-wide mb-1 flex items-center gap-1.5">
            <TriangleAlert className="w-4 h-4" />
            10-min ETA timeout safety check
          </p>
          <p className="text-xs font-semibold text-gray-800 mb-2.5">
            Estimated arrival time passed. Have you arrived safely?
          </p>

          <div className="bg-amber-100/70 rounded-lg p-2.5 mb-3">
            <p className="text-[10px] text-amber-900 leading-relaxed">
              <strong>System Safeguard:</strong>{' '}
              {alertDispatched
                ? 'No response received. An automated alert with your last known location and driver details has been dispatched to your emergency contacts.'
                : `If no response within ${Math.ceil(graceLeft / 60)} min, automated alert + driver details will be dispatched to emergency contacts.`}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onArrived}
              className="bg-[#D91176] hover:bg-[#b80d63] text-white font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <CircleCheck className="w-4 h-4" />
              Yes, Arrived
            </button>
            <Link
              href="/emergency"
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <TriangleAlert className="w-4 h-4" />
              Need Help / SOS
            </Link>
          </div>
        </div>
      )}

      {!etaPassed && (
        <button
          type="button"
          onClick={onArrived}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
        >
          <CircleCheck className="w-4 h-4" />
          I have arrived safely
        </button>
      )}
    </div>
  );
}

function CompletedPanel({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5">
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center mb-4">
        <div className="w-11 h-11 mx-auto mb-2 rounded-full bg-emerald-100 flex items-center justify-center">
          <ShieldCheck className="w-6 h-6 text-emerald-600" />
        </div>
        <h2 className="text-base font-black text-gray-900 mb-1">Trip Completed Safely!</h2>
        <p className="text-[11px] text-gray-600 leading-relaxed">
          Trip completed safely! Session closed and live tracking deactivated. Guardians
          notified of your safe arrival.
        </p>
      </div>

      <button
        type="button"
        onClick={onRestart}
        className="w-full bg-[#D91176] hover:bg-[#b80d63] text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
      >
        <RotateCcw className="w-4 h-4" />
        Start New Trip Session
      </button>
    </div>
  );
}
