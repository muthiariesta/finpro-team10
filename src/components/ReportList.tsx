'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  ChevronDown,
  FileText,
  Loader2,
  MapPin,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import {
  CATEGORIES,
  categoryIcon,
  categoryLabel,
  categoryStyle,
  formatTimestamp,
  STATUS_LABELS,
  STATUS_STYLES,
  referenceCode,
  type IncidentItem,
} from '@/lib/reports';

export type { IncidentItem };

type Tab = 'all' | 'mine';

/** Mengubah ISO string menjadi nilai untuk input datetime-local. */
function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

export default function ReportList({ incidents }: { incidents: IncidentItem[] }) {
  const [items, setItems] = useState(incidents);
  const [myReports, setMyReports] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<Tab>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Laporan yang sedang diedit, beserta salinan nilai formulirnya.
  const [editing, setEditing] = useState<IncidentItem | null>(null);
  const [editForm, setEditForm] = useState({
    category: '',
    location: '',
    timestamp: '',
    description: '',
  });
  const [editCategoryOpen, setEditCategoryOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  /**
   * Kepemilikan laporan hanya diketahui dari localStorage; tidak ada akun
   * dan tidak ada identitas tersimpan di server. Karena localStorage tidak
   * tersedia saat render di server, pembacaannya ditunda ke useEffect.
   */
  useEffect(() => {
    setMyReports(JSON.parse(localStorage.getItem('my-reports') || '{}'));
  }, []);

  const mineCount = useMemo(
    () => items.filter((i) => myReports[i.id]).length,
    [items, myReports]
  );

  const visible = tab === 'mine' ? items.filter((i) => myReports[i.id]) : items;

  const persistMyReports = (next: Record<string, string>) => {
    setMyReports(next);
    localStorage.setItem('my-reports', JSON.stringify(next));
  };

  const handleDelete = async (id: string) => {
    const ownerToken = myReports[id];
    if (!ownerToken) return;
    if (!confirm('Delete this report? This cannot be undone.')) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerToken }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete report');
      }

      setItems((prev) => prev.filter((item) => item.id !== id));
      const next = { ...myReports };
      delete next[id];
      persistMyReports(next);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete report');
    } finally {
      setDeletingId(null);
    }
  };

  const openEdit = (incident: IncidentItem) => {
    setEditing(incident);
    setEditForm({
      category: incident.category,
      location: incident.location,
      timestamp: toLocalInputValue(incident.timestamp),
      description: incident.description ?? '',
    });
    setEditError('');
    setEditCategoryOpen(false);
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    const ownerToken = myReports[editing.id];
    if (!ownerToken) return;

    if (!editForm.location.trim() || !editForm.timestamp) {
      setEditError('Location and timestamp are required');
      return;
    }

    setSavingEdit(true);
    setEditError('');
    try {
      const res = await fetch(`/api/reports/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerToken, ...editForm }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update report');
      }

      const updated = await res.json();
      setItems((prev) =>
        prev.map((item) =>
          item.id === editing.id
            ? {
                ...item,
                category: updated.category,
                location: updated.location,
                timestamp: updated.timestamp,
                description: updated.description,
              }
            : item
        )
      );
      setEditing(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update report');
    } finally {
      setSavingEdit(false);
    }
  };

  const selectedEditCategory = CATEGORIES.find((c) => c.value === editForm.category);

  return (
    <>
      {/* Tab pemisah antara seluruh laporan komunitas dan milik sendiri */}
      <div className="flex items-center gap-1 mb-4 bg-neutral-100 p-1 rounded-xl w-fit">
        {([
          ['all', 'All Reports', items.length],
          ['mine', 'My Reports', mineCount],
        ] as const).map(([value, label, count]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              tab === value
                ? 'bg-white text-pink-700 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {label}
            <span className="ml-1.5 text-xs font-bold opacity-60">{count}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="w-full bg-white rounded-2xl border border-dashed border-pink-700/30 p-12 flex flex-col items-center gap-3 text-center">
          <div className="w-16 h-16 rounded-full bg-pink-700/10 flex items-center justify-center">
            <FileText className="w-8 h-8 text-pink-700/60" />
          </div>
          <p className="text-neutral-700 text-sm font-semibold">
            {tab === 'mine' ? 'You have no reports yet' : 'No reports yet'}
          </p>
          <p className="text-neutral-500 text-sm max-w-xs">
            {tab === 'mine'
              ? 'Reports you submit from this device will appear here, where you can edit or delete them.'
              : 'Be the first to report an incident and help keep the community safe.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((incident) => {
            const isOwner = Boolean(myReports[incident.id]);
            const CategoryIcon = categoryIcon(incident.category);
            return (
              <div
                key={incident.id}
                className="w-full bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 md:p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${categoryStyle()}`}
                      >
                        <CategoryIcon className="w-3.5 h-3.5" />
                        {categoryLabel(incident.category)}
                      </span>
                      {/* Status belum tersimpan di basis data; selama alur
                          peninjauan admin belum ada, semua laporan memang
                          berstatus menunggu. */}
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_STYLES.pending}`}
                      >
                        {STATUS_LABELS.pending}
                      </span>
                      <span className="text-neutral-500 text-xs font-medium flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatTimestamp(incident.timestamp)}
                      </span>
                      <span className="text-neutral-400 text-xs font-semibold">
                        {referenceCode(incident.id, incident.createdAt)}
                      </span>
                    </div>
                    <p className="text-black text-sm font-semibold mb-1 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-pink-700 shrink-0" />
                      {incident.location}
                    </p>
                    {incident.description && (
                      <p className="text-neutral-600 text-sm">{incident.description}</p>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center gap-3">
                    {incident.evidenceUrl && (
                      <a
                        href={incident.evidenceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-pink-700 text-xs font-semibold hover:underline flex items-center gap-1"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        View evidence
                      </a>
                    )}
                    {isOwner && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEdit(incident)}
                          className="text-neutral-600 text-xs font-semibold hover:underline flex items-center gap-1"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(incident.id)}
                          disabled={deletingId === incident.id}
                          className="text-red-600 text-xs font-semibold hover:underline disabled:opacity-50 flex items-center gap-1"
                        >
                          {deletingId === incident.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                          {deletingId === incident.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog edit; hanya terbuka untuk laporan milik perangkat ini */}
      {editing && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Edit Report</h3>
                <p className="text-xs text-neutral-500">
                  {referenceCode(editing.id, editing.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                aria-label="Close edit dialog"
                className="text-neutral-400 hover:text-neutral-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Category */}
              <div className="relative">
                <label className="block text-pink-700 text-sm font-semibold mb-1.5">Category</label>
                <button
                  type="button"
                  onClick={() => setEditCategoryOpen((p) => !p)}
                  className="w-full px-4 py-2.5 bg-white rounded-xl border border-neutral-300 hover:border-pink-400 text-sm font-medium flex items-center justify-between gap-2 transition-colors"
                >
                  <span className="flex items-center gap-2 text-black">
                    {selectedEditCategory && (
                      <selectedEditCategory.icon className="w-4 h-4 text-pink-700" />
                    )}
                    {selectedEditCategory
                      ? selectedEditCategory.label
                      : categoryLabel(editForm.category)}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-neutral-500 transition-transform ${editCategoryOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {editCategoryOpen && (
                  <div className="absolute z-10 mt-2 w-full bg-white rounded-xl border border-neutral-200 shadow-lg overflow-hidden">
                    {CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = editForm.category === cat.value;
                      return (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => {
                            setEditForm((p) => ({ ...p, category: cat.value }));
                            setEditCategoryOpen(false);
                          }}
                          className={`w-full px-4 py-2.5 flex items-center gap-2 text-sm font-medium text-left transition-colors ${
                            isSelected
                              ? 'bg-pink-700/10 text-pink-700'
                              : 'text-neutral-700 hover:bg-neutral-50'
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="flex-1">{cat.label}</span>
                          {isSelected && <Check className="w-4 h-4 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Location */}
              <div>
                <label className="block text-pink-700 text-sm font-semibold mb-1.5">Location</label>
                <input
                  type="text"
                  value={editForm.location}
                  onChange={(e) => setEditForm((p) => ({ ...p, location: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-pink-700/5 rounded-xl border border-transparent focus:border-pink-700 focus:outline-none text-sm font-medium text-black"
                />
              </div>

              {/* Timestamp */}
              <div>
                <label className="block text-pink-700 text-sm font-semibold mb-1.5">Timestamp</label>
                <input
                  type="datetime-local"
                  value={editForm.timestamp}
                  onChange={(e) => setEditForm((p) => ({ ...p, timestamp: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-pink-700/5 rounded-xl border border-transparent focus:border-pink-700 focus:outline-none text-sm font-medium text-black"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-pink-700 text-sm font-semibold mb-1.5">
                  Description
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full h-24 px-4 py-3 bg-white rounded-xl border border-neutral-300 focus:border-pink-700 focus:outline-none text-sm font-medium text-black resize-none"
                />
              </div>

              {/* Bukti tidak dapat diganti dari sini; lihat catatan di API PATCH. */}
              <p className="text-[11px] text-neutral-500">
                Attached evidence cannot be changed. Delete this report and submit a new one
                if the evidence needs replacing.
              </p>

              {editError && <p className="text-xs text-red-600 font-medium">{editError}</p>}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="px-5 py-2 rounded-xl text-sm font-semibold text-neutral-600 hover:bg-neutral-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                  className="px-5 py-2 bg-pink-700 hover:bg-pink-800 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {savingEdit && <Loader2 className="w-4 h-4 animate-spin" />}
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
