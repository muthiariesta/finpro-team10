'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, MapPin } from 'lucide-react';
import type { LatLng } from '@/lib/riskApi';

/**
 * Kolom lokasi dengan saran alamat.
 *
 * Saran diambil dari Nominatim sambil mengetik, dengan jeda 400 ms sebelum
 * dikirim. Nominatim membatasi satu permintaan per detik, jadi mengirim
 * setiap ketukan tombol akan membuat alamat IP diblokir.
 *
 * Memilih dari daftar juga sekaligus memberi koordinat, sehingga pencarian
 * rute tidak perlu melakukan geocoding ulang dan hasilnya pasti sama dengan
 * tempat yang dilihat pengguna.
 *
 * Daftar saran dipasang lewat portal ke <body>, bukan sebagai anak dari
 * kolom input. Panel kiri memakai overflow-y-auto sehingga elemen absolut
 * yang menjulur keluar akan terpotong, sementara peta Leaflet membangun
 * stacking context sendiri yang menutupi apa pun di panel. Portal dengan
 * posisi fixed melepaskan diri dari keduanya.
 */

const DEBOUNCE_MS = 400;
const MIN_CHARS = 3;

export interface PlaceSuggestion {
  label: string;
  coords: LatLng;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** Dipanggil saat pengguna memilih salah satu saran. */
  onSelect?: (place: PlaceSuggestion) => void;
  placeholder?: string;
  icon?: React.ReactNode;
}

export default function LocationInput({
  value,
  onChange,
  onSelect,
  placeholder,
  icon,
}: Props) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  /** Menandai perubahan yang berasal dari pemilihan, bukan ketikan. */
  const skipNextFetch = useRef(false);
  /** Posisi daftar di layar; dihitung ulang saat digulir atau ukuran berubah. */
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideInput = containerRef.current?.contains(target);
      // Daftar berada di luar pohon komponen karena dipasang lewat portal,
      // jadi keanggotaannya harus diperiksa terpisah.
      const insideList = listRef.current?.contains(target);
      if (!insideInput && !insideList) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;

    const measure = () => {
      const el = containerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.bottom + 8, left: r.left, width: r.width });
    };

    measure();
    // Menangkap gulir di panel mana pun, karena panel kiri punya
    // pengguliran sendiri yang tidak memicu event scroll pada window.
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [open, suggestions.length]);

  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }

    const query = value.trim();
    if (query.length < MIN_CHARS) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&q=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );
        const data = await res.json();
        const next: PlaceSuggestion[] = Array.isArray(data)
          ? data.map((item: { display_name: string; lat: string; lon: string }) => ({
              label: item.display_name,
              coords: [parseFloat(item.lat), parseFloat(item.lon)] as LatLng,
            }))
          : [];
        setSuggestions(next);
        setActiveIndex(-1);
        if (next.length > 0) setOpen(true);
      } catch {
        // Permintaan yang dibatalkan atau jaringan bermasalah cukup
        // menghasilkan daftar kosong; pengguna tetap bisa mengetik bebas.
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [value]);

  const choose = (place: PlaceSuggestion) => {
    skipNextFetch.current = true;
    onChange(place.label);
    onSelect?.(place);
    setOpen(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      choose(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full text-sm font-semibold text-gray-800 bg-transparent outline-none placeholder-gray-400"
        />
        {loading && <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin shrink-0" />}
      </div>

      {mounted &&
        open &&
        suggestions.length > 0 &&
        rect &&
        createPortal(
          <ul
            ref={listRef}
            style={{
              position: 'fixed',
              top: rect.top,
              left: rect.left,
              width: rect.width,
              // Di atas panel Leaflet (400-700) dan kontrolnya (1000).
              zIndex: 2000,
            }}
            className="bg-white rounded-xl border border-gray-200 shadow-xl max-h-64 overflow-y-auto"
          >
            {suggestions.map((place, i) => (
              <li key={`${place.label}-${i}`}>
                <button
                  type="button"
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => choose(place)}
                  className={`w-full text-left px-3 py-2 flex items-start gap-2 transition-colors ${
                    i === activeIndex ? 'bg-pink-50' : 'hover:bg-gray-50'
                  }`}
                >
                  {icon ?? <MapPin className="w-3.5 h-3.5 text-[#D91176] shrink-0 mt-0.5" />}
                  <span className="text-xs text-gray-700 leading-snug">{place.label}</span>
                </button>
              </li>
            ))}
          </ul>,
          document.body
        )}
    </div>
  );
}
