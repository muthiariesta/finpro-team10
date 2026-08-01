import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const body = await request.json();
  const { category, location, timestamp, description } = body;

  if (!category || !location || !timestamp) {
    return NextResponse.json(
      { error: 'category, location, and timestamp are required' },
      { status: 400 }
    );
  }

  const parsedTimestamp = new Date(timestamp);
  if (Number.isNaN(parsedTimestamp.getTime())) {
    return NextResponse.json({ error: 'timestamp is invalid' }, { status: 400 });
  }

  const incident = await prisma.incident.create({
    data: {
      category,
      location,
      timestamp: parsedTimestamp,
      description: description || null,
    },
  });

  return NextResponse.json(incident, { status: 201 });
}
