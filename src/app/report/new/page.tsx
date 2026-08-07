'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { PickedLocation } from '@/components/IncidentLocationPicker';
import { Navbar } from '@/components/Navbar';
import {
  Check,
  ChevronDown,
  Copy,
  Film,
  ListChecks,
  UploadCloud,
  X,
} from 'lucide-react';
import DateTimePicker from '@/components/DateTimePicker';
import { CATEGORIES, categoryLabel, formatTimestamp, referenceCode } from '@/lib/reports';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'video/mp4'];
/** Harus sama dengan MAX_FILES di src/app/api/reports/route.ts. */
const MAX_FILES = 5;

/**
 * Peta memuat Leaflet, yang menyentuh `window` saat diimpor. Dimuat hanya
 * di peramban supaya render di server tidak gagal.
 */
const IncidentLocationPicker = dynamic(
  () => import('@/components/IncidentLocationPicker'),
  {
    ssr: false,
    loading: () => (
      <div className="h-10 rounded-xl bg-neutral-100 animate-pulse" />
    ),
  }
);

/** Ringkasan laporan yang baru terkirim, untuk ditampilkan di layar konfirmasi. */
interface SubmittedSummary {
  reference: string;
  category: string;
  location: string;
  timestamp: string;
  evidenceCount: number;
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
            {summary.evidenceCount > 0
              ? `${summary.evidenceCount} file${summary.evidenceCount === 1 ? '' : 's'} attached (EXIF stripped)`
              : 'No file attached'}
          </dd>
        </div>
      </dl>
    </div>
  );
}

/**
 * Pratinjau satu lampiran.
 *
 * Pratinjaunya nyata, bukan sekadar nama berkas: dengan beberapa foto
 * sekaligus, nama seperti IMG_2381.jpg tidak memberi tahu apa pun tentang
 * mana yang hendak dihapus.
 */
function EvidenceThumb({ file, onRemove }: { file: File; onRemove: () => void }) {
  const isImage = file.type.startsWith('image/');

  // Dibuat saat render, bukan di dalam effect. Membuatnya di effect lalu
  // menyimpannya lewat setState memaksa satu render tambahan dengan
  // pratinjau kosong, dan gambar terlihat berkedip saat muncul.
  const url = useMemo(
    () => (isImage ? URL.createObjectURL(file) : null),
    [file, isImage]
  );

  // Object URL menahan berkasnya di memori sampai dilepas; tanpa ini,
  // memilih lalu menghapus foto berulang kali membuat tab membengkak.
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  return (
    <li className="relative aspect-square rounded-lg overflow-hidden border border-neutral-200 bg-neutral-50">
      {isImage && url ? (
        <img src={url} alt={file.name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2">
          <Film className="w-6 h-6 text-pink-700" />
          <span className="text-[9px] text-neutral-600 text-center line-clamp-2 break-all">
            {file.name}
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${file.name}`}
        className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full bg-white/90 text-neutral-600 hover:bg-red-100 hover:text-red-600 shadow-sm transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </li>
  );
}

export default function NewReportPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    category: '',
    timestamp: '',
    description: '',
  });
  const [place, setPlace] = useState<PickedLocation>({
    label: '',
    lat: null,
    lon: null,
    source: 'manual',
  });
  const [evidence, setEvidence] = useState<File[]>([]);
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
    const picked = Array.from(e.target.files ?? []);
    // Input direset agar memilih berkas yang sama dua kali tetap memicu
    // change - jika tidak, menghapus lalu memilih ulang terasa rusak.
    e.target.value = '';
    if (picked.length === 0) return;

    const rejected: string[] = [];
    const accepted: File[] = [];

    for (const file of picked) {
      if (file.size > MAX_FILE_SIZE) {
        rejected.push(`${file.name} is larger than 5MB`);
      } else if (!ALLOWED_TYPES.includes(file.type)) {
        rejected.push(`${file.name} is not a PNG, JPG, or MP4`);
      } else {
        accepted.push(file);
      }
    }

    // Berkas yang sudah dipilih ditambah, bukan diganti: orang biasanya
    // memilih foto beberapa kali dari album yang berbeda.
    setEvidence((prev) => {
      const merged = [...prev];
      for (const file of accepted) {
        const duplicate = merged.some(
          (f) => f.name === file.name && f.size === file.size
        );
        if (!duplicate && merged.length < MAX_FILES) merged.push(file);
      }
      if (merged.length >= MAX_FILES && prev.length + accepted.length > MAX_FILES) {
        rejected.push(`Only ${MAX_FILES} files can be attached`);
      }
      return merged;
    });

    setErrors((prev) => {
      const { evidence: _removed, ...rest } = prev;
      return rejected.length > 0 ? { ...rest, evidence: rejected.join('. ') } : rest;
    });
  };

  const removeFile = (index: number) => {
    setEvidence((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!formData.category) nextErrors.category = 'Category is required';
    if (!place.label.trim()) nextErrors.location = 'Location is required';
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
      payload.append('location', place.label);
      payload.append('timestamp', formData.timestamp);
      payload.append('description', formData.description);
      payload.append('ownerToken', ownerToken);
      if (place.lat !== null && place.lon !== null) {
        payload.append('lat', String(place.lat));
        payload.append('lon', String(place.lon));
        payload.append('locationSource', place.source);
      }
      // Nama field diulang, satu per berkas; sisi server membacanya
      // dengan formData.getAll('evidence').
      for (const file of evidence) payload.append('evidence', file);

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
        evidenceCount: created.evidenceUrls?.length ?? (created.evidenceUrl ? 1 : 0),
      });

      setStatus('success');
      setCopied(false);
      setFormData({ category: '', timestamp: '', description: '' });
      setPlace({ label: '', lat: null, lon: null, source: 'manual' });
      setEvidence([]);
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
                <IncidentLocationPicker value={place} onChange={setPlace} />
                {errors.location && (
                  <p className="mt-1 text-xs text-red-600">{errors.location}</p>
                )}
              </div>

              {/* Timestamp */}
              <div>
                <div className="flex items-baseline justify-between mb-2 gap-3">
                  <label className="block text-pink-700 text-lg font-semibold">
                    Timestamp*
                  </label>
                  {/* Jam perangkat, sama seperti jam yang menyertai GPS.
                      Waktu kejadian tetap bisa diubah, karena laporan sering
                      ditulis beberapa saat setelah kejadiannya. */}
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const pad = (n: number) => String(n).padStart(2, '0');
                      setFormData((prev) => ({
                        ...prev,
                        timestamp:
                          `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
                          `T${pad(now.getHours())}:${pad(now.getMinutes())}`,
                      }));
                    }}
                    className="text-xs font-semibold text-pink-700 hover:underline shrink-0"
                  >
                    Use current time
                  </button>
                </div>
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
                  Up to {MAX_FILES} files, max 5MB each.
                  <br />
                  EXIF location/metadata is automatically stripped
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  name="evidence"
                  accept="image/png,image/jpeg,video/mp4"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />

                {evidence.length > 0 && (
                  <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
                    {evidence.map((file, i) => (
                      <EvidenceThumb
                        key={`${file.name}-${file.size}-${i}`}
                        file={file}
                        onRemove={() => removeFile(i)}
                      />
                    ))}
                  </ul>
                )}

                {evidence.length < MAX_FILES && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative w-full px-5 bg-white rounded-xl border border-dashed border-neutral-300 cursor-pointer hover:border-pink-700 hover:bg-pink-700/5 flex flex-col items-center justify-center gap-3 transition-all ${
                      evidence.length > 0 ? 'py-4' : 'h-44 py-6'
                    }`}
                  >
                    <UploadCloud
                      className={evidence.length > 0 ? 'w-6 h-6 text-neutral-400' : 'w-10 h-10 text-neutral-400'}
                    />
                    <div className="text-center">
                      <p className="text-neutral-500 text-sm font-medium">
                        {evidence.length > 0 ? 'Add another file' : 'Upload Photo / Video'}
                      </p>
                      <p className="text-neutral-400 text-xs">
                        {evidence.length > 0
                          ? `${MAX_FILES - evidence.length} more allowed`
                          : 'Drag & drop or browse (PNG, JPG, MP4)'}
                      </p>
                    </div>
                  </div>
                )}
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
