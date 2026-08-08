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
  /** Lampiran pertama; ada pada laporan lama maupun baru. */
  evidenceUrl: string | null;
  /** Semua lampiran. Kosong pada laporan yang dibuat sebelum fitur ini ada. */
  evidenceUrls?: string[];
  /** Keadaan peninjauan. Hanya VERIFIED yang boleh tampil di daftar publik. */
  status: ReportStatus;
  /** Tanggapan admin yang terlihat oleh pelapor. */
  adminNote?: string | null;
}

/**
 * Daftar lampiran sebuah laporan, tanpa duplikat.
 *
 * Laporan baru menyimpan berkas pertamanya di dua tempat sekaligus
 * (evidenceUrl dan evidenceUrls[0]) demi laporan lama yang hanya punya
 * kolom pertama. Tanpa penggabungan ini, berkas itu akan tampil dua kali.
 */
export function attachmentsOf(incident: {
  evidenceUrl?: string | null;
  evidenceUrls?: string[] | null;
}): string[] {
  return [
    ...new Set(
      [incident.evidenceUrl, ...(incident.evidenceUrls ?? [])].filter(
        (url): url is string => Boolean(url)
      )
    ),
  ];
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

/**
 * Kategori sengaja tampil netral. Mewarnai jenis insiden membuat sebagian
 * laporan terlihat lebih "berat" daripada yang lain padahal tingkat
 * keparahannya belum dinilai siapa pun. Warna disimpan untuk status, yang
 * memang menyampaikan kemajuan penanganan.
 */
export const CATEGORY_STYLE = 'bg-neutral-100 text-neutral-700 border border-neutral-200';

/**
 * Nilainya sama persis dengan enum ReportStatus di basis data.
 *
 * Sebelumnya di sini ada rangkaian status karangan ('reviewing', 'resolved')
 * yang tidak pernah ada di basis data, dan setiap laporan ditampilkan sebagai
 * 'pending' tanpa memandang keadaan sebenarnya - termasuk laporan yang sudah
 * diverifikasi admin.
 */
export type ReportStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export const STATUS_LABELS: Record<ReportStatus, string> = {
  PENDING: 'Waiting for review',
  VERIFIED: 'Published',
  REJECTED: 'Not published',
};

export const STATUS_STYLES: Record<ReportStatus, string> = {
  PENDING: 'border border-amber-300 bg-amber-50 text-amber-700',
  VERIFIED: 'border border-emerald-300 bg-emerald-50 text-emerald-700',
  REJECTED: 'border border-neutral-300 bg-neutral-100 text-neutral-600',
};

/** Penjelasan status untuk pelapor, bukan untuk admin. */
export const STATUS_HINTS: Record<ReportStatus, string> = {
  PENDING:
    'Only you can see this. It appears in All Reports once an admin verifies it.',
  VERIFIED: 'Visible to everyone in All Reports.',
  REJECTED: 'An admin reviewed this and it will not be published.',
};

export function categoryLabel(value: string): string {
  return CATEGORY_LABELS[value] ?? value;
}

export function categoryIcon(value: string): LucideIcon {
  return CATEGORY_ICONS[value] ?? CircleEllipsis;
}

export function categoryStyle(): string {
  return CATEGORY_STYLE;
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
