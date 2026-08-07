import { prisma } from '@/lib/prisma';
import RiskAreaTable from '@/components/admin/RiskAreaTable';

export const dynamic = 'force-dynamic';

export default async function AdminRiskAreasPage() {
  const areas = await prisma.riskArea.findMany({ orderBy: { createdAt: 'desc' } });

  return (
    <RiskAreaTable
      initial={areas.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      }))}
    />
  );
}
