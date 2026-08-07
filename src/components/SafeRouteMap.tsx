'use client';

import React, { createElement, useEffect, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
  Tooltip,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LatLng, RiskLevel, RouteRiskSegment } from '../lib/riskApi';
import HeatmapLayer from './HeatmapLayer';
import {
  SAFE_POINT_ICONS,
  SAFE_POINT_LABELS,
  formatDistance,
  type SafePoint,
} from '../lib/safePoints';

const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

/** Menyesuaikan viewport agar seluruh rute terlihat. */
function MapAutoFit({ path, fallback }: { path: LatLng[]; fallback: LatLng }) {
  const map = useMap();
  useEffect(() => {
    if (path.length > 1) {
      map.flyToBounds(L.latLngBounds(path), { padding: [48, 48], duration: 1.2 });
    } else {
      map.flyTo(fallback, 13, { duration: 1.2 });
    }
  }, [path, fallback, map]);
  return null;
}

interface MapProps {
  originCoords?: LatLng;
  destCoords?: LatLng;
  /** Geometri jalan sungguhan dari OSRM. Kosong -> jatuh ke garis lurus. */
  routePath?: LatLng[];
  /** Hasil penilaian per titik sampel; mewarnai tiap bagian rute. */
  riskSegments?: RouteRiskSegment[];
  /** Tempat aman di sekitar rute (pos polisi, RS, SPBU, apotek, minimarket). */
  safePoints?: SafePoint[];
  /** Waktu keberangkatan, dipakai heatmap karena risiko berubah menurut jam. */
  datetime?: string;
  /**
   * Rute alternatif yang sedang TIDAK dipilih. Digambar tipis dan pudar di
   * belakang rute terpilih supaya pengguna melihat bahwa pilihannya memang
   * melewati jalan yang berbeda - bukan sekadar angka berbeda di panel.
   */
  alternatives?: { id: number; path: LatLng[] }[];
  onSelectAlternative?: (id: number) => void;
}

/**
 * Marker safe point.
 *
 * Leaflet hanya menerima HTML mentah untuk divIcon, sedangkan lucide-react
 * berupa komponen React. renderToStaticMarkup menjembatani keduanya sehingga
 * ikon di peta memakai set yang sama persis dengan ikon di panel samping.
 *
 * Warna cincin menandai ketersediaan: hijau berarti data OSM menyatakan
 * tempat itu buka 24 jam, abu-abu berarti jam bukanya tidak diketahui.
 */
function safePointIcon(point: SafePoint) {
  const Icon = SAFE_POINT_ICONS[point.type];
  const ring = point.open24h ? '#16A34A' : '#9CA3AF';
  const svg = renderToStaticMarkup(
    createElement(Icon, { size: 14, color: '#374151', strokeWidth: 2.25 })
  );

  return L.divIcon({
    className: '',
    html:
      `<div style="width:26px;height:26px;border-radius:50%;background:#fff;` +
      `border:2px solid ${ring};display:flex;align-items:center;` +
      `justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,.35)">${svg}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

/** Abu-abu adalah default yang disengaja: tanpa data, jangan menyiratkan aman. */
const NO_DATA_COLOR = '#6B7280';

const ROUTE_COLORS: Record<RiskLevel, string> = {
  Low: '#16A34A',
  Medium: '#D97706',
  High: '#E11D48',
  'Very High': '#9F1239',
};

function colorFor(segment?: RouteRiskSegment): string {
  if (!segment || segment.result.status !== 'ok') return NO_DATA_COLOR;
  return ROUTE_COLORS[segment.result.level];
}

function labelFor(segment: RouteRiskSegment): string {
  const { result } = segment;
  if (result.status === 'ok') {
    return `${result.level} — score ${Math.round(result.score)}`;
  }
  if (result.status === 'no_data') return 'Safety data not available';
  return 'Assessment failed';
}

export default function SafeRouteMap({
  originCoords = [41.8781, -87.6298], // Default Chicago Loop
  destCoords = [41.8814, -87.7280],   // Default West Garfield Park
  routePath = [],
  riskSegments = [],
  safePoints = [],
  datetime,
  alternatives = [],
  onSelectAlternative,
}: MapProps) {
  const [heatOn, setHeatOn] = useState(false);
  const [heatStatus, setHeatStatus] = useState({ loading: false, covered: 0, total: 0 });
  // Sebelum pencarian pertama, tampilkan garis lurus penghubung sebagai
  // placeholder. Setelah OSRM menjawab, ganti dengan geometri jalan asli.
  const path: LatLng[] = routePath.length > 1 ? routePath : [originCoords, destCoords];

  /**
   * Membagi jalur menjadi beberapa potongan, satu per titik sampel, lalu
   * mewarnai tiap potongan sesuai hasil penilaiannya. Potongan dibuat saling
   * tumpang-tindih satu titik agar garis tidak terputus di sambungan.
   */
  const chunks: { positions: LatLng[]; color: string }[] = [];
  if (riskSegments.length > 1 && path.length > 1) {
    const size = (path.length - 1) / riskSegments.length;
    for (let i = 0; i < riskSegments.length; i++) {
      const start = Math.floor(i * size);
      const end = Math.min(path.length - 1, Math.floor((i + 1) * size));
      if (end > start) {
        chunks.push({
          positions: path.slice(start, end + 1),
          color: colorFor(riskSegments[i]),
        });
      }
    }
  }

  return (
    <div className="w-full h-full min-h-full relative z-0">
      <MapContainer
        center={destCoords}
        zoom={13}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapAutoFit path={path} fallback={destCoords} />

        {/* Marker Lokasi Asal */}
        <Marker position={originCoords} icon={customIcon}>
          <Popup>Starting point</Popup>
        </Marker>

        {/* Marker Lokasi Tujuan */}
        <Marker position={destCoords} icon={customIcon}>
          <Popup>Destination</Popup>
        </Marker>

        {/* RUTE ALTERNATIF - di bawah rute terpilih, bisa diklik.
            Digambar dua kali: satu garis tebal transparan sebagai area
            sentuh (garis 4px terlalu tipis untuk dibidik dengan jari),
            satu garis tipis yang benar-benar terlihat. */}
        {alternatives.map((alt) => (
          <React.Fragment key={`alt-${alt.id}`}>
            <Polyline
              positions={alt.path}
              pathOptions={{ color: '#000', opacity: 0, weight: 20 }}
              interactive={Boolean(onSelectAlternative)}
              eventHandlers={
                onSelectAlternative
                  ? { click: () => onSelectAlternative(alt.id) }
                  : undefined
              }
            >
              <Tooltip sticky>Click to compare this route</Tooltip>
            </Polyline>
            <Polyline
              positions={alt.path}
              pathOptions={{ color: '#94A3B8', weight: 4, opacity: 0.75 }}
              interactive={false}
            />
          </React.Fragment>
        ))}

        {/* GARIS RUTE - diwarnai per segmen bila sudah dinilai */}
        {chunks.length > 0 ? (
          chunks.map((chunk, i) => (
            <Polyline
              key={i}
              positions={chunk.positions}
              color={chunk.color}
              weight={6}
              opacity={0.85}
            />
          ))
        ) : (
          <Polyline
            positions={path}
            color={NO_DATA_COLOR}
            weight={6}
            opacity={0.8}
            dashArray="1, 10"
          />
        )}

        {/* Safe point di sekitar rute */}
        {safePoints.map((point) => (
          <Marker key={point.id} position={point.position} icon={safePointIcon(point)}>
            <Popup>
              <strong>{point.name}</strong>
              <br />
              {SAFE_POINT_LABELS[point.type]}
              {point.open24h && ' • open 24 hours'}
              {point.distanceM !== undefined && (
                <>
                  <br />
                  {formatDistance(point.distanceM)} from destination
                </>
              )}
            </Popup>
          </Marker>
        ))}

        {/* Titik sampel penilaian - menunjukkan DI MANA risiko diukur */}
        {riskSegments.map((segment, i) => (
          <CircleMarker
            key={i}
            center={segment.position}
            radius={6}
            pathOptions={{
              color: '#ffffff',
              weight: 2,
              fillColor: colorFor(segment),
              fillOpacity: 1,
            }}
          >
            <Tooltip>{labelFor(segment)}</Tooltip>
          </CircleMarker>
        ))}
        {datetime && (
          <HeatmapLayer enabled={heatOn} datetime={datetime} onStatus={setHeatStatus} />
        )}
      </MapContainer>

      {/* Sakelar heatmap. Ditaruh di luar MapContainer agar tidak ikut
          tergeser saat peta di-pan, dan tidak menangkap gestur peta. */}
      {datetime && (
        <div className="absolute bottom-4 right-4 z-[500] flex flex-col items-end gap-1.5">
          {heatOn && (
            <span className="bg-white/95 border border-gray-200 rounded-lg px-2.5 py-1 text-[10px] font-semibold text-gray-600 shadow-sm">
              {heatStatus.loading
                ? 'Loading risk data...'
                : heatStatus.covered > 0
                  ? `${heatStatus.covered} of ${heatStatus.total} cells scored`
                  : 'No risk data in this area'}
            </span>
          )}

          <button
            type="button"
            onClick={() => setHeatOn((p) => !p)}
            aria-pressed={heatOn}
            className="flex items-center gap-2 bg-white border border-gray-200 rounded-full pl-1 pr-3 py-1 shadow-md hover:border-gray-300 transition-colors cursor-pointer"
          >
            <span
              className={`w-9 h-5 rounded-full relative flex items-center transition-colors ${
                heatOn ? 'bg-[#D91176]' : 'bg-gray-300'
              }`}
            >
              <span
                className={`w-4 h-4 bg-white rounded-full absolute shadow-sm transition-all ${
                  heatOn ? 'right-0.5' : 'left-0.5'
                }`}
              />
            </span>
            <span className="text-xs font-bold text-gray-700 whitespace-nowrap">
              Heatmap {heatOn ? 'on' : 'off'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
