import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'video/mp4'];

/**
 * Batas jumlah lampiran. Bukan batas teknis, melainkan batas kesabaran:
 * tiap berkas diunggah berurutan, dan formulir yang menggantung satu menit
 * membuat orang menutupnya sebelum laporan terkirim.
 */
const MAX_FILES = 5;

/**
 * Koordinat bersifat opsional, jadi nilai yang hilang atau tidak masuk akal
 * disimpan sebagai null - bukan ditolak. Laporan tanpa titik peta masih
 * merupakan laporan yang sah dan berguna.
 */
function toCoord(raw: FormDataEntryValue | null): number | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) && Math.abs(n) <= 180 ? n : null;
}

export async function POST(request: Request) {
  const formData = await request.formData();

  const category = formData.get('category');
  const location = formData.get('location');
  const timestamp = formData.get('timestamp');
  const description = formData.get('description');
  const ownerToken = formData.get('ownerToken');
  const lat = formData.get('lat');
  const lon = formData.get('lon');
  const locationSource = formData.get('locationSource');

  // getAll: formulir mengirim satu field 'evidence' berulang kali, satu per
  // berkas. get() hanya akan mengambil yang pertama dan diam-diam membuang
  // sisanya - persis jenis kehilangan yang tidak akan pernah dilaporkan
  // pengguna karena layarnya tetap menyatakan berhasil.
  const files = formData
    .getAll('evidence')
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (!category || !location || !timestamp) {
    return NextResponse.json(
      { error: 'category, location, and timestamp are required' },
      { status: 400 }
    );
  }

  if (!ownerToken || typeof ownerToken !== 'string') {
    return NextResponse.json({ error: 'ownerToken is required' }, { status: 400 });
  }

  const parsedTimestamp = new Date(timestamp as string);
  if (Number.isNaN(parsedTimestamp.getTime())) {
    return NextResponse.json({ error: 'timestamp is invalid' }, { status: 400 });
  }

  if (files.length > MAX_FILES) {
    return NextResponse.json(
      { error: `Please attach at most ${MAX_FILES} files` },
      { status: 400 }
    );
  }

  const evidenceUrls: string[] = [];

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `"${file.name}" is larger than 5MB` },
        { status: 400 }
      );
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `"${file.name}" must be PNG, JPG, or MP4` },
        { status: 400 }
      );
    }

    // Kegagalan unggah tidak boleh muncul sebagai 500 tanpa penjelasan.
    // Penyebab paling sering adalah BLOB_READ_WRITE_TOKEN yang belum diisi
    // atau sudah kedaluwarsa, dan pelapor perlu tahu bahwa laporannya bisa
    // tetap dikirim tanpa lampiran.
    try {
      const blob = await put(`evidence/${file.name}`, file, {
        access: 'public',
        addRandomSuffix: true,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      evidenceUrls.push(blob.url);
    } catch (err) {
      console.error('[reports] gagal mengunggah bukti:', String(err));
      return NextResponse.json(
        {
          error:
            'Could not upload the attached file. Please try again, or submit the report without evidence.',
        },
        { status: 502 }
      );
    }
  }

  const incident = await prisma.incident.create({
    data: {
      category: category as string,
      location: location as string,
      timestamp: parsedTimestamp,
      description: (description as string) || null,
      evidenceUrls,
      // Lampiran pertama juga disimpan di kolom lama agar tampilan yang
      // belum diperbarui tetap menampilkan sesuatu, bukan kosong.
      evidenceUrl: evidenceUrls[0] ?? null,
      lat: toCoord(lat),
      lon: toCoord(lon),
      locationSource: typeof locationSource === 'string' ? locationSource : null,
      ownerToken,
    },
  });

  // ownerToken tidak dikembalikan; klien sudah menyimpannya sendiri, dan
  // token itu satu-satunya bukti kepemilikan laporan anonim ini.
  const { ownerToken: _omit, ...safe } = incident;
  return NextResponse.json(safe, { status: 201 });
}
