'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Building2,
  FileText,
  Layers,
  LogOut,
  Megaphone,
  Menu,
  Shield,
  X,
} from 'lucide-react';

const NAV = [
  { href: '/admin', label: 'Incident Reports', icon: FileText },
  { href: '/admin/safe-points', label: 'Safe Points', icon: Building2 },
  { href: '/admin/risk-areas', label: 'Risk Area Data', icon: Layers },
  { href: '/admin/public-feed', label: 'Public Feed', icon: Megaphone },
];

export default function AdminShell({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
      <header className="h-[72px] bg-white border-b border-gray-200 px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMenuOpen((p) => !p)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className="lg:hidden p-2 -ml-2 rounded-lg text-gray-600 hover:bg-gray-100"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link href="/admin" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#D91176] rounded-[10px] flex items-center justify-center shrink-0">
              <Shield className="w-6 h-6 text-white" fill="currentColor" />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="font-extrabold text-[19px] leading-tight text-gray-900">
                Safe<span className="text-[#D91176]"> Her</span>
              </span>
              <span className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">
                Women Safety Network
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3 sm:gap-5">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-bold text-gray-900 leading-tight">{name}</span>
            <span className="text-[11px] font-bold text-emerald-600 tracking-wide uppercase">
              System Admin Active
            </span>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2 border-2 border-[#D91176] text-[#D91176] hover:bg-[#D91176] hover:text-white font-bold px-3 sm:px-4 py-2 rounded-xl text-sm transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <aside
          className={`${
            menuOpen ? 'block' : 'hidden'
          } lg:block w-full lg:w-[280px] shrink-0 bg-white lg:bg-transparent border-b lg:border-b-0 lg:border-r border-gray-200 px-4 lg:px-6 py-5`}
        >
          <p className="text-[11px] font-extrabold tracking-widest text-gray-300 uppercase mb-3 px-2">
            Admin Management
          </p>
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => {
              const Icon = item.icon;
              // Beranda admin dicocokkan persis; kalau tidak, seluruh menu
              // akan selalu tampak aktif karena semuanya diawali /admin.
              const active =
                item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${
                    active
                      ? 'bg-[#D91176] text-white shadow-sm'
                      : 'text-gray-600 hover:bg-white hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-[18px] h-[18px] shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
