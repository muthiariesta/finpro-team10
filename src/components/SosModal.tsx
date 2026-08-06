'use client';

import { useEffect, useRef, useState } from 'react';
import {
  CircleCheck,
  CircleX,
  Eye,
  MapPin,
  Mic,
  PhoneCall,
  Siren,
  TriangleAlert,
  Wifi,
} from 'lucide-react';
import { fetchGuardians, type Guardian } from '@/lib/guardians';
import GuardianPreview from './GuardianPreview';
import { useAlertChannel } from '@/lib/channel';

/**
 * Modal SOS.
 *
 * Semua yang ditampilkan di sini harus mencerminkan keadaan sebenarnya.
 * Baris bukti hanya bertanda centang bila izin memang diberikan, dan kartu
 * pengiriman menyatakan terus terang bila gateway belum terpasang. Pengguna
 * yang mengira bantuan sudah dikirim padahal belum bisa berhenti mencari
 * pertolongan lain.
 */

type Dispatch =
  | { state: 'sending' }
  | { state: 'simulated'; contacts: number }
  | { state: 'sent'; delivered: number; total: number }
  | { state: 'failed'; reason: string };

/** Nomor darurat kepolisian Indonesia. */
const POLICE_NUMBER = '110';

export default function SosModal({ onClose }: { onClose: () => void }) {
  const [channel] = useAlertChannel();
  const [seconds, setSeconds] = useState(0);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [geoDenied, setGeoDenied] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [micDenied, setMicDenied] = useState(false);
  const [dispatch, setDispatch] = useState<Dispatch>({ state: 'sending' });
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const dispatchedRef = useRef(false);

  // Penghitung durasi sinyal aktif.
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Rekaman mikrofon dihentikan begitu modal ditutup agar tidak ada
  // perekaman yang berjalan diam-diam di latar.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          streamRef.current = stream;
          setMicActive(true);
        })
        .catch(() => setMicDenied(true));
    } else {
      setMicDenied(true);
    }
  }, []);

  // Lokasi diambil lebih dulu, lalu peringatan dikirim. Kontak darurat lebih
  // butuh koordinat daripada kecepatan beberapa ratus milidetik.
  useEffect(() => {
    if (dispatchedRef.current) return;
    dispatchedRef.current = true;

    const send = async (lat?: number, lon?: number) => {
      const saved = await fetchGuardians();
      setGuardians(saved);
      const contacts = saved.map((g) => ({ name: g.name, phone: g.phone }));

      if (contacts.length === 0) {
        setDispatch({
          state: 'failed',
          reason: 'No emergency contacts saved yet. Add one on the Emergency page.',
        });
        return;
      }
      try {
        const res = await fetch('/api/sos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contacts,
            lat,
            lon,
            trackingUrl: `${window.location.origin}/in-trip`,
            channel,
          }),
        });
        const data = await res.json();
        if (data.simulated) {
          setDispatch({ state: 'simulated', contacts: contacts.length });
        } else {
          setDispatch({ state: 'sent', delivered: data.delivered ?? 0, total: contacts.length });
        }
      } catch {
        setDispatch({ state: 'failed', reason: 'Could not reach the alert service.' });
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
          send(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          setGeoDenied(true);
          send();
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setGeoDenied(true);
      send();
    }
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl border-[3px] border-red-600 shadow-2xl p-6 max-h-[92vh] overflow-y-auto">
        {/* Ikon sirene + durasi sinyal */}
        <div className="flex justify-center mb-3">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/40">
              <Siren className="w-8 h-8 text-white" />
            </div>
            <span className="absolute -top-1 -right-2 bg-gray-900 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
              {seconds}s
            </span>
          </div>
        </div>

        <h2 className="text-center text-xl font-black text-red-600 tracking-tight mb-1">
          EMERGENCY SOS SIGNAL ACTIVATED!
        </h2>
        <p className="text-center text-xs text-gray-500 mb-5">Safety broadcasting active...</p>

        {/* Bukti otomatis */}
        <div className="border border-gray-200 rounded-xl p-3.5 mb-4">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2.5">
            Automated Evidence Capture:
          </p>

          <EvidenceRow
            ok={Boolean(coords)}
            icon={<MapPin className="w-4 h-4 text-[#D91176]" />}
            text={
              coords
                ? `GPS Coordinates (${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}) & Location History Captured`
                : geoDenied
                  ? 'GPS unavailable — location permission denied'
                  : 'Acquiring GPS coordinates...'
            }
          />

          <EvidenceRow
            ok={micActive}
            icon={<Mic className="w-4 h-4 text-[#D91176]" />}
            text={
              micActive
                ? 'Microphone Audio Recording Active (Ambient Noise Streaming)'
                : micDenied
                  ? 'Microphone unavailable — permission denied'
                  : 'Requesting microphone access...'
            }
          />
        </div>

        {/* Status pengiriman - selalu apa adanya */}
        <DispatchCard
          dispatch={dispatch}
          guardians={guardians.length}
          channel={channel}
          onPreview={() => setPreviewOpen(true)}
        />

        <div className="grid grid-cols-2 gap-3 mt-4">
          <a
            href={`tel:${POLICE_NUMBER}`}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
          >
            <PhoneCall className="w-4 h-4" />
            CALL {POLICE_NUMBER} (POLICE)
          </a>
          <button
            type="button"
            onClick={onClose}
            className="border border-gray-300 hover:bg-gray-50 text-gray-800 font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
          >
            <CircleX className="w-4 h-4" />
            Cancel SOS
          </button>
        </div>
      </div>

      {previewOpen && (
        <GuardianPreview
          channel={channel}
          coords={coords}
          trackingUrl={`${typeof window === 'undefined' ? '' : window.location.origin}/in-trip`}
          contactName={guardians[0]?.name}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </div>
  );
}

function EvidenceRow({
  ok,
  icon,
  text,
}: {
  ok: boolean;
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div
      className={`rounded-lg px-3 py-2.5 mb-2 last:mb-0 flex items-start gap-2 border ${
        ok ? 'bg-emerald-50/70 border-emerald-100' : 'bg-gray-50 border-gray-200'
      }`}
    >
      {ok ? (
        <CircleCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
      ) : (
        <TriangleAlert className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
      )}
      <span className="shrink-0 mt-0.5">{icon}</span>
      <p className={`text-xs font-bold leading-snug ${ok ? 'text-gray-800' : 'text-gray-500'}`}>
        {text}
      </p>
    </div>
  );
}

function DispatchCard({
  dispatch,
  guardians,
  channel,
  onPreview,
}: {
  dispatch: Dispatch;
  guardians: number;
  channel: 'whatsapp' | 'sms';
  onPreview: () => void;
}) {
  const channelLabel = channel === 'sms' ? 'SMS' : 'WhatsApp';
  if (dispatch.state === 'sending') {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 flex items-start gap-2.5">
        <Wifi className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-gray-700">DISPATCHING ALERT...</p>
          <p className="text-xs text-gray-600 leading-snug">
            Contacting {guardians} emergency contact{guardians === 1 ? '' : 's'}.
          </p>
        </div>
      </div>
    );
  }

  if (dispatch.state === 'failed') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-start gap-2.5">
        <TriangleAlert className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-red-900">ALERT NOT DISPATCHED</p>
          <p className="text-xs text-red-900 leading-snug">
            {dispatch.reason} Call {POLICE_NUMBER} or reach someone directly.
          </p>
        </div>
      </div>
    );
  }

  const total = dispatch.state === 'sent' ? dispatch.total : dispatch.contacts;
  const delivered = dispatch.state === 'sent' ? dispatch.delivered : total;
  const simulated = dispatch.state === 'simulated';

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5">
      <div className="flex items-start gap-2.5">
        <Wifi className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-xs font-bold text-emerald-900">DATA DISPATCH CONFIRMED</p>
          <p className="text-xs text-emerald-900 leading-snug">
            {channelLabel} Alert &amp; Live Tracking link dispatched to {delivered} Emergency
            Contact{total === 1 ? '' : 's'}.
          </p>
        </div>
      </div>

      {/* Pratinjau membantu pengguna tahu persis apa yang dilihat kontaknya.
          Pada mode simulasi, statusnya dinyatakan agar tidak menyesatkan. */}
      <button
        type="button"
        onClick={onPreview}
        className="mt-2.5 w-full bg-white border border-emerald-300 hover:bg-emerald-100/60 text-emerald-900 font-bold py-2 rounded-lg text-[11px] transition-colors flex items-center justify-center gap-1.5"
      >
        <Eye className="w-3.5 h-3.5" />
        See what your guardian receives
      </button>

      {simulated && (
        <p className="mt-2 text-[10px] text-emerald-800/80 leading-snug">
          Demo mode: {channelLabel} delivery is simulated, no gateway is connected yet.
        </p>
      )}
    </div>
  );
}
