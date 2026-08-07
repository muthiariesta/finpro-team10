import { prisma } from '@/lib/prisma';
import AdminCard from '@/components/admin/AdminCard';
import ReviewQueue from '@/components/admin/ReviewQueue';

/**
 * Antrean verifikasi.
 *
 * Hanya memuat laporan yang belum diputuskan. Setelah diverifikasi laporan
 * pindah ke Public Feed; yang ditolak disimpan tetapi tidak pernah tampil
 * ke pengguna.
 */
export const dynamic = 'force-dynamic';

export default async function AdminReportsPage() {
  const reports = await prisma.incident.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
    // ownerToken tidak pernah dibaca: admin tidak perlu - dan tidak boleh -
    // memegang penanda yang mengaitkan laporan dengan perangkat pelapor.
    select: {
      id: true,
      category: true,
      location: true,
      timestamp: true,
      description: true,
      evidenceUrl: true,
      status: true,
      createdAt: true,
    },
  });

  return (
    <AdminCard
      pill="Community Verification Queue"
      title="Anonymous Incident Reports"
      description="Review incoming crowdsourced incidents and verify or reject report authenticity."
    >
      <ReviewQueue
        initial={reports.map((r) => ({
          ...r,
          timestamp: r.timestamp.toISOString(),
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </AdminCard>
  );
}
