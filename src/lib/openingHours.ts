/**
 * Menafsirkan tag `opening_hours` dari OpenStreetMap.
 *
 * Sintaks penuh opening_hours sangat luas (musim, hari libur nasional,
 * "sunset", pengecualian tanggal). Berkas ini hanya menangani bentuk yang
 * paling umum, dan itu disengaja.
 *
 * ATURAN KESELAMATAN: bila ada satu saja bagian yang tidak dikenali,
 * jawabannya 'unknown' - bukan tebakan. Mengarahkan seseorang yang sedang
 * merasa tidak aman ke tempat yang ternyata sudah tutup lebih berbahaya
 * daripada berkata terus terang bahwa jam bukanya tidak diketahui.
 *
 * Yang didukung:
 *   24/7
 *   Mo-Fr 08:00-20:00
 *   Mo-Sa 09:00-12:00,13:00-21:00
 *   Mo-Su 22:00-06:00          (melewati tengah malam)
 *   Mo-Fr 08:00-17:00; Su off
 *
 * Yang sengaja dijawab 'unknown':
 *   PH, SH, "sunset", pemilih bulan/minggu, tanggal tertentu.
 */

export type OpenState = 'open' | 'closed' | 'unknown';

const DAYS = ['mo', 'tu', 'we', 'th', 'fr', 'sa', 'su'];

interface TimeRange {
  /** Menit sejak tengah malam. */
  from: number;
  to: number;
}

interface Rule {
  /** Indeks hari (0 = Senin). Kosong berarti berlaku untuk semua hari. */
  days: number[];
  /** true bila aturannya justru menyatakan tutup. */
  off: boolean;
  ranges: TimeRange[];
}

/** Mengubah "08:30" menjadi 510. */
function toMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  // 24:00 sah dalam opening_hours dan berarti tengah malam berikutnya.
  if (h > 24 || min > 59) return null;
  return h * 60 + min;
}

/** "mo-we,fr" -> [0,1,2,4]. null bila ada nama hari yang tidak dikenal. */
function parseDays(token: string): number[] | null {
  const days = new Set<number>();

  for (const part of token.split(',')) {
    const range = part.split('-');

    if (range.length === 1) {
      const idx = DAYS.indexOf(range[0]);
      if (idx < 0) return null;
      days.add(idx);
      continue;
    }

    if (range.length !== 2) return null;
    const start = DAYS.indexOf(range[0]);
    const end = DAYS.indexOf(range[1]);
    if (start < 0 || end < 0) return null;

    // Rentang boleh membalik minggu, mis. Sa-Mo = Sabtu, Minggu, Senin.
    for (let i = 0; i < 7; i++) {
      const d = (start + i) % 7;
      days.add(d);
      if (d === end) break;
    }
  }

  return [...days];
}

/** "08:00-12:00,13:00-20:00" -> daftar rentang. null bila tidak terbaca. */
function parseRanges(token: string): TimeRange[] | null {
  const ranges: TimeRange[] = [];

  for (const part of token.split(',')) {
    const halves = part.split('-');
    if (halves.length !== 2) return null;

    const from = toMinutes(halves[0]);
    const to = toMinutes(halves[1]);
    if (from === null || to === null) return null;

    ranges.push({ from, to });
  }

  return ranges;
}

function parseRule(rule: string): Rule | null {
  const tokens = rule.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;

  let days: number[] = [];
  let cursor = 0;

  // Token pertama boleh berupa pemilih hari; kalau bukan, aturannya
  // berlaku untuk semua hari.
  const maybeDays = parseDays(tokens[0]);
  if (maybeDays) {
    days = maybeDays;
    cursor = 1;
  }

  const rest = tokens.slice(cursor).join('');
  if (!rest) return null;

  if (rest === 'off' || rest === 'closed') {
    return { days, off: true, ranges: [] };
  }

  if (rest === '24/7') {
    return { days, off: false, ranges: [{ from: 0, to: 24 * 60 }] };
  }

  const ranges = parseRanges(rest);
  if (!ranges) return null;

  return { days, off: false, ranges };
}

/**
 * Apakah `minutes` berada di dalam rentang, dihitung pada hari rentang itu
 * ditulis. Untuk rentang yang melewati tengah malam (22:00-06:00), bagian
 * yang dinilai di sini hanyalah sisi malamnya: 22:00 sampai pergantian hari.
 * Sisi paginya ditangani withinOvernightTail lewat aturan hari sebelumnya.
 */
function withinSameDay(range: TimeRange, minutes: number): boolean {
  if (range.to <= range.from) return minutes >= range.from;
  return minutes >= range.from && minutes < range.to;
}

/** Sisa dari rentang yang melewati tengah malam, terhitung pada hari berikutnya. */
function withinOvernightTail(range: TimeRange, minutes: number): boolean {
  if (range.to > range.from) return false;
  return minutes < range.to;
}

/**
 * Menjawab apakah sebuah tempat buka pada waktu tertentu.
 *
 * @param spec isi tag opening_hours apa adanya
 * @param at   waktu yang ditanyakan (biasanya perkiraan waktu tiba)
 */
export function evaluateOpening(spec: string | null | undefined, at: Date): OpenState {
  const raw = (spec ?? '').trim().toLowerCase();
  if (!raw) return 'unknown';

  if (raw === '24/7' || raw === '00:00-24:00' || raw === 'mo-su 00:00-24:00') {
    return 'open';
  }

  const rules: Rule[] = [];
  for (const chunk of raw.split(';')) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;

    const parsed = parseRule(trimmed);
    // Satu bagian tak terbaca membuat seluruh keterangan tidak bisa
    // dipercaya. Lebih baik mengaku tidak tahu.
    if (!parsed) return 'unknown';
    rules.push(parsed);
  }

  if (rules.length === 0) return 'unknown';

  // getDay(): Minggu=0. DAYS memakai Senin=0, jadi digeser.
  const today = (at.getDay() + 6) % 7;
  const yesterday = (today + 6) % 7;
  const minutes = at.getHours() * 60 + at.getMinutes();

  const applies = (rule: Rule, day: number) =>
    rule.days.length === 0 || rule.days.includes(day);

  // Aturan yang disebut belakangan menimpa yang sebelumnya - itulah cara
  // baris seperti "Mo-Sa 08:00-20:00; Su off" dimaksudkan dibaca.
  let todayRule: Rule | null = null;
  let yesterdayRule: Rule | null = null;
  for (const rule of rules) {
    if (applies(rule, today)) todayRule = rule;
    if (applies(rule, yesterday)) yesterdayRule = rule;
  }

  if (todayRule && !todayRule.off) {
    if (todayRule.ranges.some((r) => withinSameDay(r, minutes))) return 'open';
  }

  // Tempat yang buka sampai lewat tengah malam masih terhitung buka pada
  // dini hari - justru jam ketika informasi ini paling dibutuhkan.
  if (yesterdayRule && !yesterdayRule.off) {
    if (yesterdayRule.ranges.some((r) => withinOvernightTail(r, minutes))) return 'open';
  }

  // Hari yang tidak disebut sama sekali berarti tutup menurut konvensi OSM.
  return 'closed';
}
