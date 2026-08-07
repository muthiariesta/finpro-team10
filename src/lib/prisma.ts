import { PrismaClient } from '@/generated/prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const connectionString = process.env.DATABASE_URL;

/**
 * Berhenti dengan pesan yang menyebut penyebabnya.
 *
 * Tanpa penjagaan ini, connectionString yang undefined diteruskan begitu saja
 * ke adapter, yang lalu memakai default libpq dan mengeluh soal "host
 * localhost, user <nama user Windows>". Pesan itu menyesatkan: kelihatan
 * seperti masalah database, padahal yang kurang cuma satu baris di .env.local.
 */
if (!connectionString) {
  throw new Error(
    'DATABASE_URL belum tersedia.\n\n' +
      'Buat berkas .env.local di akar proyek (sejajar package.json), isi dengan:\n' +
      '  DATABASE_URL="postgresql://..."\n\n' +
      'Lalu jalankan ulang dev server - Next.js hanya membaca berkas env saat mulai.\n\n' +
      'Di Windows, pastikan namanya benar-benar ".env.local" dan bukan ' +
      '".env.local.txt". File Explorer menyembunyikan ekstensi secara bawaan, ' +
      'jadi berkas yang salah nama akan terlihat benar.'
  );
}

const adapter = new PrismaNeon({ connectionString });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
