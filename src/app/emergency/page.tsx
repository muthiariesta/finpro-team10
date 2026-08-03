'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';

interface Guardian {
  id: string;
  name: string;
  role: string;
  isPrimary?: boolean;
  phone: string;
  channels: string[];
  initial: string;
}

export default function EmergencyPage() {
  const [guardians, setGuardians] = useState<Guardian[]>([
    {
      id: '1',
      name: 'Mother',
      role: 'Primary Parent',
      isPrimary: true,
      phone: '+6281234567890',
      channels: ['WhatsApp', 'SMS'],
      initial: 'M',
    },
    {
      id: '2',
      name: 'Budi Santoso',
      role: 'Guardian',
      isPrimary: false,
      phone: '+6281399887766',
      channels: ['WhatsApp', 'SMS'],
      initial: 'B',
    },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('Guardian');
  const [newPhone, setNewPhone] = useState('');
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    setGuardians((prev) => prev.filter((g) => g.id !== id));
  };

  const handleSendTestAlert = (name: string) => {
    setAlertMessage(`🚨 Test SOS alert successfully sent to ${name} via WhatsApp & SMS!`);
    setTimeout(() => setAlertMessage(null), 4000);
  };

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone) return;

    const newGuardian: Guardian = {
      id: Date.now().toString(),
      name: newName,
      role: newRole,
      isPrimary: false,
      phone: newPhone,
      channels: ['WhatsApp', 'SMS'],
      initial: newName.charAt(0).toUpperCase(),
    };

    setGuardians([...guardians, newGuardian]);
    setNewName('');
    setNewPhone('');
    setIsModalOpen(false);
  };

  return (
    /* 🔴 DIKUNCI PAKAI bg-[#F8F9FA] DAN text-gray-900 */
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900 font-sans flex flex-col">
      
      {/* NAVBAR FIXED ATAS */}
      <header className="fixed top-0 left-0 right-0 h-[72px] z-50 bg-white border-b border-gray-200">
        <Navbar />
      </header>

      {/* KONTEN UTAMA */}
      <main className="max-w-6xl mx-auto w-full pt-[96px] pb-12 px-6 flex-1">
        {alertMessage && (
          <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center justify-between shadow-sm animate-fadeIn">
            <span>{alertMessage}</span>
            <button
              onClick={() => setAlertMessage(null)}
              className="text-emerald-600 hover:text-emerald-900 font-extrabold"
            >
              ✕
            </button>
          </div>
        )}

        {/* 1. TOP HEADER BANNER CARD */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-6 mb-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="inline-block text-[10px] font-extrabold text-[#D91176] bg-pink-50 px-3 py-1 rounded-full uppercase tracking-wider mb-2 border border-pink-100">
              TRUSTED GUARDIAN CIRCLE
            </span>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight mb-1">
              Emergency Contacts &amp; Guardians
            </h1>
            <p className="text-xs font-medium text-gray-500">
              Guardians receive real-time SOS alerts, audio clips, and live tracking links via WhatsApp or SMS.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-[#D91176] hover:bg-[#b80d63] text-white font-bold py-2.5 px-5 rounded-xl text-xs tracking-wide transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm self-start md:self-auto"
          >
            <span className="text-base leading-none">+</span> Add New Contact
          </button>
        </div>

        {/* 2. EMERGENCY CONTACT CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {guardians.map((guardian) => (
            <div
              key={guardian.id}
              className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-pink-50 text-[#D91176] font-extrabold rounded-2xl flex items-center justify-center text-base border border-pink-100">
                      {guardian.initial}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-gray-900 text-sm">
                          {guardian.name}
                        </h3>
                        {guardian.isPrimary && (
                          <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                            Primary
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-medium text-gray-400 flex items-center gap-1 mt-0.5">
                        <span className="text-pink-500">♡</span> {guardian.role}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(guardian.id)}
                    className="text-gray-300 hover:text-rose-500 p-1 transition-colors cursor-pointer"
                    title="Delete guardian"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100 space-y-2 mb-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 font-medium flex items-center gap-1.5 text-[11px]">
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      Phone:
                    </span>
                    <span className="font-extrabold text-gray-900 tracking-tight">
                      {guardian.phone}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-200/60">
                    <span className="text-gray-400 font-medium text-[11px]">Alert Channels:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                        💬 WhatsApp
                      </span>
                      <span className="text-[10px] font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                        📱 SMS
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Active Guardian
                </div>

                <button
                  onClick={() => handleSendTestAlert(guardian.name)}
                  className="text-[11px] font-bold text-[#D91176] hover:underline cursor-pointer transition-colors"
                >
                  Send Test Alert
                </button>
              </div>
            </div>
          ))}
        </div>

{/* MODAL POPUP: ADD EMERGENCY GUARDIAN */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-7 shadow-2xl border border-gray-100 animate-fadeIn relative">
              
              {/* 1. HEADER MODAL */}
              <div className="flex justify-between items-center pb-5 mb-5 border-b border-gray-100">
                <div className="flex items-center gap-2.5 text-[#D91176]">
                  {/* Icon User Pink */}
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <h3 className="font-extrabold text-gray-900 text-xl tracking-tight">
                    Add Emergency Guardian
                  </h3>
                </div>

                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-700 transition-colors cursor-pointer p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* 2. FORM ISIAN */}
              <form onSubmit={handleAddContact} className="space-y-4">
                
                {/* FIELD 1: FULL NAME */}
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Srikandi Mother / Budi Santoso"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-2xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#D91176] transition-colors"
                  />
                </div>

                {/* FIELD 2: RELATIONSHIP DROPDOWN */}
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1.5">
                    Relationship
                  </label>
                  <div className="relative">
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-2xl px-4 py-3 text-gray-700 bg-white appearance-none cursor-pointer focus:outline-none focus:border-[#D91176] transition-colors"
                    >
                      <option value="Mother / Parent">Mother / Parent</option>
                      <option value="Father / Parent">Father / Parent</option>
                      <option value="Sibling / Relative">Sibling / Relative</option>
                      <option value="Partner / Friend">Partner / Friend</option>
                      <option value="Guardian">Guardian</option>
                    </select>

                    {/* Chevron Down Icon */}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* FIELD 3: PHONE NUMBER */}
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1.5">
                    Phone Number (WhatsApp Active)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+6281399887766"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-2xl px-4 py-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#D91176] transition-colors"
                  />
                </div>

                {/* FIELD 4: CHECKBOX PRIMARY GUARDIAN */}
                <div className="flex items-center gap-2.5 pt-1">
                  <input
                    type="checkbox"
                    id="isPrimary"
                    className="w-4 h-4 rounded border-gray-300 text-[#D91176] focus:ring-[#D91176] cursor-pointer"
                  />
                  <label htmlFor="isPrimary" className="text-xs font-semibold text-gray-800 cursor-pointer select-none">
                    Set as Primary Parent / Guardian
                  </label>
                </div>

                {/* FIELD 5: FOOTER BUTTONS */}
                <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 text-xs font-bold text-gray-700 hover:text-black transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 text-xs font-bold text-white bg-[#D91176] hover:bg-[#b80d63] rounded-full transition-colors cursor-pointer shadow-sm"
                  >
                    Save Contact
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