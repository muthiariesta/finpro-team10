'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Helper Komponen untuk Otomatis Zoom/Pan Peta ke Lokasi Baru
function MapAutoCenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 13, { duration: 1.5 });
  }, [center, map]);
  return null;
}

interface MapProps {
  originCoords?: [number, number];
  destCoords?: [number, number];
}

export default function SafeRouteMap({ 
  originCoords = [41.8781, -87.6298], // Default Chicago Loop
  destCoords = [41.8814, -87.7280]    // Default West Garfield Park
}: MapProps) {

  // Garis rute simulasi jalan raya (Contoh jalur koordinat)
  const routeLine: [number, number][] = [
    originCoords,
    [(originCoords[0] + destCoords[0]) / 2, originCoords[1]], // Titik belok 1
    [(originCoords[0] + destCoords[0]) / 2, destCoords[1]],   // Titik belok 2
    destCoords
  ];

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

        <MapAutoCenter center={destCoords} />

        {/* Marker Lokasi Asal */}
        <Marker position={originCoords} icon={customIcon}>
          <Popup>Titik Keberangkatan (Origin)</Popup>
        </Marker>

        {/* Marker Lokasi Tujuan */}
        <Marker position={destCoords} icon={customIcon}>
          <Popup>Titik Tujuan (Destination)</Popup>
        </Marker>

        {/* GARIS RUTE JALAN DI PETA (Polyline Hijau untuk Safe Route) */}
        <Polyline 
          positions={routeLine} 
          color="#16A34A" 
          weight={6} 
          opacity={0.8} 
          dashArray="1, 10" 
        />
      </MapContainer>
    </div>
  );
}