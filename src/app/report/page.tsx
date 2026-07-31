'use client';

import { useState } from 'react';

export default function ReportPage() {
  const [formData, setFormData] = useState({
    category: '',
    location: 'Near Ayodya Park, Kebayoran Baru',
    timestamp: '27/07/2026 - 21:45 WIB',
    description: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
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
              </div>

              {/* Location */}
              <div>
                <label className="block text-pink-700 text-lg font-semibold mb-2">
                  Location*
                </label>
                <div className="w-full px-5 py-2 bg-pink-700/10 rounded-[10px] border border-zinc-100 flex items-center justify-between cursor-pointer hover:bg-pink-700/15 transition-colors">
                  <span className="text-black text-sm font-medium">{formData.location}</span>
                  <svg className="w-6 h-6 text-black flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
              </div>

              {/* Timestamp */}
              <div>
                <label className="block text-pink-700 text-lg font-semibold mb-2">
                  Timestamp*
                </label>
                <div className="w-full px-5 py-2 bg-pink-700/10 rounded-[10px] border border-zinc-100 flex items-center justify-between cursor-pointer hover:bg-pink-700/15 transition-colors">
                  <span className="text-black text-sm font-medium">{formData.timestamp}</span>
                  <svg className="w-6 h-6 text-black flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
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
                <div className="w-full h-44 px-5 py-6 bg-white rounded-[10px] border border-neutral-500 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-pink-700 transition-colors">
                  <svg className="w-11 h-11 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div className="text-center">
                    <p className="text-neutral-500 text-sm font-medium">Upload Photo / Video</p>
                    <p className="text-neutral-500 text-sm font-medium">Drag & drop or browse (PNG, JPG, MP4)</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-neutral-500 font-normal">
                  Max 5MB.<br/>EXIF location/metadata is automatically stripped
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="w-36 h-9 bg-pink-700 rounded-[10px] text-white text-base font-semibold hover:bg-pink-800 transition-colors"
                >
                  SUBMIT
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
