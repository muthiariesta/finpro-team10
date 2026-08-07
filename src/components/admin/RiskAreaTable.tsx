'use client';

import { useState } from 'react';
import { Loader2, Plus, Trash2, X } from 'lucide-react';
import AdminCard, { AdminTable } from './AdminCard';

type Level = 'LOW' | 'MEDIUM' | 'HIGH' | 'LIMITED';

interface Area {
  id: string;
  areaName: string;
  streetSegment: string;
  crowdDensity: string;
  riskLevel: Level;
  lat: number;
  lon: number;
  radiusM: number;
  createdAt: string;
  updatedAt: string;
}

const LEVEL_LABELS: Record<Level, string> = {
  LOW: 'Low Risk',
  MEDIUM: 'Medium Risk',
  HIGH: 'High Risk',
  LIMITED: 'Limited Data',
};

const LEVEL_STYLES: Record<Level, string> = {
  LOW: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  MEDIUM: 'bg-amber-100 text-amber-700 border-amber-200',
  HIGH: 'bg-rose-100 text-rose-700 border-rose-200',
  LIMITED: 'bg-gray-100 text-gray-600 border-gray-200',
};

export default function RiskAreaTable({ initial }: { initial: Area[] }) {
  const [areas, setAreas] = useState(initial);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    areaName: '',
    streetSegment: '',
    crowdDensity: 'Moderate',
    riskLevel: 'LIMITED' as Level,
    lat: '',
    lon: '',
    radiusM: '500',
  });

  const changeLevel = async (id: string, riskLevel: Level) => {
    const previous = areas;
    // Diperbarui lebih dulu di layar supaya dropdown terasa responsif,
    // lalu dikembalikan bila server menolak.
    setAreas((prev) => prev.map((a) => (a.id === id ? { ...a, riskLevel } : a)));
    setBusy(id);
    setError(null);

    try {
      const res = await fetch(`/api/admin/risk-areas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riskLevel }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Could not update the risk level.');
        setAreas(previous);
      }
    } catch {
      setError('Cannot reach the server. The change was not saved.');
      setAreas(previous);
    } finally {
      setBusy(null);
    }
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/risk-areas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Could not save the area.');
        return;
      }

      setAreas((prev) => [data, ...prev]);
      setForm({
        areaName: '',
        streetSegment: '',
        crowdDensity: 'Moderate',
        riskLevel: 'LIMITED',
        lat: '',
        lon: '',
        radiusM: '500',
      });
      setOpen(false);
    } catch {
      setError('Cannot reach the server. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/risk-areas/${id}`, { method: 'DELETE' });
      if (res.ok) setAreas((prev) => prev.filter((a) => a.id !== id));
    } finally {
      setBusy(null);
    }
  };

  return (
    <AdminCard
      pill="Live Risk Index Control"
      pillTone="rose"
      title="Area Segment Risk Levels"
      description="Modify area safety classifications inline. Changes propagate live to user route search scoring."
      action={
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 bg-[#D91176] hover:bg-[#b80d63] text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Area
        </button>
      }
    >
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-3.5 py-2.5 mb-4">
        <p className="text-[11px] text-blue-800 leading-snug">
          <strong>Why this matters:</strong> the risk model is trained on Chicago data, so it
          returns no score anywhere in Indonesia. Areas defined here fill that gap and are used
          whenever the model has no answer for a location.
        </p>
      </div>

      {error && (
        <p className="mb-3 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <AdminTable
        head={['Area Name', 'Street Segment', 'Crowd Density', 'Current Risk Level', '']}
        isEmpty={areas.length === 0}
        empty="No areas defined yet. Add one so routes in this region can be scored."
      >
        {areas.map((a) => (
          <tr key={a.id} className="border-b border-gray-100">
            <td className="px-4 py-4 text-sm font-semibold text-gray-900">{a.areaName}</td>
            <td className="px-4 py-4 text-sm text-gray-700">{a.streetSegment}</td>
            <td className="px-4 py-4 text-sm text-gray-700">{a.crowdDensity}</td>
            <td className="px-4 py-4">
              <select
                value={a.riskLevel}
                disabled={busy === a.id}
                onChange={(e) => changeLevel(a.id, e.target.value as Level)}
                className={`text-xs font-bold rounded-lg border px-3 py-1.5 outline-none cursor-pointer disabled:opacity-50 ${LEVEL_STYLES[a.riskLevel]}`}
              >
                {(Object.keys(LEVEL_LABELS) as Level[]).map((l) => (
                  <option key={l} value={l}>
                    {LEVEL_LABELS[l]}
                  </option>
                ))}
              </select>
            </td>
            <td className="px-4 py-4">
              <button
                type="button"
                disabled={busy === a.id}
                onClick={() => remove(a.id)}
                aria-label={`Remove ${a.areaName}`}
                className="p-2 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </td>
          </tr>
        ))}
      </AdminTable>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-gray-900">Add Risk Area</h2>
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
                label="Area Name"
                value={form.areaName}
                onChange={(v) => setForm({ ...form, areaName: v })}
                placeholder="Blok M Pedestrian Area"
                required
              />
              <Field
                label="Street Segment"
                value={form.streetSegment}
                onChange={(v) => setForm({ ...form, streetSegment: v })}
                placeholder="Jl. Melawai Raya"
                required
              />
              <Field
                label="Crowd Density"
                value={form.crowdDensity}
                onChange={(v) => setForm({ ...form, crowdDensity: v })}
                placeholder="Very Crowded / Moderate / Low"
              />

              <label className="block">
                <span className="block text-xs font-bold text-gray-800 mb-1.5">Risk Level</span>
                <select
                  value={form.riskLevel}
                  onChange={(e) => setForm({ ...form, riskLevel: e.target.value as Level })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#D91176]"
                >
                  {(Object.keys(LEVEL_LABELS) as Level[]).map((l) => (
                    <option key={l} value={l}>
                      {LEVEL_LABELS[l]}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="Latitude"
                  value={form.lat}
                  onChange={(v) => setForm({ ...form, lat: v })}
                  placeholder="-6.2441"
                  required
                />
                <Field
                  label="Longitude"
                  value={form.lon}
                  onChange={(v) => setForm({ ...form, lon: v })}
                  placeholder="106.7996"
                  required
                />
              </div>

              <Field
                label="Radius (meters)"
                value={form.radiusM}
                onChange={(v) => setForm({ ...form, radiusM: v })}
                placeholder="500"
              />
              <p className="text-[11px] text-gray-500 -mt-1">
                Any route point within this radius takes on the risk level above.
              </p>

              <button
                type="submit"
                disabled={saving}
                className="mt-2 bg-[#D91176] hover:bg-[#b80d63] disabled:bg-gray-300 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Area
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
