import React from 'react';

/** Kartu pembungkus tiap halaman admin, agar keempatnya tampil seragam. */
export default function AdminCard({
  pill,
  pillTone = 'pink',
  title,
  description,
  action,
  children,
}: {
  pill: string;
  pillTone?: 'pink' | 'green' | 'amber' | 'rose';
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const tones = {
    pink: 'bg-pink-50 text-[#D91176]',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700',
  };

  return (
    <section className="bg-white border border-gray-200/80 rounded-2xl shadow-sm p-5 sm:p-7">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
        <div className="min-w-0">
          <span
            className={`inline-block text-[11px] font-extrabold px-3.5 py-1.5 rounded-full uppercase tracking-wider mb-3 ${tones[pillTone]}`}
          >
            {pill}
          </span>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight mb-1">{title}</h1>
          <p className="text-xs font-medium text-gray-500">{description}</p>
        </div>
        {action}
      </div>

      {children}
    </section>
  );
}

/** Tabel dengan pengguliran mendatar, supaya tidak pernah terpotong di layar sempit. */
export function AdminTable({
  head,
  children,
  empty,
  isEmpty,
}: {
  head: string[];
  children: React.ReactNode;
  empty: string;
  isEmpty: boolean;
}) {
  if (isEmpty) {
    return (
      <div className="border border-dashed border-gray-200 rounded-xl py-12 text-center">
        <p className="text-sm text-gray-400 font-medium">{empty}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className="w-full min-w-[720px] border-separate border-spacing-0">
        <thead>
          <tr className="bg-gray-50">
            {head.map((h, i) => (
              <th
                key={h}
                className={`text-left text-xs font-bold text-gray-500 px-4 py-3 border-y border-gray-200 ${
                  i === 0 ? 'rounded-l-xl border-l' : ''
                } ${i === head.length - 1 ? 'rounded-r-xl border-r' : ''}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
