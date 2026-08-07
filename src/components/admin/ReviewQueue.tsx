'use client';

import { useState } from 'react';
import { CircleCheck, CircleX, Loader2 } from 'lucide-react';
import { AdminTable } from './AdminCard';
import { categoryLabel, formatTimestamp, referenceCode } from '@/lib/reports';

interface QueueItem {
  id: string;
  category: string;
  location: string;
  timestamp: string;
  description: string | null;
  evidenceUrl: string | null;
  createdAt: string;
}

export default function ReviewQueue({ initial }: { initial: QueueItem[] }) {
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const decide = async (id: string, status: 'VERIFIED' | 'REJECTED') => {
    setBusy(id);
    setError(null);

    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Could not update the report.');
        return;
      }

      // Baris dihapus dari antrean hanya setelah server mengonfirmasi.
      // Menghapusnya lebih awal membuat admin mengira sudah selesai padahal
      // laporan masih menunggu.
      setItems((prev) => prev.filter((r) => r.id !== id));
    } catch {
      setError('Cannot reach the server. Check your connection and try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      {error && (
        <p className="mb-3 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <AdminTable
        head={['Report ID', 'Category', 'Location & Details', 'Status', 'Actions']}
        isEmpty={items.length === 0}
        empty="No reports are waiting for review."
      >
        {items.map((r) => (
          <tr key={r.id} className="border-b border-gray-100 align-top">
            <td className="px-4 py-4 text-sm font-bold text-gray-900 whitespace-nowrap">
              #{referenceCode(r.id, r.createdAt)}
            </td>
            <td className="px-4 py-4 text-sm text-gray-700 whitespace-nowrap">
              {categoryLabel(r.category)}
            </td>
            <td className="px-4 py-4 max-w-[380px]">
              <p className="text-sm font-bold text-gray-900">{r.location}</p>
              <p className="text-xs text-gray-500 mt-0.5">{formatTimestamp(r.timestamp)}</p>
              {r.description && (
                <p className="text-xs text-gray-600 mt-1 leading-snug">{r.description}</p>
              )}
              {r.evidenceUrl && (
                <a
                  href={r.evidenceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block text-xs font-bold text-[#D91176] hover:underline mt-1.5"
                >
                  View attached evidence
                </a>
              )}
            </td>
            <td className="px-4 py-4">
              <span className="inline-block text-[11px] font-bold text-gray-600 border border-gray-300 bg-gray-50 rounded-full px-3 py-1 whitespace-nowrap">
                Under Review
              </span>
            </td>
            <td className="px-4 py-4">
              <div className="flex flex-col gap-2 w-[110px]">
                <button
                  type="button"
                  disabled={busy === r.id}
                  onClick={() => decide(r.id, 'VERIFIED')}
                  className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
                >
                  {busy === r.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CircleCheck className="w-3.5 h-3.5" />
                  )}
                  Verify
                </button>
                <button
                  type="button"
                  disabled={busy === r.id}
                  onClick={() => decide(r.id, 'REJECTED')}
                  className="flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-700 disabled:bg-gray-300 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
                >
                  <CircleX className="w-3.5 h-3.5" />
                  Reject
                </button>
              </div>
            </td>
          </tr>
        ))}
      </AdminTable>
    </>
  );
}
