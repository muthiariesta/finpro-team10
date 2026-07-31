'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  id: string;
  label: string;
  href: string;
  leftPos: number;
  width: number;
}

const navItems: NavItem[] = [
  { id: 'find-route', label: 'Find Route', href: '/find-route', leftPos: 200, width: 80 },
  { id: 'in-trip', label: 'In-Trip Protection', href: '/in-trip', leftPos: 313, width: 131 },
  { id: 'report', label: 'Report Incident', href: '/report', leftPos: 470, width: 112 },
  { id: 'contacts', label: 'Emergency Contacts', href: '/contacts', leftPos: 614, width: 128 },
];

export default function Navbar() {
  const pathname = usePathname();

  const getActiveTab = (): NavItem | null => {
    const active = navItems.find((item) => pathname === item.href || pathname.startsWith(item.href));
    return active || null;
  };

  const activeItem = getActiveTab();

  return (
    <nav className="w-full h-20 relative bg-white border-b border-gray-200 overflow-hidden">
      {/* Logo */}
      <Link href="/" className="absolute left-[32px] top-[26px] flex items-center gap-3">
        <Image
          src="/assets/logo.svg"
          alt="SafeHer Logo"
          width={20}
          height={24}
          priority
        />
        <span className="text-pink-700 text-xl font-bold leading-5">
          SafeHer
        </span>
      </Link>

      {/* Navigation Items */}
      {navItems.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className={`absolute top-[34px] text-sm leading-5 transition-colors ${
            activeItem?.id === item.id
              ? 'font-bold text-pink-700'
              : 'font-medium text-gray-500 hover:text-gray-700'
          }`}
          style={{ left: `${item.leftPos}px` }}
        >
          {item.label}
        </Link>
      ))}

      {/* Active Tab Underline */}
      {activeItem && (
        <div
          className="absolute bottom-0 h-1 bg-pink-700 transition-all duration-200"
          style={{
            left: `${activeItem.leftPos}px`,
            width: `${activeItem.width}px`,
          }}
        />
      )}

      {/* Right side placeholder */}
      <div className="size-6 left-[355px] top-[37px] absolute" />
    </nav>
  );
}
