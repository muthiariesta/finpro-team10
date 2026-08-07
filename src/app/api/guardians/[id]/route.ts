import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveOwnerScope } from '@/lib/ownerScope';

/** Menghapus kontak darurat; hanya perangkat pemiliknya yang boleh. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const ownerToken = await resolveOwnerScope(body.ownerToken);

  if (!ownerToken) {
    return NextResponse.json({ error: 'ownerToken is required' }, { status: 400 });
  }

  const guardian = await prisma.guardian.findUnique({ where: { id } });

  if (!guardian) {
    return NextResponse.json({ error: 'contact not found' }, { status: 404 });
  }

  const owners = [ownerToken, body.ownerToken].filter(Boolean);
  if (!owners.includes(guardian.ownerToken)) {
    return NextResponse.json(
      { error: 'not authorized to delete this contact' },
      { status: 403 }
    );
  }

  await prisma.guardian.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
