'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, LogOut, ShieldCheck, User } from 'lucide-react';

/**
 * Identitas pengguna beserta tombol keluar.
 *
 * Nama diambil dari /api/auth/me, bukan diteruskan lewat props, supaya
 * navbar tetap bisa dipakai komponen klien di halaman mana pun tanpa
 * setiap halaman perlu meneruskan sesi.
 */

interface Me {
  id: string;
  name: string;
  role: 'USER' | 'ADMIN';
}

export default function UserMenu({ compact, drawer }: { compact?: boolean; drawer?: boolean }) {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data) => setMe(data.user ?? null))
      .catch(() => setMe(null));
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const logout = async () => {
    setLoggingOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    // replace(), bukan push(), agar tombol kembali tidak membawa pengguna
    // ke halaman yang sudah tidak boleh diaksesnya.
    router.replace('/login');
    router.refresh();
  };

  // Selama sesi belum terbaca, jangan tampilkan apa pun: memunculkan lalu
  // menghilangkan tombol membuat navbar tampak berkedip saat halaman dibuka.
  if (!me) return null;

  const initial = me.name.charAt(0).toUpperCase();

  // Di dalam laci menu, tombol keluar tampil utuh sebagai baris tersendiri
  // agar sejajar dengan tautan navigasi di atasnya.
  if (drawer) {
    return (
      <button
        type="button"
        onClick={logout}
        disabled={loggingOut}
        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-[#D91176] hover:bg-pink-50 transition-colors disabled:opacity-50"
      >
        <LogOut className="w-4 h-4" />
        {loggingOut ? 'Signing out...' : `Logout (${me.name})`}
      </button>
    );
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={logout}
        disabled={loggingOut}
        aria-label={`Sign out ${me.name}`}
        className="flex items-center gap-1.5 border border-gray-200 rounded-full px-2.5 py-1.5 text-gray-600 hover:border-[#D91176] hover:text-[#D91176] transition-colors disabled:opacity-50"
      >
        <LogOut className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        aria-expanded={open}
        className="flex items-center gap-2 border border-gray-200 rounded-full pl-1 pr-2.5 py-1 hover:border-gray-300 transition-colors"
      >
        <span className="w-7 h-7 rounded-full bg-pink-100 text-[#D91176] text-xs font-black flex items-center justify-center shrink-0">
          {initial}
        </span>
        <span className="hidden lg:block text-xs font-bold text-gray-800 max-w-[110px] truncate">
          {me.name}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-bold text-gray-900 truncate">{me.name}</p>
            <p className="flex items-center gap-1 text-[11px] font-bold text-gray-500 mt-0.5">
              {me.role === 'ADMIN' ? (
                <>
                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> Administrator
                </>
              ) : (
                <>
                  <User className="w-3 h-3" /> User account
                </>
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={logout}
            disabled={loggingOut}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm font-bold text-[#D91176] hover:bg-pink-50 transition-colors disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            {loggingOut ? 'Signing out...' : 'Logout'}
          </button>
        </div>
      )}
    </div>
  );
}
