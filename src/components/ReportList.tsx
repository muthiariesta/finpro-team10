'use client';

import { useEffect, useState } from 'react';

export interface IncidentItem {
  id: string;
  category: string;
  location: string;
  timestamp: string;
  description: string | null;
  evidenceUrl: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  harassment: 'Harassment',
  assault: 'Assault',
  theft: 'Theft',
  other: 'Other',
};

const CATEGORY_STYLES: Record<string, string> = {
  harassment: 'bg-orange-100 text-orange-700',
  assault: 'bg-red-100 text-red-700',
  theft: 'bg-yellow-100 text-yellow-700',
  other: 'bg-neutral-200 text-neutral-700',
};

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function ReportList({ incidents }: { incidents: IncidentItem[] }) {
  const [items, setItems] = useState(incidents);
  const [myReports, setMyReports] = useState<Record<string, string>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setMyReports(JSON.parse(localStorage.getItem('my-reports') || '{}'));
  }, []);

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

      setItems(prev => prev.filter(item => item.id !== id));
      const nextMyReports = { ...myReports };
      delete nextMyReports[id];
      setMyReports(nextMyReports);
      localStorage.setItem('my-reports', JSON.stringify(nextMyReports));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete report');
    } finally {
      setDeletingId(null);
    }
  };

  if (items.length === 0) {
    return (
      <div className="w-full bg-white rounded-[20px] border border-pink-700/20 p-12 flex flex-col items-center gap-3 text-center">
        <svg className="w-12 h-12 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-neutral-700 text-sm font-semibold">No reports yet</p>
        <p className="text-neutral-500 text-sm">Be the first to report an incident and help keep the community safe.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((incident) => {
        const isOwner = Boolean(myReports[incident.id]);
        return (
          <div
            key={incident.id}
            className="w-full bg-white rounded-2xl border border-zinc-100 shadow-sm p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${CATEGORY_STYLES[incident.category] ?? CATEGORY_STYLES.other}`}
                  >
                    {CATEGORY_LABELS[incident.category] ?? incident.category}
                  </span>
                  <span className="text-neutral-500 text-xs font-medium">
                    {formatTimestamp(incident.timestamp)}
                  </span>
                </div>
                <p className="text-black text-sm font-semibold mb-1">{incident.location}</p>
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
                    className="text-pink-700 text-xs font-semibold hover:underline"
                  >
                    View evidence
                  </a>
                )}
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => handleDelete(incident.id)}
                    disabled={deletingId === incident.id}
                    className="text-red-600 text-xs font-semibold hover:underline disabled:opacity-50"
                  >
                    {deletingId === incident.id ? 'Deleting...' : 'Delete'}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
