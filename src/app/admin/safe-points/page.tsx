import { prisma } from '@/lib/prisma';
import SafePointRegistry from '@/components/admin/SafePointRegistry';

export const dynamic = 'force-dynamic';

export default async function AdminSafePointsPage() {
  const points = await prisma.safePointEntry.findMany({ orderBy: { createdAt: 'desc' } });

  return (
    <SafePointRegistry
      initial={points.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() }))}
    />
  );
}
