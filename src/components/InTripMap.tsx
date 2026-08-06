'use client';

import React, { createElement, useEffect } from 'react';
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
import type { LatLng, RiskLevel, RouteRiskSegment } from '@/lib/riskApi';
import { SAFE_POINT_ICONS, SAFE_POINT_LABELS, type SafePoint } from '@/lib/safePoints';

/**
 * Peta untuk In-Trip Protection.
 *
 * Bentuknya mengikuti peta Safe Route - rute berwarna menurut risiko dan
 * safe point di sekitarnya - dengan satu tambahan penting: penanda posisi
 * pengguna yang terus bergerak selama sesi berjalan.
 */

const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

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

function safePointIcon(point: SafePoint) {
  const Icon = SAFE_POINT_ICONS[point.type];
  const ring = point.open24h ? '#16A34A' : '#9CA3AF';
  const svg = renderToStaticMarkup(
    createElement(Icon, { size: 13, color: '#374151', strokeWidth: 2.25 })
  );
  return L.divIcon({
    className: '',
    html:
      `<div style="width:24px;height:24px;border-radius:50%;background:#fff;` +
      `border:2px solid ${ring};display:flex;align-items:center;` +
      `justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,.3)">${svg}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

/** Penanda posisi pengguna: titik merah muda dengan lingkaran denyut. */
const userIcon = L.divIcon({
  className: '',
  html:
    `<span style="position:relative;display:block;width:20px;height:20px">` +
    `<span style="position:absolute;inset:0;border-radius:50%;background:#D91176;` +
    `opacity:.35;animation:safeher-ping 1.6s cubic-bezier(0,0,.2,1) infinite"></span>` +
    `<span style="position:absolute;inset:4px;border-radius:50%;background:#D91176;` +
    `border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></span></span>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

/** Menjaga posisi pengguna tetap terlihat tanpa merebut kendali geser peta. */
function FollowUser({ position, follow }: { position: LatLng | null; follow: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (!position || !follow) return;
    map.panTo(position, { animate: true, duration: 0.8 });
  }, [position, follow, map]);
  return null;
}

/** Menyesuaikan viewport sekali di awal agar seluruh rute terlihat. */
function FitRouteOnce({ path }: { path: LatLng[] }) {
  const map = useMap();
  useEffect(() => {
    if (path.length > 1) {
      map.fitBounds(L.latLngBounds(path), { padding: [48, 48] });
    }
    // Sengaja hanya sekali: setelah itu peta mengikuti pengguna.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

interface Props {
  routePath: LatLng[];
  originCoords: LatLng;
  destCoords: LatLng;
  riskSegments?: RouteRiskSegment[];
  safePoints?: SafePoint[];
  /** Posisi pengguna saat ini; null sebelum perjalanan dimulai. */
  userPosition?: LatLng | null;
  /** Bagian rute yang sudah dilewati, 0..1, untuk menggambar jejak. */
  progress?: number;
  followUser?: boolean;
}

export default function InTripMap({
  routePath,
  originCoords,
  destCoords,
  riskSegments = [],
  safePoints = [],
  userPosition = null,
  progress = 0,
  followUser = true,
}: Props) {
  const path = routePath.length > 1 ? routePath : [originCoords, destCoords];

  // Ruas rute diwarnai menurut risiko, sama seperti pada Safe Route.
  const chunks: { positions: LatLng[]; color: string }[] = [];
  if (riskSegments.length > 1 && path.length > 1) {
    const size = (path.length - 1) / riskSegments.length;
    for (let i = 0; i < riskSegments.length; i++) {
      const start = Math.floor(i * size);
      const end = Math.min(path.length - 1, Math.floor((i + 1) * size));
      if (end > start) {
        chunks.push({ positions: path.slice(start, end + 1), color: colorFor(riskSegments[i]) });
      }
    }
  }

  // Jejak yang sudah dilalui digambar lebih tebal dan gelap agar kemajuan
  // perjalanan terbaca sekilas.
  const travelledCount = Math.max(0, Math.min(path.length, Math.round(path.length * progress)));
  const travelled = travelledCount > 1 ? path.slice(0, travelledCount) : [];

  return (
    <div className="w-full h-full min-h-full relative z-0">
      <MapContainer
        center={userPosition ?? originCoords}
        zoom={14}
        scrollWheelZoom
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitRouteOnce path={path} />
        <FollowUser position={userPosition} follow={followUser} />

        <Marker position={originCoords} icon={customIcon}>
          <Popup>Starting point</Popup>
        </Marker>
        <Marker position={destCoords} icon={customIcon}>
          <Popup>Destination</Popup>
        </Marker>

        {chunks.length > 0 ? (
          chunks.map((chunk, i) => (
            <Polyline key={i} positions={chunk.positions} color={chunk.color} weight={6} opacity={0.75} />
          ))
        ) : (
          <Polyline positions={path} color={NO_DATA_COLOR} weight={6} opacity={0.7} dashArray="1, 10" />
        )}

        {travelled.length > 1 && (
          <Polyline positions={travelled} color="#831843" weight={7} opacity={0.9} />
        )}

        {safePoints.map((point) => (
          <Marker key={point.id} position={point.position} icon={safePointIcon(point)}>
            <Popup>
              <strong>{point.name}</strong>
              <br />
              {SAFE_POINT_LABELS[point.type]}
              {point.open24h && ' • open 24 hours'}
            </Popup>
          </Marker>
        ))}

        {riskSegments.map((segment, i) => (
          <CircleMarker
            key={i}
            center={segment.position}
            radius={5}
            pathOptions={{
              color: '#ffffff',
              weight: 2,
              fillColor: colorFor(segment),
              fillOpacity: 1,
            }}
          >
            <Tooltip>
              {segment.result.status === 'ok'
                ? `${segment.result.level} — score ${Math.round(segment.result.score)}`
                : 'Safety data not available'}
            </Tooltip>
          </CircleMarker>
        ))}

        {userPosition && (
          <Marker position={userPosition} icon={userIcon} zIndexOffset={1000}>
            <Popup>You are here</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
