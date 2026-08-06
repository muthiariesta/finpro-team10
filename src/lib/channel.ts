'use client';

import { useEffect, useState } from 'react';

/**
 * Jalur pengiriman peringatan: WhatsApp atau SMS.
 *
 * WhatsApp lebih kaya - bisa memuat tautan pelacakan yang bisa diketuk - tapi
 * menuntut data seluler. SMS jauh lebih sederhana namun tetap sampai saat
 * sinyal data hilang. PRD menyebut jalur cadangan SMS sebagai acceptance
 * criteria, bukan fitur tambahan, karena justru di kondisi terburuk itulah
 * permintaan tolong harus tetap terkirim.
 */

export type AlertChannel = 'whatsapp' | 'sms';

const KEY = 'safeher-alert-channel';
const EVENT = 'safeher-channel-change';

export function getChannel(): AlertChannel {
  if (typeof window === 'undefined') return 'whatsapp';
  return localStorage.getItem(KEY) === 'sms' ? 'sms' : 'whatsapp';
}

export function setChannel(channel: AlertChannel) {
  localStorage.setItem(KEY, channel);
  // Disiarkan agar navbar dan halaman lain ikut berubah tanpa perlu refresh.
  window.dispatchEvent(new CustomEvent(EVENT, { detail: channel }));
}

/** Membaca jalur aktif sekaligus ikut berubah saat pengguna menggantinya. */
export function useAlertChannel(): [AlertChannel, (c: AlertChannel) => void] {
  // Nilai awal disamakan dengan render server agar tidak terjadi hydration
  // mismatch; nilai sebenarnya dibaca setelah komponen terpasang.
  const [channel, setLocal] = useState<AlertChannel>('whatsapp');

  useEffect(() => {
    setLocal(getChannel());

    const onChange = (e: Event) => setLocal((e as CustomEvent).detail as AlertChannel);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setLocal(getChannel());
    };

    window.addEventListener(EVENT, onChange);
    // Tab lain di peramban yang sama juga ikut sinkron.
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return [channel, setChannel];
}
