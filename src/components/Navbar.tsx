'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  href: string;
}

const navItems: NavItem[] = [
  { id: 'find-route', label: 'Find Route', href: '/find-route' },
  { id: 'in-trip', label: 'In-Trip Protection', href: '/in-trip' },
  { id: 'report', label: 'Report Incident', href: '/report' },
  { id: 'contacts', label: 'Emergency Contacts', href: '/contacts' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (item: NavItem) => pathname === item.href || pathname.startsWith(item.href);

  return (
    <nav className="w-full bg-white border-b border-gray-200">
      <div className="h-20 px-6 md:px-20 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 shrink-0" onClick={() => setMobileOpen(false)}>
          <Image src="/assets/logo.svg" alt="SafeHer Logo" width={20} height={24} priority />
          <span className="text-pink-700 text-xl font-bold leading-5">SafeHer</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`text-sm leading-5 pb-6 -mb-6 border-b-2 transition-colors ${
                isActive(item)
                  ? 'font-bold text-pink-700 border-pink-700'
                  : 'font-medium text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          className="md:hidden p-2 -mr-2 text-pink-700"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {mobileOpen && (
        <div className="md:hidden px-6 pb-4 flex flex-col gap-1 border-t border-gray-100">
          {navItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`py-3 text-sm border-b border-gray-50 ${
                isActive(item) ? 'font-bold text-pink-700' : 'font-medium text-gray-500'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
