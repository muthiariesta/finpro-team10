'use client';

import React from 'react';
import { Shield } from 'lucide-react';

/** Kerangka bersama halaman masuk dan daftar, agar keduanya tidak berbeda tipis. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[420px] bg-white rounded-3xl border border-gray-200/80 shadow-sm p-7 sm:p-8">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 bg-[#D91176] rounded-2xl flex items-center justify-center shadow-sm mb-3">
            <Shield className="w-7 h-7 text-white" fill="currentColor" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900">
            Safe<span className="text-[#D91176]"> Her</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Personal Safety &amp; Route Recommendation Platform
          </p>
        </div>

        {children}

        <p className="text-[10px] text-gray-400 text-center mt-6">
          SafeHer Safety Portal • 100% Encrypted &amp; Identity Protected
        </p>
      </div>
    </div>
  );
}

/** Kolom isian dengan ikon di sisi kiri. */
export function AuthField({
  label,
  icon,
  ...props
}: { label: string; icon: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block mb-4">
      <span className="block text-xs font-bold text-gray-800 mb-1.5">{label}</span>
      <span className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 focus-within:border-[#D91176] focus-within:ring-2 focus-within:ring-[#D91176]/15 transition-all">
        <span className="text-gray-400 shrink-0">{icon}</span>
        <input
          {...props}
          className="w-full text-sm text-gray-900 bg-transparent outline-none placeholder-gray-400"
        />
      </span>
    </label>
  );
}
