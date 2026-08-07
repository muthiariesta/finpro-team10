import { prisma } from '@/lib/prisma';
import AdminCard from '@/components/admin/AdminCard';
import PublishedList from '@/components/admin/PublishedList';

/** Laporan yang sudah diverifikasi dan kini terlihat oleh seluruh pengguna. */
export const dynamic = 'force-dynamic';

export default async function AdminPublicFeedPage() {
  const reports = await prisma.incident.findMany({
    where: { status: 'VERIFIED' },
    orderBy: { reviewedAt: 'desc' },
    select: {
      id: true,
      category: true,
      location: true,
      timestamp: true,
      description: true,
      createdAt: true,
    },
  });

  return (
    <AdminCard
      pill="Public Community Feed"
      pillTone="amber"
      title="Manage Published Reports"
      description="Monitor, update status, and provide feedback on crowdsourced safety incidents displayed to users."
    >
      <PublishedList
        initial={reports.map((r) => ({
          ...r,
          timestamp: r.timestamp.toISOString(),
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </AdminCard>
  );
}
