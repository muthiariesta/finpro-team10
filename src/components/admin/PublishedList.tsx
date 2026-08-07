'use client';

import { useMemo, useState } from 'react';
import { Loader2, Search, Trash2 } from 'lucide-react';
import { AdminTable } from './AdminCard';
import { categoryLabel, formatTimestamp, referenceCode } from '@/lib/reports';

interface FeedItem {
  id: string;
  category: string;
  location: string;
  timestamp: string;
  description: string | null;
  createdAt: string;
}

export default function PublishedList({ initial }: { initial: FeedItem[] }) {
  const [items, setItems] = useState(initial);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((r) =>
      [r.location, r.description ?? '', categoryLabel(r.category), referenceCode(r.id, r.createdAt)]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [items, query]);

  /**
   * Menarik laporan dari feed publik.
   *
   * Statusnya dikembalikan ke REJECTED, bukan dihapus, supaya keputusan tetap
   * terekam dan laporan yang sama tidak muncul lagi sebagai kiriman baru.
   */
  const remove = async (id: string) => {
    setBusy(id);
    setError(null);

    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED' }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Could not remove the report.');
        return;
      }
      setItems((prev) => prev.filter((r) => r.id !== id));
    } catch {
      setError('Cannot reach the server. Check your connection and try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3.5 py-2.5 mb-4 focus-within:border-[#D91176] transition-colors">
        <Search className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search reports"
          className="w-full text-sm text-gray-900 bg-transparent outline-none placeholder-gray-400"
        />
      </div>

      {error && (
        <p className="mb-3 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <AdminTable
        head={['Report ID', 'Category', 'Location', 'Description', 'Status', 'Actions']}
        isEmpty={filtered.length === 0}
        empty={
          items.length === 0
            ? 'No reports have been published yet. Verify reports in the queue first.'
            : 'No reports match your search.'
        }
      >
        {filtered.map((r) => (
          <tr key={r.id} className="border-b border-gray-100 align-top">
            <td className="px-4 py-4 text-sm font-bold text-gray-900 whitespace-nowrap">
              #{referenceCode(r.id, r.createdAt)}
            </td>
            <td className="px-4 py-4 text-sm text-gray-700">{categoryLabel(r.category)}</td>
            <td className="px-4 py-4 text-sm text-gray-700 max-w-[160px]">
              {r.location}
              <span className="block text-[11px] text-gray-400 mt-0.5">
                {formatTimestamp(r.timestamp)}
              </span>
            </td>
            <td className="px-4 py-4 text-xs text-gray-600 max-w-[240px] leading-snug">
              {r.description ?? <span className="text-gray-400">No description</span>}
            </td>
            <td className="px-4 py-4">
              <span className="inline-block text-[11px] font-bold text-emerald-700 border border-emerald-300 bg-emerald-50 rounded-full px-3 py-1 whitespace-nowrap">
                Published
              </span>
            </td>
            <td className="px-4 py-4">
              <button
                type="button"
                disabled={busy === r.id}
                onClick={() => remove(r.id)}
                className="flex items-center gap-1.5 border-2 border-[#D91176] text-[#D91176] hover:bg-[#D91176] hover:text-white disabled:opacity-40 text-xs font-bold px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
              >
                {busy === r.id ? (
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
    </>
  );
}
