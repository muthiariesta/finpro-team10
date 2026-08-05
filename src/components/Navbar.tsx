'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// --- INTERFACES (Definisi Tipe Data) ---
interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  href: string; // href dibuat dinamis
}

// --- 1. NavItem Component ---
const NavItem: React.FC<NavItemProps> = ({ icon, label, href }) => {
  const pathname = usePathname();
  const isActive = pathname === href; // Automatic active state check!

  return (
    <Link 
      href={href} 
      className={`flex items-center gap-2 h-full px-2 text-sm font-semibold transition-colors border-b-[3px] ${
        isActive 
          ? 'text-[#D91176] border-[#D91176]' 
          : 'text-gray-500 border-transparent hover:text-gray-800 hover:border-gray-300'
      }`}
    >
      <span className="text-lg">{icon}</span>
      {label}
    </Link>
  );
};

// --- 2. OnlineToggle Component ---
const OnlineToggle: React.FC = () => {
  return (
    <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-full px-3 py-1.5 shadow-sm">
      <div className="w-9 h-5 bg-[#20B08E] rounded-full relative flex items-center px-0.5 cursor-pointer">
        <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 shadow-sm"></div>
      </div>
      <div className="flex items-center gap-1.5 text-[#20B08E] text-xs font-bold">
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12C2 14.36 2.83 16.52 4.21 18.23L3 22L6.9 20.85C8.45 21.6 10.17 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM15.85 16.22C15.68 16.7 14.86 17.11 14.36 17.18C13.92 17.25 13.3 17.3 10.96 16.33C7.99 15.11 6.07 12.06 5.92 11.86C5.77 11.66 4.7 10.25 4.7 8.78C4.7 7.31 5.46 6.59 5.76 6.29C6.01 6.04 6.41 5.93 6.79 5.93C6.91 5.93 7.02 5.94 7.12 5.94C7.45 5.96 7.62 5.98 7.84 6.5C8.09 7.1 8.7 8.58 8.77 8.73C8.85 8.88 8.92 9.07 8.82 9.27C8.72 9.47 8.65 9.58 8.5 9.75C8.35 9.92 8.19 10.13 8.05 10.27C7.89 10.43 7.72 10.61 7.9 10.92C8.08 11.23 8.7 12.24 9.61 13.05C10.78 14.1 11.74 14.43 12.08 14.58C12.41 14.73 12.81 14.7 13.05 14.45C13.35 14.13 13.73 13.56 14.11 12.99C14.4 12.51 14.76 12.56 15.19 12.72C15.62 12.87 17.37 13.73 17.72 13.9C18.06 14.07 18.29 14.16 18.38 14.31C18.46 14.46 18.46 15.17 18.15 15.82Z"/>
        </svg>
        Online (WhatsApp)
      </div>
    </div>
  );
};

// --- 3. SOSButton Component ---
const SOSButton: React.FC = () => {
  return (
    <button className="bg-[#E03A3A] hover:bg-red-700 text-white flex items-center gap-2 px-5 py-2 rounded-full font-bold text-sm transition-colors shadow-sm cursor-pointer">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
      </svg>
      SOS
    </button>
  );
};

// --- 4. Main Navbar Component ---
export const Navbar: React.FC = () => {
  return (
    <nav className="w-full h-[72px] bg-white border-b border-gray-200 px-8 flex items-center justify-between shadow-sm">
      
      {/* BAGIAN KIRI: BRAND LOGO */}
      <Link href="/" className="flex items-center gap-3 cursor-pointer">
        <div className="w-10 h-10 bg-[#D91176] rounded-[10px] flex items-center justify-center shadow-inner">
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 19c-3.83-1.04-6.8-4.88-7.8-8.94L12 14v6z"/>
          </svg>
        </div>
        <div className="flex flex-col justify-center">
          <h1 className="font-extrabold text-[19px] leading-tight text-gray-900 tracking-tight">
            Safe<span className="font-semibold text-[#D91176]">Her</span>
          </h1>
          <span className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">
            Women Safety Network
          </span>
        </div>
      </Link>

      {/* BAGIAN TENGAH: MENU ROUTING */}
      <div className="hidden lg:flex items-center gap-8 h-full">
        <NavItem 
          href="/"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>} 
          label="Safe Route Recommendation" 
        />
        <NavItem 
          href="/anonymous-report"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>} 
          label="Anonymous Reporting" 
        />
        <NavItem 
          href="/emergency"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>} 
          label="Emergency Feature" 
        />
        <NavItem 
          href="#"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"/></svg>} 
          label="In-Trip Protection" 
        />
      </div>

      {/* BAGIAN KANAN */}
      <div className="flex items-center gap-4">
        <OnlineToggle />
        <SOSButton />
      </div>

    </nav>
  );
};

export default Navbar;