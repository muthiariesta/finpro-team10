'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import {
  Calendar,
  Check,
  ChevronDown,
  CircleEllipsis,
  Film,
  ListChecks,
  MapPin,
  MessageCircleWarning,
  Send,
  ShieldAlert,
  UploadCloud,
  Wallet,
  X,
} from 'lucide-react';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'video/mp4'];

const CATEGORIES = [
  { value: 'harassment', label: 'Harassment', icon: MessageCircleWarning },
  { value: 'assault', label: 'Assault', icon: ShieldAlert },
  { value: 'theft', label: 'Theft', icon: Wallet },
  { value: 'other', label: 'Other', icon: CircleEllipsis },
];

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timestampRef = useRef<HTMLInputElement>(null);
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

      setStatus('success');
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

  const selectedCategory = CATEGORIES.find(c => c.value === formData.category);

  return (
    <div className="w-full min-h-screen bg-[#FAFAFA] pt-[72px]">
      {/* Navbar dipasang per halaman, mengikuti pola halaman lain di main. */}
      <header className="fixed top-0 left-0 right-0 h-[72px] z-50 bg-white border-b border-gray-200">
        <Navbar />
      </header>

      <div className="max-w-7xl mx-auto py-6 px-6 md:px-20">
        {/* Main Container */}
        <div className="w-full bg-white rounded-[20px] border border-pink-700 overflow-hidden flex flex-col md:flex-row md:h-[816px]">
          {/* Left Side - Illustration & Text */}
          <div className="w-full md:w-[605px] bg-pink-700/10 rounded-t-[20px] md:rounded-t-none md:rounded-l-[20px] flex flex-col items-center justify-center shrink-0 p-6 md:p-8">
            {/* Vector Illustration */}
            <div className="mb-4 md:mb-8">
              <img
                src="/assets/vector-report.png"
                alt="Report Incident Illustration"
                className="w-40 h-32 md:w-[400px] md:h-[350px] object-contain"
              />
            </div>

            {/* Text Section */}
            <div className="text-center space-y-2 md:space-y-4">
              <h2 className="text-pink-700 text-xl md:text-2xl font-semibold">Report an Incident</h2>
              <p className="text-pink-700 text-sm md:text-base font-semibold leading-6">
                Your report helps keep the community safe. All submissions are strictly anonymous.
              </p>
              <p className="text-pink-700 text-xs md:text-sm font-semibold leading-5">
                Your personal details and precise GPS location are hidden to protect your privacy.
              </p>
            </div>
          </div>

          {/* Right Side - Form atau konfirmasi setelah terkirim */}
          <div className="flex-1 p-6 md:p-8 overflow-y-auto">
            {status === 'success' ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="w-16 h-16 bg-pink-100 text-pink-700 rounded-full flex items-center justify-center mb-4">
                  <Check className="w-8 h-8" strokeWidth={3} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Report Submitted Anonymously!
                </h3>
                <p className="text-xs text-gray-600 max-w-sm mb-6 leading-relaxed">
                  Thank you for keeping our community safe. Your report has been logged
                  without any identifying details.
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setStatus('idle')}
                    className="bg-pink-700 hover:bg-pink-800 text-white font-bold py-2.5 px-6 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Submit Another Report
                  </button>
                  <Link
                    href="/report"
                    className="border border-pink-700 text-pink-700 hover:bg-pink-700/5 font-bold py-2.5 px-6 rounded-xl text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5"
                  >
                    <ListChecks className="w-3.5 h-3.5" />
                    View All Reports
                  </Link>
                </div>
              </div>
            ) : (
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
                <div
                  onClick={() => timestampRef.current?.showPicker?.()}
                  className="relative w-full px-4 py-2.5 bg-pink-700/5 rounded-xl border border-transparent focus-within:border-pink-700 focus-within:ring-2 focus-within:ring-pink-700/20 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <input
                    ref={timestampRef}
                    type="datetime-local"
                    name="timestamp"
                    value={formData.timestamp}
                    onChange={handleChange}
                    className="w-full bg-transparent text-black text-sm font-medium focus:outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    required
                  />
                  <Calendar className="w-4 h-4 text-pink-700 shrink-0 pointer-events-none" />
                </div>
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
                <label className="block text-pink-700 text-lg font-semibold mb-2">
                  Upload Evidence
                </label>
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
                <p className="mt-2 text-xs text-neutral-500 font-normal">
                  Max 5MB. EXIF location/metadata is automatically stripped.
                </p>
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
                  {status === 'submitting' ? (
                    'SUBMITTING...'
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      SUBMIT
                    </>
                  )}
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
