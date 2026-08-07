'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, Lock, Mail, TriangleAlert, User, UserPlus } from 'lucide-react';
import { AuthField, AuthShell } from '@/components/AuthShell';

/**
 * Pendaftaran hanya untuk peran USER.
 *
 * Portal admin sengaja tidak punya jalur daftar mandiri: kalau ada, siapa pun
 * bisa mengangkat dirinya menjadi admin dan membaca seluruh laporan insiden.
 */
export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Diperiksa lebih dulu di sisi klien supaya salah ketik langsung
    // ketahuan; server tetap memeriksa ulang.
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, identifier, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Unable to create the account.');
        return;
      }

      router.replace('/');
      router.refresh();
    } catch {
      setError('Cannot reach the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="flex items-center gap-2 border-b border-gray-200 pb-3 mb-5">
        <UserPlus className="w-5 h-5 text-[#D91176]" />
        <h2 className="text-base font-bold text-gray-900">Create User Account</h2>
      </div>

      <form onSubmit={submit}>
        <AuthField
          label="Full Name"
          icon={<User className="w-4 h-4" />}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Doe"
          autoComplete="name"
          required
        />

        <AuthField
          label="Email or Phone Number"
          icon={<Mail className="w-4 h-4" />}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="jane@safeher.org or +628123456789"
          autoComplete="username"
          required
        />

        <AuthField
          label="Password"
          icon={<Lock className="w-4 h-4" />}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          required
        />

        <AuthField
          label="Confirm Password"
          icon={<Lock className="w-4 h-4" />}
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat your password"
          autoComplete="new-password"
          required
        />

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
              <Loader2 className="w-4 h-4 animate-spin" /> Creating account...
            </>
          ) : (
            <>
              Create Account <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <p className="text-center mt-4">
        <Link href="/login" className="text-xs font-bold text-[#D91176] hover:underline">
          Already have an account? Login
        </Link>
      </p>
    </AuthShell>
  );
}
