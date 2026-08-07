'use client';

import { useEffect, useRef, useState } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

/**
 * Lapisan heatmap risiko.
 *
 * Nilainya diambil dari RiskScore API untuk petak wilayah yang sedang
 * terlihat, jadi warnanya benar-benar mewakili data model - bukan hiasan.
 * Konsekuensinya, di wilayah yang tidak tercakup dataset (mis. Indonesia)
 * peta akan tetap polos. Itu memang jawaban yang jujur: lebih baik kosong
 * daripada memberi kesan suatu daerah sudah dinilai padahal belum.
 */

interface HeatPoint {
  lat: number;
  lon: number;
  score: number;
}

interface Props {
  enabled: boolean;
  /** Waktu keberangkatan; risiko berubah menurut jam. */
  datetime: string;
  onStatus?: (status: { loading: boolean; covered: number; total: number }) => void;
}

/** Jeda sebelum mengambil ulang, agar geser peta tidak memicu badai permintaan. */
const DEBOUNCE_MS = 700;

export default function HeatmapLayer({ enabled, datetime, onStatus }: Props) {
  const map = useMap();
  const layerRef = useRef<L.Layer | null>(null);
  const [points, setPoints] = useState<HeatPoint[]>([]);
  /** Dinaikkan setiap peta selesai digeser, memicu pengambilan ulang. */
  const [moveCount, setMoveCount] = useState(0);
  const [pluginReady, setPluginReady] = useState(false);

  /**
   * leaflet.heat ditulis sebelum era modul. Ia tidak mengekspor apa pun dan
   * menempelkan diri pada variabel `L` yang diasumsikan global.
   *
   * Meng-import-nya lewat bundler tidak pernah berhasil: kodenya dijalankan
   * dalam lingkup modul, sehingga `L` di dalamnya tidak pernah teresolusi ke
   * window.L - berapa kali pun window.L disetel lebih dulu. Plugin gagal
   * tanpa pesan apa pun dan L.heatLayer tak pernah muncul.
   *
   * Karena itu berkasnya disalin ke /public dan dimuat lewat tag <script>,
   * yang benar-benar dieksekusi di lingkup global.
   */
  useEffect(() => {
    const win = window as unknown as { L: typeof L };
    win.L = L;

    if (typeof (L as unknown as { heatLayer?: unknown }).heatLayer === 'function') {
      setPluginReady(true);
      return;
    }

    const SCRIPT_ID = 'leaflet-heat-plugin';
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

    const onLoad = () => setPluginReady(true);
    const onError = () => console.error('[heatmap] /vendor/leaflet-heat.js gagal dimuat');

    if (existing) {
      existing.addEventListener('load', onLoad);
      return () => existing.removeEventListener('load', onLoad);
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = '/vendor/leaflet-heat.js';
    script.async = true;
    script.addEventListener('load', onLoad);
    script.addEventListener('error', onError);
    document.head.appendChild(script);

    return () => {
      script.removeEventListener('load', onLoad);
      script.removeEventListener('error', onError);
    };
  }, []);

  useMapEvents({
    moveend: () => setMoveCount((c) => c + 1),
  });

  // Ambil data untuk area yang sedang terlihat.
  useEffect(() => {
    if (!enabled) {
      setPoints([]);
      onStatus?.({ loading: false, covered: 0, total: 0 });
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      const b = map.getBounds();
      onStatus?.({ loading: true, covered: 0, total: 0 });

      try {
        const res = await fetch('/api/risk-grid', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bounds: [b.getSouth(), b.getWest(), b.getNorth(), b.getEast()],
            datetime,
            steps: 8,
          }),
          signal: controller.signal,
        });
        const data = await res.json();
        if (cancelled) return;

        setPoints(data.points ?? []);
        onStatus?.({
          loading: false,
          covered: data.points?.length ?? 0,
          total: data.total ?? 0,
        });
      } catch {
        if (!cancelled) {
          setPoints([]);
          onStatus?.({ loading: false, covered: 0, total: 0 });
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
    // onStatus sengaja tidak masuk daftar: pemanggil sering membuat fungsi
    // baru tiap render, dan itu akan memicu pengambilan tanpa henti.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, datetime, moveCount, map]);

  // Gambar ulang lapisan setiap data berubah.
  useEffect(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    if (!enabled || points.length === 0 || !pluginReady) return;

    const heatLayer = (L as unknown as { heatLayer?: unknown }).heatLayer;
    if (typeof heatLayer !== 'function') {
      console.error('[heatmap] L.heatLayer tidak tersedia setelah plugin dimuat');
      return;
    }

    // Skor 0-100 dinormalkan ke 0-1 sesuai yang diharapkan leaflet.heat.
    const data: [number, number, number][] = points.map((p) => [
      p.lat,
      p.lon,
      Math.min(1, Math.max(0, p.score / 100)),
    ]);

    // @ts-expect-error leaflet.heat menambah L.heatLayer tanpa membawa tipe.
    const layer = L.heatLayer(data, {
      radius: 38,
      blur: 28,
      maxZoom: 17,
      minOpacity: 0.25,
      gradient: {
        0.0: '#22C55E',
        0.35: '#FACC15',
        0.6: '#F97316',
        0.85: '#EF4444',
        1.0: '#B91C1C',
      },
    });

    layer.addTo(map);
    layerRef.current = layer;

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [points, enabled, map, pluginReady]);

  return null;
}
