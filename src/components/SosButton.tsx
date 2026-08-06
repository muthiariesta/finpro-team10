'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import SosModal from './SosModal';

/**
 * Tombol SOS yang harus ditahan tiga detik.
 *
 * Menahan, bukan sekali tekan, karena tombol ini memicu perekaman suara dan
 * pengiriman lokasi ke orang lain. Tersenggol di dalam tas atau saku tidak
 * boleh cukup untuk memulainya. Lingkaran kemajuan memberi tahu berapa lama
 * lagi harus ditahan, sekaligus memberi kesempatan membatalkan.
 */

const HOLD_MS = 3000;
const TICK_MS = 50;

export default function SosButton() {
  const [progress, setProgress] = useState(0);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopHolding = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setProgress(0);
  }, []);

  const startHolding = useCallback(() => {
    if (timerRef.current || open) return;
    const startedAt = Date.now();

    timerRef.current = setInterval(() => {
      const ratio = Math.min(1, (Date.now() - startedAt) / HOLD_MS);
      setProgress(ratio);
      if (ratio >= 1) {
        stopHolding();
        setOpen(true);
      }
    }, TICK_MS);
  }, [open, stopHolding]);

  useEffect(() => stopHolding, [stopHolding]);

  const held = Math.round(progress * 100);
  const remaining = Math.max(0, Math.ceil((HOLD_MS * (1 - progress)) / 1000));

  return (
    <>
      <button
        type="button"
        onMouseDown={startHolding}
        onMouseUp={stopHolding}
        onMouseLeave={stopHolding}
        onTouchStart={startHolding}
        onTouchEnd={stopHolding}
        onTouchCancel={stopHolding}
        onContextMenu={(e) => e.preventDefault()}
        aria-label="Hold for 3 seconds to trigger SOS"
        title="Hold for 3 seconds"
        className="relative overflow-hidden bg-[#E03A3A] hover:bg-red-700 text-white flex items-center gap-2 px-5 py-2 rounded-full font-bold text-sm transition-colors shadow-sm cursor-pointer select-none"
      >
        {/* Lapisan kemajuan tahan-tekan */}
        <span
          className="absolute inset-y-0 left-0 bg-red-900/50 pointer-events-none transition-[width] duration-75 ease-linear"
          style={{ width: `${held}%` }}
        />
        <TriangleAlert className="w-4 h-4 relative" strokeWidth={3} />
        <span className="relative tabular-nums">
          {progress > 0 ? `HOLD ${remaining}s` : 'SOS'}
        </span>
      </button>

      {open && <SosModal onClose={() => setOpen(false)} />}
    </>
  );
}
