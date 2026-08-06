'use client';

import { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react';

/**
 * Pemilih tanggal & waktu buatan sendiri.
 *
 * Input datetime-local bawaan browser memunculkan kalender milik sistem
 * operasi yang tidak bisa ditata sama sekali, sehingga tampilannya lepas
 * dari gaya aplikasi. Komponen ini menggantinya agar seragam di semua
 * peramban, dengan nilai tetap berformat "YYYY-MM-DDTHH:mm" seperti
 * datetime-local supaya sisa kode tidak perlu berubah.
 */

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const pad = (n: number) => String(n).padStart(2, '0');

function toValue(date: Date, time: string): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${time}`;
}

function parseValue(value: string): { date: Date | null; time: string } {
  if (!value) return { date: null, time: '' };
  const [datePart, timePart = ''] = value.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  if (!y || !m || !d) return { date: null, time: timePart };
  return { date: new Date(y, m - 1, d), time: timePart };
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** Batas atas; dipakai agar insiden tidak bisa dilaporkan di masa depan. */
  max?: Date;
  placeholder?: string;
}

export default function DateTimePicker({
  value,
  onChange,
  max,
  placeholder = 'Select date and time',
}: Props) {
  const parsed = parseValue(value);
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => parsed.date ?? new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const selected = parsed.date;
  const time = parsed.time || '12:00';

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const pickDay = (day: number) => {
    onChange(toValue(new Date(year, month, day), time));
  };

  const changeTime = (nextTime: string) => {
    onChange(toValue(selected ?? new Date(year, month, today.getDate()), nextTime));
  };

  const isDisabled = (day: number) => {
    if (!max) return false;
    const d = new Date(year, month, day);
    // Bandingkan per hari agar tanggal hari ini tetap bisa dipilih.
    return d > new Date(max.getFullYear(), max.getMonth(), max.getDate());
  };

  const label = selected
    ? `${pad(selected.getDate())}/${pad(selected.getMonth() + 1)}/${selected.getFullYear()} - ${time}`
    : placeholder;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={`w-full px-4 py-2.5 bg-pink-700/5 rounded-xl border text-sm font-medium flex items-center justify-between gap-2 transition-all ${
          open ? 'border-pink-700 ring-2 ring-pink-700/20' : 'border-transparent hover:border-pink-400'
        }`}
      >
        <span className={selected ? 'text-black' : 'text-neutral-500'}>{label}</span>
        <Calendar className="w-4 h-4 text-pink-700 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-full min-w-[280px] bg-white rounded-xl border border-neutral-200 shadow-lg shadow-pink-700/10 p-3">
          {/* Navigasi bulan */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => setViewMonth(new Date(year, month - 1, 1))}
              aria-label="Previous month"
              className="p-1 rounded-lg text-neutral-500 hover:bg-neutral-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-neutral-800">
              {MONTHS[month]} {year}
            </span>
            <button
              type="button"
              onClick={() => setViewMonth(new Date(year, month + 1, 1))}
              aria-label="Next month"
              className="p-1 rounded-lg text-neutral-500 hover:bg-neutral-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Nama hari */}
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-[10px] font-semibold text-neutral-400 text-center py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Petak tanggal */}
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: firstWeekday }, (_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const date = new Date(year, month, day);
              const isSelected = selected ? isSameDay(date, selected) : false;
              const isToday = isSameDay(date, today);
              const disabled = isDisabled(day);

              return (
                <button
                  key={day}
                  type="button"
                  disabled={disabled}
                  onClick={() => pickDay(day)}
                  className={`h-8 rounded-lg text-xs font-medium transition-colors ${
                    isSelected
                      ? 'bg-pink-700 text-white'
                      : disabled
                        ? 'text-neutral-300 cursor-not-allowed'
                        : isToday
                          ? 'text-pink-700 font-bold hover:bg-pink-700/10'
                          : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Waktu */}
          <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-pink-700 shrink-0" />
            <input
              type="time"
              value={time}
              onChange={(e) => changeTime(e.target.value)}
              className="flex-1 px-2 py-1.5 bg-pink-700/5 rounded-lg text-sm font-medium text-black focus:outline-none focus:ring-2 focus:ring-pink-700/20"
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 bg-pink-700 hover:bg-pink-800 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
