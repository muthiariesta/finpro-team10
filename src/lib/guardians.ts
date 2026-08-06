/**
 * Kontak darurat (guardian), dipakai bersama oleh halaman Emergency dan
 * tombol SOS.
 *
 * Tersimpan di basis data agar tetap ada setelah peramban ditutup maupun
 * saat dibuka dari perangkat lain dengan token yang sama. Kepemilikan
 * ditandai ownerToken di localStorage - tidak ada akun pengguna di MVP ini,
 * dan nomor telepon orang terdekat tidak boleh terbaca pengunjung lain.
 */

const OWNER_TOKEN_KEY = 'safeher-owner-token';

export interface Guardian {
  id: string;
  name: string;
  role: string;
  phone: string;
  isPrimary: boolean;
  channels: string[];
}

/** Huruf awal nama, untuk avatar bulat pada kartu kontak. */
export function initialOf(name: string): string {
  return (name.trim()[0] ?? '?').toUpperCase();
}

/**
 * Token perangkat, dibuat sekali lalu dipakai seterusnya.
 * Hanya boleh dipanggil di sisi klien.
 */
export function getOwnerToken(): string {
  let token = localStorage.getItem(OWNER_TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(OWNER_TOKEN_KEY, token);
  }
  return token;
}

export async function fetchGuardians(): Promise<Guardian[]> {
  try {
    const res = await fetch(`/api/guardians?ownerToken=${encodeURIComponent(getOwnerToken())}`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.guardians) ? data.guardians : [];
  } catch (err) {
    console.warn('Gagal memuat kontak darurat:', err);
    return [];
  }
}

export async function createGuardian(input: {
  name: string;
  role: string;
  phone: string;
  isPrimary?: boolean;
}): Promise<Guardian> {
  const res = await fetch('/api/guardians', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...input, ownerToken: getOwnerToken() }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to add contact');
  }
  return res.json();
}

export async function deleteGuardian(id: string): Promise<void> {
  const res = await fetch(`/api/guardians/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerToken: getOwnerToken() }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to delete contact');
  }
}
