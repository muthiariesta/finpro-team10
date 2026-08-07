'use client';

import { useState } from 'react';
import { Loader2, Plus, Trash2, X } from 'lucide-react';
import AdminCard, { AdminTable } from './AdminCard';

type PointType = 'MEDICAL' | 'POLICE' | 'COMMERCIAL';

interface Point {
  id: string;
  name: string;
  type: PointType;
  location: string;
  phone: string | null;
  lat: number | null;
  lon: number | null;
  createdAt: string;
}

const TYPE_LABELS: Record<PointType, string> = {
  MEDICAL: 'Medical & Pharmacy',
  POLICE: 'Police Station',
  COMMERCIAL: 'Commercial Haven',
};

export default function SafePointRegistry({ initial }: { initial: Point[] }) {
  const [points, setPoints] = useState(initial);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    type: 'MEDICAL' as PointType,
    location: '',
    phone: '',
    lat: '',
    lon: '',
  });

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/safe-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Could not save the safe point.');
        return;
      }

      setPoints((prev) => [data, ...prev]);
      setForm({ name: '', type: 'MEDICAL', location: '', phone: '', lat: '', lon: '' });
      setOpen(false);
    } catch {
      setError('Cannot reach the server. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setBusy(id);
    setError(null);

    try {
      const res = await fetch(`/api/admin/safe-points/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Could not remove the safe point.');
        return;
      }
      setPoints((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setError('Cannot reach the server. Check your connection and try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <AdminCard
      pill="Safe Point Registry"
      pillTone="green"
      title="Manage Safe Point & Havens"
      description="Register 24/7 medical & pharmacies, police stations, and verified commercial havens."
      action={
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 bg-[#D91176] hover:bg-[#b80d63] text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Safe Point
        </button>
      }
    >
      {error && (
        <p className="mb-3 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <AdminTable
        head={['Name', 'Type', 'Location', 'Phone/Contact', 'Actions']}
        isEmpty={points.length === 0}
        empty="No safe points registered yet."
      >
        {points.map((p) => (
          <tr key={p.id} className="border-b border-gray-100">
            <td className="px-4 py-4 text-sm font-semibold text-gray-900">{p.name}</td>
            <td className="px-4 py-4">
              <span className="inline-block text-[11px] font-bold text-emerald-700 bg-emerald-50 rounded-full px-3 py-1 whitespace-nowrap">
                {TYPE_LABELS[p.type]}
              </span>
            </td>
            <td className="px-4 py-4 text-sm text-gray-700">
              {p.location}
              {p.lat === null && (
                // Tanpa koordinat, tempat ini tidak bisa digambar di peta
                // pengguna - itu perlu terlihat oleh admin.
                <span className="block text-[11px] text-amber-600 font-semibold mt-0.5">
                  No coordinates: not shown on the map
                </span>
              )}
            </td>
            <td className="px-4 py-4 text-sm text-gray-700 whitespace-pre-line">
              {p.phone ?? <span className="text-gray-400">—</span>}
            </td>
            <td className="px-4 py-4">
              <button
                type="button"
                disabled={busy === p.id}
                onClick={() => remove(p.id)}
                className="flex items-center gap-1.5 border-2 border-[#D91176] text-[#D91176] hover:bg-[#D91176] hover:text-white disabled:opacity-40 text-xs font-bold px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
              >
                {busy === p.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Remove
              </button>
            </td>
          </tr>
        ))}
      </AdminTable>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-gray-900">Add Safe Point</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={add} className="flex flex-col gap-3">
              <Field
                label="Name"
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
                placeholder="Klinik 24 Jam Harmony"
                required
              />

              <label className="block">
                <span className="block text-xs font-bold text-gray-800 mb-1.5">Type</span>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as PointType })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#D91176]"
                >
                  {(Object.keys(TYPE_LABELS) as PointType[]).map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </label>

              <Field
                label="Location"
                value={form.location}
                onChange={(v) => setForm({ ...form, location: v })}
                placeholder="Jl. Margonda Raya No. 45"
                required
              />
              <Field
                label="Phone / Contact"
                value={form.phone}
                onChange={(v) => setForm({ ...form, phone: v })}
                placeholder="+62 21 1234 5678"
              />

              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Latitude"
                  value={form.lat}
                  onChange={(v) => setForm({ ...form, lat: v })}
                  placeholder="-6.3728"
                />
                <Field
                  label="Longitude"
                  value={form.lon}
                  onChange={(v) => setForm({ ...form, lon: v })}
                  placeholder="106.8317"
                />
              </div>
              <p className="text-[11px] text-gray-500 -mt-1">
                Coordinates are optional, but without them this place cannot appear on the user map.
              </p>

              <button
                type="submit"
                disabled={saving}
                className="mt-2 bg-[#D91176] hover:bg-[#b80d63] disabled:bg-gray-300 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Safe Point
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminCard>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-bold text-gray-800 mb-1.5">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#D91176] placeholder-gray-400"
      />
    </label>
  );
}
