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
    <div className="w-full min-h-screen bg-[#FAFAFA] pt-[72px]">
      {/* Navbar dipasang per halaman, mengikuti pola halaman lain di main. */}
      <header className="fixed top-0 left-0 right-0 h-[72px] z-50 bg-white border-b border-gray-200">
        <Navbar />
      </header>

      <div className="max-w-5xl mx-auto py-6 px-6 md:px-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <h1 className="text-pink-700 text-xl md:text-2xl font-semibold">Incident Reports</h1>
          <Link
            href="/report/new"
            className="px-5 py-2 bg-pink-700 rounded-xl text-white text-sm font-semibold hover:bg-pink-800 transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Report
          </Link>
        </div>

        <ReportList incidents={items} />
      </div>
    </div>
  );
}
