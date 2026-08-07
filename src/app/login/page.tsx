'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Loader2, Lock, Mail, ShieldCheck, TriangleAlert, User } from 'lucide-react';
import { AuthField, AuthShell } from '@/components/AuthShell';

type Portal = 'USER' | 'ADMIN';

const PORTALS = [
  { value: 'USER', label: 'Login as User', icon: <User className="w-3.5 h-3.5" /> },
  { value: 'ADMIN', label: 'Login as Admin', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
] as const;

function LoginForm() {
  const router = useRouter();
  const nextPath = useSearchParams().get('next');
  const [portal, setPortal] = useState<Portal>('USER');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password, role: portal }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Unable to sign in.');
        return;
      }

      // refresh() perlu dipanggil agar komponen server membaca cookie sesi
      // yang baru; tanpa itu halaman tujuan masih memakai render lama.
      router.replace(data.role === 'ADMIN' ? '/report' : (nextPath ?? '/'));
      router.refresh();
    } catch {
      setError('Cannot reach the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <p className="text-[10px] font-bold tracking-widest text-gray-400 text-center uppercase mb-2">
        Select Account Portal
      </p>

      <div className="grid grid-cols-2 gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        {PORTALS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              setPortal(opt.value);
              setError(null);
            }}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all ${
              portal === opt.value
                ? 'bg-white text-[#D91176] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {opt.icon}
            {opt.label}
          </button>
        ))}
      </div>

      <form onSubmit={submit}>
        <AuthField
          label="Email or Username"
          icon={<Mail className="w-4 h-4" />}
          type="text"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder={portal === 'USER' ? 'user@safeher.org' : 'admin@safeher.org'}
          autoComplete="username"
          required
        />

        <AuthField
          label="Password"
          icon={<Lock className="w-4 h-4" />}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={portal === 'USER' ? 'safeher123' : 'admin123456'}
          autoComplete="current-password"
          required
        />

        <div className="bg-pink-50/70 border border-pink-100 rounded-xl px-3 py-2.5 flex gap-2 mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D91176] mt-1.5 shrink-0" />
          <div className="text-[11px] text-gray-600 leading-snug">
            <p>
              {portal === 'USER'
                ? 'User Access: Safe route search, anonymous reporting, emergency contacts & live tracking.'
                : 'Admin Access: Review incident reports, update their status, and respond to reporters.'}
            </p>
            <p className="mt-1.5 text-gray-500">
              Demo account:{' '}
              <span className="font-bold text-gray-700">
                {portal === 'USER' ? 'user@safeher.org' : 'admin@safeher.org'}
              </span>{' '}
              /{' '}
              <span className="font-bold text-gray-700">
                {portal === 'USER' ? 'safeher123' : 'admin123456'}
              </span>
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5 mb-4">
            <TriangleAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p className="text-[11px] font-medium text-rose-700 leading-snug">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#D91176] hover:bg-[#b80d63] disabled:bg-gray-300 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Signing in...
            </>
          ) : (
            <>
              {portal === 'USER' ? 'Login as User' : 'Login as Admin'}
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <p className="text-center mt-4">
        <Link href="/register" className="text-xs font-bold text-[#D91176] hover:underline">
          Don&apos;t have an account? Register
        </Link>
      </p>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
