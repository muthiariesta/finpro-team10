'use client';

import React, { useState } from 'react';
// 🔴 Pake alias '@/components/...' biar Next.js nemu filenya dengan pasti!
import { Navbar } from '@/components/Navbar'; 
import { Button, InputField, TextAreaField, FileUpload } from '@/components';

export default function AnonymousReportPage() {
  const [category, setCategory] = useState('Select incident category');
  const [description, setDescription] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      
      {/* NAVBAR FIXED */}
      <header className="fixed top-0 left-0 right-0 h-[72px] z-50 bg-white border-b border-gray-200">
        <Navbar />
      </header>

      {/* MAIN CONTENT FORM */}
      <main className="max-w-5xl mx-auto w-full pt-[90px] pb-12 p-4 flex-1">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row overflow-hidden">
          
{/* Left Side: Illustration & Info */}
          <div className="bg-[#FDF2F8] p-8 md:w-5/12 flex flex-col items-center justify-center text-center">
            
            {/* 🔴 CONTAINER GAMBAR (Border dashed & background pink muda dihapus, diganti bersih) */}
            <div className="w-full max-w-[280px] h-64 mb-6 flex items-center justify-center relative">
               <img 
                 src="/policy-bro 1.png" 
                 alt="Privacy Policy Illustration" 
                 className="w-full h-full object-contain"
               />
            </div>
            
            <h2 className="text-[#D91176] text-2xl font-bold mb-3">Report an Incident</h2>
            <p className="text-[#D91176] font-semibold mb-3 leading-relaxed text-sm">
              Your report helps keep the community safe. All submissions are strictly anonymous.
            </p>
            <p className="text-[#D91176]/80 font-medium text-xs leading-relaxed">
              Your personal details and precise GPS location are hidden to protect your privacy.
            </p>
          </div>

          {/* Right Side: Form */}
          <div className="p-8 md:w-7/12 flex flex-col justify-between">
            
            {isSubmitted ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 animate-fadeIn">
                <div className="w-16 h-16 bg-pink-100 text-[#D91176] rounded-full flex items-center justify-center text-3xl mb-4 font-bold">
                  ✓
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Report Submitted Anonymously!</h3>
                <p className="text-xs text-gray-600 max-w-sm mb-6 leading-relaxed">
                  Thank you for keeping our community safe. Your report has been logged without any identifying details.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsSubmitted(false);
                    setDescription('');
                    setCategory('Select incident category');
                  }}
                  className="bg-[#D91176] hover:bg-[#b80d63] text-white font-bold py-2.5 px-6 rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Submit Another Report
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Category */}
                <div>
                  <label className="block text-[#D91176] font-semibold mb-1 text-sm">Category*</label>
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-md text-sm text-gray-700 outline-none focus:border-[#D91176] bg-white cursor-pointer"
                  >
                    <option disabled value="Select incident category">Select incident category</option>
                    <option value="Harassment">Harassment</option>
                    <option value="Suspicious Activity">Suspicious Activity</option>
                    <option value="Unsafe Infrastructure">Unsafe Infrastructure</option>
                  </select>
                </div>

                {/* Location */}
                <InputField 
                  label="Location*" 
                  value="Near Ayodya Park, Kebayoran Baru" 
                  readOnly={true}
                  icon={<svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>}
                />

                {/* Timestamp */}
                <InputField 
                  label="Timestamp*" 
                  value="27/07/2026 - 21:45 WIB" 
                  readOnly={true}
                  icon={<svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>}
                />

                {/* Description */}
                <TextAreaField 
                  label="Description" 
                  placeholder="Tell us brief details of what happened" 
                  value={description}
                  onChange={(e: any) => setDescription(e.target.value)}
                />

                {/* Upload */}
                <FileUpload />

                {/* Submit Button */}
                <div className="flex justify-end mt-6">
                  <Button 
                    type="submit" 
                    variant="primary" 
                    className="px-8 disabled:bg-gray-400"
                    disabled={isLoading}
                  >
                    {isLoading ? 'SUBMITTING...' : 'SUBMIT'}
                  </Button>
                </div>

              </form>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}