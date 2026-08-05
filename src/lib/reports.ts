import {
  CircleEllipsis,
  MessageCircleWarning,
  ShieldAlert,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

/**
 * Definisi kategori insiden dipakai bersama oleh form pelaporan, daftar
 * laporan, dan ringkasan setelah kirim. Disatukan di sini agar label dan
 * warnanya tidak pernah berbeda antar halaman.
 */

export interface IncidentItem {
  id: string;
  category: string;
  location: string;
  /** Waktu kejadian menurut pelapor; bisa jauh di masa lalu. */
  timestamp: string;
  /** Waktu laporan dikirim; inilah dasar kode rujukan. */
  createdAt: string;
  description: string | null;
  evidenceUrl: string | null;
}

export const CATEGORIES = [
  { value: 'harassment', label: 'Verbal Harassment', icon: MessageCircleWarning },
  { value: 'assault', label: 'Assault', icon: ShieldAlert },
  { value: 'theft', label: 'Theft', icon: Wallet },
  { value: 'other', label: 'Other', icon: CircleEllipsis },
] as const;

export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label])
);

export const CATEGORY_ICONS: Record<string, LucideIcon> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.icon])
);

export const CATEGORY_STYLES: Record<string, string> = {
  harassment: 'bg-orange-100 text-orange-700',
  assault: 'bg-red-100 text-red-700',
  theft: 'bg-yellow-100 text-yellow-700',
  other: 'bg-neutral-200 text-neutral-700',
};

export function categoryLabel(value: string): string {
  return CATEGORY_LABELS[value] ?? value;
}

export function categoryIcon(value: string): LucideIcon {
  return CATEGORY_ICONS[value] ?? CircleEllipsis;
}

export function categoryStyle(value: string): string {
  return CATEGORY_STYLES[value] ?? CATEGORY_STYLES.other;
}

/**
 * Kode rujukan yang enak dibaca dan disebutkan, mis. SH-2026-4F7A.
 *
 * Diturunkan dari id (cuid) dan tanggal pembuatan, bukan disimpan sebagai
 * kolom tersendiri. Sifatnya deterministik: id yang sama selalu menghasilkan
 * kode yang sama, sehingga pelapor bisa mencocokkannya kapan pun tanpa
 * perlu perubahan skema basis data.
 */
export function referenceCode(id: string, createdAt: string | Date): string {
  const year = new Date(createdAt).getFullYear();
  const suffix = id.replace(/[^a-z0-9]/gi, '').slice(-4).toUpperCase();
  return `SH-${year}-${suffix}`;
}

/** Format tanggal & jam yang konsisten di seluruh halaman laporan. */
export function formatTimestamp(value: string | Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
