'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, Menu, Navigation, Phone, Wifi, X } from 'lucide-react';
import SosButton from './SosButton';

/**
 * Navbar aplikasi.
 *
 * Pada layar sempit, ruang dipakai untuk hal yang paling mendesak: logo,
 * status daring, dan tombol SOS. Menu navigasi dipindahkan ke laci hamburger
 * supaya SOS tidak pernah terdesak keluar layar - tombol itu justru yang
 * paling dibutuhkan saat pengguna panik.
 */

interface NavLink {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const NAV_LINKS: NavLink[] = [
  { href: '/', label: 'Safe Route Recommendation', icon: <Navigation className="w-4 h-4" /> },
  { href: '/report', label: 'Anonymous Reporting', icon: <FileText className="w-4 h-4" /> },
  { href: '/emergency', label: 'Emergency Feature', icon: <Phone className="w-4 h-4" /> },
  { href: '/in-trip', label: 'In-Trip Protection', icon: <Wifi className="w-4 h-4" /> },
];

const NavItem: React.FC<NavLink> = ({ icon, label, href }) => {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`flex items-center gap-2 h-full px-2 text-sm font-semibold transition-colors border-b-[3px] whitespace-nowrap ${
        isActive
          ? 'text-[#D91176] border-[#D91176]'
          : 'text-gray-500 border-transparent hover:text-gray-800 hover:border-gray-300'
      }`}
    >
      {icon}
      {label}
    </Link>
  );
};

/** Versi ringkas dipakai di layar sempit agar tidak mendesak tombol SOS. */
const OnlineToggle: React.FC<{ compact?: boolean }> = ({ compact }) => {
  if (compact) {
    return (
      <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-2 py-1.5 shadow-sm">
        <span className="w-2 h-2 rounded-full bg-[#20B08E]" />
        <WhatsAppIcon className="w-3.5 h-3.5 text-[#20B08E]" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-full px-3 py-1.5 shadow-sm">
      <div className="w-9 h-5 bg-[#20B08E] rounded-full relative flex items-center px-0.5 cursor-pointer">
        <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 shadow-sm" />
      </div>
      <div className="flex items-center gap-1.5 text-[#20B08E] text-xs font-bold whitespace-nowrap">
        <WhatsAppIcon className="w-3.5 h-3.5" />
        Online (WhatsApp)
      </div>
    </div>
  );
};

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.48 2 12C2 14.36 2.83 16.52 4.21 18.23L3 22L6.9 20.85C8.45 21.6 10.17 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM15.85 16.22C15.68 16.7 14.86 17.11 14.36 17.18C13.92 17.25 13.3 17.3 10.96 16.33C7.99 15.11 6.07 12.06 5.92 11.86C5.77 11.66 4.7 10.25 4.7 8.78C4.7 7.31 5.46 6.59 5.76 6.29C6.01 6.04 6.41 5.93 6.79 5.93C6.91 5.93 7.02 5.94 7.12 5.94C7.45 5.96 7.62 5.98 7.84 6.5C8.09 7.1 8.7 8.58 8.77 8.73C8.85 8.88 8.92 9.07 8.82 9.27C8.72 9.47 8.65 9.58 8.5 9.75C8.35 9.92 8.19 10.13 8.05 10.27C7.89 10.43 7.72 10.61 7.9 10.92C8.08 11.23 8.7 12.24 9.61 13.05C10.78 14.1 11.74 14.43 12.08 14.58C12.41 14.73 12.81 14.7 13.05 14.45C13.35 14.13 13.73 13.56 14.11 12.99C14.4 12.51 14.76 12.56 15.19 12.72C15.62 12.87 17.37 13.73 17.72 13.9C18.06 14.07 18.29 14.16 18.38 14.31C18.46 14.46 18.46 15.17 18.15 15.82Z" />
    </svg>
  );
}

export const Navbar: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  // Laci ditutup setiap kali berpindah halaman, agar tidak menutupi konten
  // tujuan setelah tautan diketuk.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <nav className="w-full h-[72px] bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between shadow-sm">
      {/* KIRI: LOGO. Teks merek disembunyikan di layar sempit. */}
      <Link href="/" className="flex items-center gap-3 cursor-pointer shrink-0">
        <div className="w-10 h-10 bg-[#D91176] rounded-[10px] flex items-center justify-center shadow-inner shrink-0">
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 19c-3.83-1.04-6.8-4.88-7.8-8.94L12 14v6z" />
          </svg>
        </div>
        <div className="hidden lg:flex flex-col justify-center">
          <h1 className="font-extrabold text-[19px] leading-tight text-gray-900 tracking-tight">
            Safe<span className="font-semibold text-[#D91176]">Her</span>
          </h1>
          <span className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">
            Women Safety Network
          </span>
        </div>
      </Link>

      {/* TENGAH: MENU (desktop saja) */}
      <div className="hidden lg:flex items-center gap-6 xl:gap-8 h-full">
        {NAV_LINKS.map((link) => (
          <NavItem key={link.href} {...link} />
        ))}
      </div>

      {/* KANAN: STATUS, SOS, HAMBURGER */}
      <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 shrink-0">
        <span className="hidden sm:block">
          <OnlineToggle />
        </span>
        <span className="sm:hidden">
          <OnlineToggle compact />
        </span>

        <SosButton />

        <button
          type="button"
          onClick={() => setMenuOpen((p) => !p)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          className="lg:hidden p-2 -mr-1 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* LACI MENU (mobile) */}
      {menuOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="lg:hidden fixed inset-0 top-[72px] bg-black/30 z-40 cursor-default"
          />
          <div className="lg:hidden fixed left-0 right-0 top-[72px] bg-white border-b border-gray-200 shadow-lg z-50 px-4 py-3">
            <div className="flex flex-col">
              {NAV_LINKS.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-colors ${
                      isActive
                        ? 'bg-pink-50 text-[#D91176]'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {link.icon}
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </nav>
  );
};

export default Navbar;
