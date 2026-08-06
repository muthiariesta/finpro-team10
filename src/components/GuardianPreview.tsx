'use client';

import { CircleX, ExternalLink, MapPin, PhoneCall, Siren } from 'lucide-react';

/**
 * Pratinjau pesan yang diterima kontak darurat.
 *
 * Ini simulasi, dan disebut simulasi secara terbuka di kepala panelnya.
 * Gunanya membantu pengguna memahami apa yang akan dilihat orang terdekatnya
 * saat SOS ditekan, tanpa berpura-pura ada pesan yang benar-benar terkirim.
 */

interface Props {
  /** Jalur pengiriman; SMS tampil polos tanpa tombol aksi. */
  channel: 'whatsapp' | 'sms';
  coords: { lat: number; lon: number } | null;
  trackingUrl: string;
  contactName?: string;
  onClose: () => void;
}

export default function GuardianPreview({
  channel,
  coords,
  trackingUrl,
  contactName,
  onClose,
}: Props) {
  const isSms = channel === 'sms';
  const mapsUrl = coords
    ? `https://www.google.com/maps?q=${coords.lat},${coords.lon}`
    : null;
  const time = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());

  return (
    <div className="fixed inset-0 z-[110] bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Kepala panel menyatakan terus terang bahwa ini pratinjau */}
        <div className="bg-gray-900 text-white px-4 py-2.5 flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
              Simulation Preview
            </p>
            <p className="text-xs font-semibold truncate">
              What {contactName ?? 'your guardian'} would receive via{' '}
              {isSms ? 'SMS' : 'WhatsApp'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="text-gray-400 hover:text-white transition-colors shrink-0"
          >
            <CircleX className="w-5 h-5" />
          </button>
        </div>

        {/* Latar khas ruang obrolan */}
        <div className={`p-4 overflow-y-auto flex-1 ${isSms ? 'bg-gray-100' : 'bg-[#ECE5DD]'}`}>
          <div className="bg-white rounded-xl rounded-tl-sm shadow-sm overflow-hidden">
            <div className="bg-red-600 text-white px-3.5 py-2.5 flex items-center gap-2">
              <Siren className="w-4 h-4 shrink-0" />
              <span className="text-xs font-black tracking-wide">SafeHer EMERGENCY ALERT</span>
            </div>

            <div className="px-3.5 py-3 space-y-2.5">
              <p className="text-[13px] text-gray-800 leading-relaxed">
                Someone who listed you as an emergency contact has triggered an SOS.
              </p>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Last known location
                </p>
                <p className="text-xs font-semibold text-gray-900 flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#D91176] shrink-0 mt-0.5" />
                  {coords
                    ? `${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}`
                    : 'Location unavailable'}
                </p>
              </div>

              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs font-semibold text-blue-600 hover:underline break-all"
                >
                  {mapsUrl}
                </a>
              )}

              <div className="border-t border-gray-100 pt-2.5">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Live tracking link
                </p>
                <a
                  href={trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-blue-600 hover:underline break-all flex items-start gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  {trackingUrl}
                </a>
              </div>

              <p className="text-[13px] text-gray-800 font-semibold">
                Please try to reach them immediately.
              </p>

              <p className="text-[10px] text-gray-400 text-right">{time}</p>
            </div>
          </div>

          {isSms && (
            <p className="mt-3 text-[10px] text-gray-500 leading-relaxed">
              Sent as plain text so it still arrives without a data connection.
              Links are not clickable in every SMS app, so the coordinates are
              written out in full.
            </p>
          )}

          {/* Aksi yang biasanya diambil penerima; hanya ada pada WhatsApp */}
          {!isSms && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled
              className="bg-white text-gray-700 border border-gray-200 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 opacity-80 cursor-default"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              Call her
            </button>
            <a
              href={trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#20B08E] hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <MapPin className="w-3.5 h-3.5" />
              Open tracking
            </a>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
