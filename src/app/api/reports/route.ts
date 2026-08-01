import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'video/mp4'];

export async function POST(request: Request) {
  const formData = await request.formData();

  const category = formData.get('category');
  const location = formData.get('location');
  const timestamp = formData.get('timestamp');
  const description = formData.get('description');
  const evidence = formData.get('evidence');

  if (!category || !location || !timestamp) {
    return NextResponse.json(
      { error: 'category, location, and timestamp are required' },
      { status: 400 }
    );
  }

  const parsedTimestamp = new Date(timestamp as string);
  if (Number.isNaN(parsedTimestamp.getTime())) {
    return NextResponse.json({ error: 'timestamp is invalid' }, { status: 400 });
  }

  let evidenceUrl: string | null = null;

  if (evidence instanceof File && evidence.size > 0) {
    if (evidence.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'evidence file must be 5MB or smaller' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(evidence.type)) {
      return NextResponse.json({ error: 'evidence must be PNG, JPG, or MP4' }, { status: 400 });
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadsDir, { recursive: true });

    const extension = path.extname(evidence.name) || '';
    const filename = `${randomUUID()}${extension}`;
    const buffer = Buffer.from(await evidence.arrayBuffer());
    await writeFile(path.join(uploadsDir, filename), buffer);

    evidenceUrl = `/uploads/${filename}`;
  }

  const incident = await prisma.incident.create({
    data: {
      category: category as string,
      location: location as string,
      timestamp: parsedTimestamp,
      description: (description as string) || null,
      evidenceUrl,
    },
  });

  return NextResponse.json(incident, { status: 201 });
}
