'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'video/mp4'];

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
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
      router.push('/report');
      router.refresh();
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to submit report');
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-80px)] bg-[#FAFAFA] py-6 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Main Container */}
        <div className="w-full bg-white rounded-[20px] border border-pink-700 overflow-hidden flex h-[816px]">
          {/* Left Side - Illustration & Text */}
          <div className="w-[605px] bg-pink-700/10 rounded-l-[20px] flex flex-col items-center justify-center flex-shrink-0 p-6">
            {/* Vector Illustration */}
            <div className="mb-8">
              <img
                src="/assets/vector-report.png"
                alt="Report Incident Illustration"
                className="w-[400px] h-[350px] object-contain"
              />
            </div>

            {/* Text Section */}
            <div className="text-center space-y-4">
              <h2 className="text-pink-700 text-2xl font-semibold">Report an Incident</h2>
              <p className="text-pink-700 text-base font-semibold leading-6">
                Your report helps keep the community safe. All submissions are strictly anonymous.
              </p>
              <p className="text-pink-700 text-sm font-semibold leading-5">
                Your personal details and precise GPS location are hidden to protect your privacy.
              </p>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="flex-1 p-8 overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Category */}
              <div>
                <label className="block text-pink-700 text-lg font-semibold mb-2">
                  Category*
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-5 py-2 bg-white rounded-[10px] border border-neutral-500 text-neutral-500 text-sm font-medium focus:outline-none focus:border-pink-700"
                  required
                >
                  <option value="">Select incident category</option>
                  <option value="harassment">Harassment</option>
                  <option value="assault">Assault</option>
                  <option value="theft">Theft</option>
                  <option value="other">Other</option>
                </select>
                {errors.category && (
                  <p className="mt-1 text-xs text-red-600">{errors.category}</p>
                )}
              </div>

              {/* Location */}
              <div>
                <label className="block text-pink-700 text-lg font-semibold mb-2">
                  Location*
                </label>
                <div className="w-full px-5 py-2 bg-pink-700/10 rounded-[10px] border border-zinc-100 flex items-center gap-2">
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="e.g. Near Ayodya Park, Kebayoran Baru"
                    className="w-full bg-transparent text-black text-sm font-medium placeholder:text-neutral-500 focus:outline-none"
                    required
                  />
                  <svg className="w-5 h-5 text-black shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
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
                <div className="w-full px-5 py-2 bg-pink-700/10 rounded-[10px] border border-zinc-100 flex items-center gap-2">
                  <input
                    type="datetime-local"
                    name="timestamp"
                    value={formData.timestamp}
                    onChange={handleChange}
                    className="w-full bg-transparent text-black text-sm font-medium focus:outline-none"
                    required
                  />
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
                  className="w-full h-24 px-5 py-3 bg-white rounded-[10px] border border-neutral-500 text-neutral-500 text-sm font-medium placeholder:text-neutral-500 focus:outline-none focus:border-pink-700 resize-none"
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
                  className={`relative w-full h-44 px-5 py-6 bg-white rounded-[10px] border border-neutral-500 flex flex-col items-center justify-center gap-3 transition-colors ${evidence ? '' : 'cursor-pointer hover:border-pink-700'}`}
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
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                  <svg className="w-11 h-11 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div className="text-center">
                    {evidence ? (
                      <p className="text-neutral-700 text-sm font-medium">{evidence.name}</p>
                    ) : (
                      <>
                        <p className="text-neutral-500 text-sm font-medium">Upload Photo / Video</p>
                        <p className="text-neutral-500 text-sm font-medium">Drag & drop or browse (PNG, JPG, MP4)</p>
                      </>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-xs text-neutral-500 font-normal">
                  Max 5MB.<br/>EXIF location/metadata is automatically stripped
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
                  className="w-36 h-9 bg-pink-700 rounded-[10px] text-white text-base font-semibold hover:bg-pink-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === 'submitting' ? 'SUBMITTING...' : 'SUBMIT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
