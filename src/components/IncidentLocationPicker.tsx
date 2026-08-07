'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * Memilih lokasi kejadian dengan tiga cara yang setara: GPS perangkat,
 * menggeser penanda di peta, atau mengetik sendiri.
 *
 * Ketiganya sengaja disediakan sekaligus. GPS saja tidak cukup - pelapor
 * sering baru berani melapor setelah menjauh dari tempat kejadian, sehingga
 * posisinya saat mengisi formulir bukan posisi kejadian. Peta saja juga
 * tidak cukup, karena tidak semua orang nyaman membaca peta atau punya
 * jaringan yang memadai untuk memuatnya. Ketikan manual adalah jalan yang
 * selalu bisa ditempuh.
 */

const pinIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  shadowSize: [41, 41],
});

export interface PickedLocation {
  label: string;
  lat: number | null;
  lon: number | null;
  /** Dari mana koordinatnya berasal; ikut dikirim agar admin bisa menimbang. */
  source: 'gps' | 'map' | 'manual';
  /** Ketelitian GPS dalam meter, hanya terisi bila source === 'gps'. */
  accuracyM?: number | null;
}

interface Props {
  value: PickedLocation;
  onChange: (next: PickedLocation) => void;
}

/** Memindahkan viewport ketika koordinat berubah dari luar peta. */
function Recenter({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, Math.max(map.getZoom(), 16));
  }, [position, map]);
  return null;
}

/** Mengetuk peta memindahkan penanda - lebih mudah daripada menyeret di ponsel. */
function ClickToMove({ onPick }: { onPick: (lat: number, lon: number) => void }) {
  useMapEvents({
    click: (e) => onPick(e.latlng.lat, e.latlng.lng),
  });
  return null;
}

/** Alamat perkiraan dari koordinat, lewat Nominatim. */
async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&zoom=17&lat=${lat}&lon=${lon}`
    );
    const data = await res.json();
    return typeof data?.display_name === 'string' ? data.display_name : null;
  } catch {
    return null;
  }
}

export default function IncidentLocationPicker({ value, onChange }: Props) {
  const [showMap, setShowMap] = useState(false);
  const [locating, setLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);

  /**
   * Menghindari menimpa alamat yang sudah diketik pelapor dengan hasil
   * reverse geocode yang datang belakangan. Pelapor lebih tahu daripada
   * Nominatim soal "gang sebelah minimarket".
   */
  const editedManually = useRef(false);

  const position: [number, number] | null =
    value.lat !== null && value.lon !== null ? [value.lat, value.lon] : null;

  const applyCoords = async (
    lat: number,
    lon: number,
    source: PickedLocation['source'],
    accuracyM?: number | null
  ) => {
    onChange({ ...value, lat, lon, source, accuracyM: accuracyM ?? null });

    if (editedManually.current && value.label.trim()) return;

    setLookingUp(true);
    const label = await reverseGeocode(lat, lon);
    setLookingUp(false);
    if (label) {
      onChange({ label, lat, lon, source, accuracyM: accuracyM ?? null });
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('This browser does not support location access.');
      return;
    }

    setLocating(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setShowMap(true);
        void applyCoords(
          pos.coords.latitude,
          pos.coords.longitude,
          'gps',
          pos.coords.accuracy
        );
      },
      (err) => {
        setLocating(false);
        // Pesan dibedakan karena tindakan penyelesaiannya berbeda: izin yang
        // ditolak harus diubah di pengaturan peramban, sedangkan sinyal yang
        // lemah cukup dicoba lagi atau dilewati dengan mengetik manual.
        setGpsError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission was denied. You can still drop a pin on the map or type the address.'
            : 'Could not get your location right now. Try again, or type the address instead.'
        );
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 }
    );
  };

  return (
    <div className="space-y-2">
      <div className="w-full px-4 py-2.5 bg-pink-700/5 rounded-xl border border-transparent focus-within:border-pink-700 focus-within:ring-2 focus-within:ring-pink-700/20 flex items-center gap-2 transition-all">
        <input
          type="text"
          value={value.label}
          onChange={(e) => {
            editedManually.current = true;
            // Mengetik ulang alamat membuat koordinat lama tidak lagi
            // mewakili apa yang tertulis, tetapi koordinatnya tidak dibuang:
            // pelapor mungkin hanya memperjelas patokan di titik yang sama.
            onChange({
              ...value,
              label: e.target.value,
              source: value.lat === null ? 'manual' : value.source,
            });
          }}
          placeholder="e.g. Near Ayodya Park, Kebayoran Baru"
          className="w-full bg-transparent text-black text-sm font-medium placeholder:text-neutral-500 focus:outline-none"
        />
        {lookingUp && (
          <span className="text-[10px] text-neutral-500 whitespace-nowrap">finding...</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="flex items-center gap-1.5 text-xs font-semibold text-pink-700 border border-pink-700/40 rounded-lg px-3 py-1.5 hover:bg-pink-700/5 transition-colors disabled:opacity-50"
        >
          {locating ? 'Getting location...' : 'Use my current location'}
        </button>

        <button
          type="button"
          onClick={() => setShowMap((p) => !p)}
          className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 border border-neutral-300 rounded-lg px-3 py-1.5 hover:border-pink-700 hover:text-pink-700 transition-colors"
        >
          {showMap ? 'Hide map' : 'Pick on map'}
        </button>
      </div>

      {gpsError && <p className="text-[11px] text-amber-700 leading-snug">{gpsError}</p>}

      {showMap && (
        <div className="rounded-xl overflow-hidden border border-neutral-300">
          <div className="h-56">
            <MapContainer
              center={position ?? [-6.2, 106.816]}
              zoom={position ? 16 : 12}
              style={{ width: '100%', height: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Recenter position={position} />
              <ClickToMove onPick={(lat, lon) => void applyCoords(lat, lon, 'map')} />
              {position && (
                <Marker
                  position={position}
                  icon={pinIcon}
                  draggable
                  eventHandlers={{
                    dragend: (e) => {
                      const { lat, lng } = (e.target as L.Marker).getLatLng();
                      void applyCoords(lat, lng, 'map');
                    },
                  }}
                />
              )}
            </MapContainer>
          </div>

          <p className="text-[10px] text-neutral-500 px-3 py-2 bg-neutral-50 leading-snug">
            Tap anywhere on the map or drag the pin to adjust the exact spot.
            {position && (
              <>
                {' '}
                Selected: {position[0].toFixed(5)}, {position[1].toFixed(5)}
                {value.source === 'gps' && value.accuracyM
                  ? ` (GPS, accurate to about ${Math.round(value.accuracyM)} m)`
                  : value.source === 'map'
                    ? ' (placed by hand)'
                    : ''}
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
