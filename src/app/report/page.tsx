import Link from 'next/link';
import { Plus } from 'lucide-react';
import { prisma } from '@/lib/prisma';
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
      description: true,
      evidenceUrl: true,
    },
  });

  const items = incidents.map((incident) => ({
    ...incident,
    timestamp: incident.timestamp.toISOString(),
  }));

  return (
    <div className="w-full min-h-[calc(100vh-80px)] bg-[#FAFAFA] py-6 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-pink-700 text-2xl font-semibold">Incident Reports</h1>
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
