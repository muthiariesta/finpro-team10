import Link from 'next/link';
import { Plus } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { Navbar } from '@/components/Navbar';
import ReportList from '@/components/ReportList';

export const dynamic = 'force-dynamic';

export default async function ReportListPage() {
  const incidents = await prisma.incident.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      category: true,
      location: true,
      timestamp: true,
      createdAt: true,
      description: true,
      evidenceUrl: true,
    },
  });

  // ownerToken sengaja TIDAK ikut dikirim ke klien. Token itu satu-satunya
  // bukti kepemilikan; membocorkannya berarti siapa pun bisa menghapus
  // laporan orang lain.
  const items = incidents.map((incident) => ({
    ...incident,
    timestamp: incident.timestamp.toISOString(),
    createdAt: incident.createdAt.toISOString(),
  }));

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900 font-sans flex flex-col">
      {/* Header disamakan dengan halaman Emergency agar seragam */}
      <header className="fixed top-0 left-0 right-0 h-[72px] z-50 bg-white border-b border-gray-200">
        <Navbar />
      </header>

      <main className="max-w-6xl mx-auto w-full pt-[96px] pb-12 px-4 sm:px-6 flex-1">
        {/* Banner header mengikuti pola halaman Emergency agar seragam */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-6 mb-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="inline-block text-[10px] font-extrabold text-[#D91176] bg-pink-50 px-3 py-1 rounded-full uppercase tracking-wider mb-2 border border-pink-100">
              COMMUNITY SAFETY LOG
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight mb-1">
              Incident Reports
            </h1>
            <p className="text-xs font-medium text-gray-500">
              Reports are submitted anonymously and help other women assess an area before travelling.
            </p>
          </div>

          <Link
            href="/report/new"
            className="bg-[#D91176] hover:bg-[#b80d63] text-white font-bold py-2.5 px-5 rounded-xl text-xs tracking-wide transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            Add Report
          </Link>
        </div>

        <ReportList incidents={items} />
      </main>
    </div>
  );
}
