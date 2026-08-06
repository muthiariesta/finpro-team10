'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import {
  Check,
  ChevronDown,
  Copy,
  Film,
  ListChecks,
  MapPin,
  UploadCloud,
  X,
} from 'lucide-react';
import DateTimePicker from '@/components/DateTimePicker';
import { CATEGORIES, categoryLabel, formatTimestamp, referenceCode } from '@/lib/reports';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'video/mp4'];

/** Ringkasan laporan yang baru terkirim, untuk ditampilkan di layar konfirmasi. */
interface SubmittedSummary {
  reference: string;
  category: string;
  location: string;
  timestamp: string;
  hasEvidence: boolean;
}

/** Kartu ringkasan laporan pada layar konfirmasi. */
function SubmittedSummaryCard({
  summary,
  copied,
  onCopy,
}: {
  summary: SubmittedSummary;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="w-full bg-neutral-100 rounded-xl p-4 mb-4">
      <p className="text-sm font-bold text-gray-900 mb-3">Report Summary</p>

      <dl className="space-y-2 text-xs">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-gray-500">Report ID</dt>
          <dd className="flex items-center gap-1.5">
            <span className="font-bold text-pink-700">{summary.reference}</span>
            <button
              type="button"
              onClick={onCopy}
              aria-label="Copy report ID"
              className="text-gray-400 hover:text-pink-700 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </dd>
        </div>

        <div className="flex items-center justify-between gap-3">
          <dt className="text-gray-500">Status</dt>
          <dd>
            <span className="px-2 py-0.5 rounded-full border border-amber-300 bg-amber-50 text-amber-700 text-[10px] font-semibold">
              Pending Review
            </span>
          </dd>
        </div>

        <div className="flex items-center justify-between gap-3">
          <dt className="text-gray-500">Category</dt>
          <dd className="text-gray-900 font-medium text-right">
            {categoryLabel(summary.category)}
          </dd>
        </div>

        <div className="flex items-start justify-between gap-3">
          <dt className="text-gray-500 shrink-0">Location</dt>
          <dd className="text-gray-900 font-medium text-right">{summary.location}</dd>
        </div>

        <div className="flex items-center justify-between gap-3">
          <dt className="text-gray-500">Timestamp</dt>
          <dd className="text-gray-900 font-medium text-right">
            {formatTimestamp(summary.timestamp)}
          </dd>
        </div>

        <div className="flex items-center justify-between gap-3">
          <dt className="text-gray-500">Evidence</dt>
          <dd className="text-gray-900 font-medium text-right">
            {summary.hasEvidence ? '1 File Attached (EXIF Stripped)' : 'No file attached'}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export default function NewReportPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    category: '',
    location: '',
    timestamp: '',
    description: '',
  });
  const [evidence, setEvidence] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [submitted, setSubmitted] = useState<SubmittedSummary | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setCategoryOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const selectCategory = (value: string) => {
    setFormData(prev => ({ ...prev, category: value }));
    setCategoryOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    if (!selected) {
      setEvidence(null);
      return;
    }

    if (selected.size > MAX_FILE_SIZE) {
      setErrors(prev => ({ ...prev, evidence: 'File must be 5MB or smaller' }));
      setEvidence(null);
      e.target.value = '';
      return;
    }
    if (!ALLOWED_TYPES.includes(selected.type)) {
      setErrors(prev => ({ ...prev, evidence: 'Only PNG, JPG, or MP4 files are allowed' }));
      setEvidence(null);
      e.target.value = '';
      return;
    }

    setErrors(prev => {
      const { evidence: _removed, ...rest } = prev;
      return rest;
    });
    setEvidence(selected);
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!formData.category) nextErrors.category = 'Category is required';
    if (!formData.location.trim()) nextErrors.location = 'Location is required';
    if (!formData.timestamp) nextErrors.timestamp = 'Timestamp is required';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setStatus('submitting');
    setErrorMessage('');

    try {
      const ownerToken = crypto.randomUUID();

      const payload = new FormData();
      payload.append('category', formData.category);
      payload.append('location', formData.location);
      payload.append('timestamp', formData.timestamp);
      payload.append('description', formData.description);
      payload.append('ownerToken', ownerToken);
      if (evidence) payload.append('evidence', evidence);

      const res = await fetch('/api/reports', {
        method: 'POST',
        body: payload,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to submit report');
      }

      const created = await res.json();
      const myReports = JSON.parse(localStorage.getItem('my-reports') || '{}');
      myReports[created.id] = ownerToken;
      localStorage.setItem('my-reports', JSON.stringify(myReports));

      setSubmitted({
        reference: referenceCode(created.id, created.createdAt),
        category: created.category,
        location: created.location,
        timestamp: created.timestamp,
        hasEvidence: Boolean(created.evidenceUrl),
      });

      setStatus('success');
      setCopied(false);
      setFormData({ category: '', location: '', timestamp: '', description: '' });
      setEvidence(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setErrors({});

      // Sengaja TIDAK langsung berpindah ke daftar laporan. Konfirmasi
      // eksplisit lebih menenangkan pada alur pelaporan yang sensitif:
      // pengguna perlu tahu laporannya benar-benar terkirim dan tetap anonim.
      // Daftar laporan disegarkan di latar agar sudah mutakhir saat dibuka.
      router.refresh();
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to submit report');
    }
  };

  const handleCopyReference = async () => {
    if (!submitted) return;
    try {
      await navigator.clipboard.writeText(submitted.reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard bisa ditolak browser; kode rujukan tetap terlihat di layar.
    }
  };

  const selectedCategory = CATEGORIES.find(c => c.value === formData.category);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900 font-sans flex flex-col">
      {/* Header disamakan dengan halaman Emergency agar seragam */}
      <header className="fixed top-0 left-0 right-0 h-[72px] z-50 bg-white border-b border-gray-200">
        <Navbar />
      </header>

      <main className="max-w-5xl mx-auto w-full pt-[96px] pb-12 px-4 sm:px-6 flex-1">
        {status === 'success' && submitted ? (
          /* Setelah terkirim, tampilkan satu kartu konfirmasi saja - tanpa
             kolom ilustrasi - agar perhatian tertuju pada ringkasan laporan. */
          <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 flex flex-col items-center">
            <img
              src="/assets/submitted-check.png"
              alt=""
              className="w-40 h-40 object-contain mb-4"
            />

            <h3 className="text-xl font-bold text-gray-900 mb-1 text-center">
              Report Submitted!
            </h3>
            <p className="text-xs text-gray-500 italic mb-5 text-center">
              Your incident report has been anonymized and registered.
            </p>

            <SubmittedSummaryCard
              summary={submitted}
              copied={copied}
              onCopy={handleCopyReference}
            />

            <p className="text-[10px] text-gray-500 leading-relaxed mb-5 text-center">
              <strong className="text-gray-700 italic">Your privacy is protected.</strong>{' '}
              All personal identity and media metadata have been completely stripped to
              protect your privacy.
            </p>

            <div className="w-full border-t border-gray-200 pt-4 flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-end gap-3">
              <Link
                href="/report"
                className="border border-pink-700 text-pink-700 hover:bg-pink-700/5 font-semibold py-2 px-5 rounded-xl text-sm transition-colors flex items-center gap-1.5"
              >
                <ListChecks className="w-4 h-4" />
                View History
              </Link>
              <button
                type="button"
                onClick={() => {
                  setStatus('idle');
                  setSubmitted(null);
                }}
                className="bg-pink-700 hover:bg-pink-800 text-white font-semibold py-2 px-6 rounded-xl text-sm transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
        <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row">
          {/* Left Side - Illustration & Text */}
          <div className="bg-[#FDF2F8] p-6 sm:p-8 md:w-5/12 flex flex-col items-center justify-center text-center">
            <div className="w-full max-w-[280px] h-64 mb-6 flex items-center justify-center">
              <img
                src="/assets/vector-report.png"
                alt="Report Incident Illustration"
                className="w-full h-full object-contain"
              />
            </div>

            <h2 className="text-pink-700 text-2xl font-bold mb-3">Report an Incident</h2>
            <p className="text-pink-700 font-semibold mb-3 leading-relaxed text-sm">
              Your report helps keep the community safe. All submissions are strictly anonymous.
            </p>
            <p className="text-pink-700/80 font-medium text-xs leading-relaxed">
              Your personal details and precise GPS location are hidden to protect your privacy.
            </p>
          </div>

          {/* Right Side - Form atau konfirmasi setelah terkirim */}
          <div className="p-6 sm:p-8 md:w-7/12 flex flex-col justify-between">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Category */}
              <div ref={categoryRef} className="relative">
                <label className="block text-pink-700 text-lg font-semibold mb-2">
                  Category*
                </label>
                <button
                  type="button"
                  onClick={() => setCategoryOpen(prev => !prev)}
                  className={`w-full px-4 py-2.5 bg-white rounded-xl border text-sm font-medium flex items-center justify-between gap-2 transition-all ${
                    categoryOpen
                      ? 'border-pink-700 ring-2 ring-pink-700/20'
                      : 'border-neutral-300 hover:border-pink-400'
                  }`}
                >
                  <span className={`flex items-center gap-2 ${selectedCategory ? 'text-black' : 'text-neutral-500'}`}>
                    {selectedCategory && <selectedCategory.icon className="w-4 h-4 text-pink-700" />}
                    {selectedCategory ? selectedCategory.label : 'Select incident category'}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-neutral-500 transition-transform duration-200 ${categoryOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {categoryOpen && (
                  <div className="absolute z-10 mt-2 w-full bg-white rounded-xl border border-neutral-200 shadow-lg shadow-pink-700/10 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                    {CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = formData.category === cat.value;
                      return (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => selectCategory(cat.value)}
                          className={`w-full px-4 py-2.5 flex items-center gap-2 text-sm font-medium text-left transition-colors ${
                            isSelected ? 'bg-pink-700/10 text-pink-700' : 'text-neutral-700 hover:bg-neutral-50'
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="flex-1">{cat.label}</span>
                          {isSelected && <Check className="w-4 h-4 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
                {errors.category && (
                  <p className="mt-1 text-xs text-red-600">{errors.category}</p>
                )}
              </div>

              {/* Location */}
              <div>
                <label className="block text-pink-700 text-lg font-semibold mb-2">
                  Location*
                </label>
                <div className="w-full px-4 py-2.5 bg-pink-700/5 rounded-xl border border-transparent focus-within:border-pink-700 focus-within:ring-2 focus-within:ring-pink-700/20 flex items-center gap-2 transition-all">
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="e.g. Near Ayodya Park, Kebayoran Baru"
                    className="w-full bg-transparent text-black text-sm font-medium placeholder:text-neutral-500 focus:outline-none"
                    required
                  />
                  <MapPin className="w-4 h-4 text-pink-700 shrink-0" />
                </div>
                {errors.location && (
                  <p className="mt-1 text-xs text-red-600">{errors.location}</p>
                )}
              </div>

              {/* Timestamp */}
              <div>
                <label className="block text-pink-700 text-lg font-semibold mb-2">
                  Timestamp*
                </label>
                <DateTimePicker
                  value={formData.timestamp}
                  onChange={(v) => setFormData(prev => ({ ...prev, timestamp: v }))}
                  max={new Date()}
                  placeholder="Select date and time"
                />
                {errors.timestamp && (
                  <p className="mt-1 text-xs text-red-600">{errors.timestamp}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-pink-700 text-lg font-semibold mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Tell us brief details of what happened"
                  className="w-full h-24 px-4 py-3 bg-white rounded-xl border border-neutral-300 text-black text-sm font-medium placeholder:text-neutral-500 focus:outline-none focus:border-pink-700 focus:ring-2 focus:ring-pink-700/20 resize-none transition-all"
                />
              </div>

              {/* Upload Evidence */}
              <div>
                <label className="block text-pink-700 text-lg font-semibold mb-1">
                  Upload Evidence
                </label>
                <p className="text-xs text-neutral-500 mb-2 leading-relaxed">
                  Max 5MB.
                  <br />
                  EXIF location/metadata is automatically stripped
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  name="evidence"
                  accept="image/png,image/jpeg,video/mp4"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div
                  onClick={() => !evidence && fileInputRef.current?.click()}
                  className={`relative w-full h-44 px-5 py-6 bg-white rounded-xl border border-dashed flex flex-col items-center justify-center gap-3 transition-all ${
                    evidence ? 'border-pink-700 bg-pink-700/5' : 'border-neutral-300 cursor-pointer hover:border-pink-700 hover:bg-pink-700/5'
                  }`}
                >
                  {evidence && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEvidence(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      aria-label="Remove uploaded file"
                      className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-neutral-200 text-neutral-600 hover:bg-red-100 hover:text-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  {evidence ? (
                    <Film className="w-10 h-10 text-pink-700" />
                  ) : (
                    <UploadCloud className="w-10 h-10 text-neutral-400" />
                  )}
                  <div className="text-center">
                    {evidence ? (
                      <p className="text-neutral-700 text-sm font-medium">{evidence.name}</p>
                    ) : (
                      <>
                        <p className="text-neutral-500 text-sm font-medium">Upload Photo / Video</p>
                        <p className="text-neutral-400 text-xs">Drag & drop or browse (PNG, JPG, MP4)</p>
                      </>
                    )}
                  </div>
                </div>
                {errors.evidence && (
                  <p className="mt-1 text-xs text-red-600">{errors.evidence}</p>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex flex-col items-end gap-2 pt-2">
                {status === 'error' && (
                  <p className="text-sm text-red-600 font-medium">{errorMessage}</p>
                )}
                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="w-40 h-10 bg-pink-700 rounded-xl text-white text-base font-semibold hover:bg-pink-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {status === 'submitting' ? 'SUBMITTING...' : 'SUBMIT'}
                </button>
              </div>
            </form>
          </div>
        </div>
        )}
      </main>
    </div>
  );
}
