/**
 * Menyiapkan dua akun demo, satu per peran.
 *
 * Memakai upsert supaya aman dijalankan berulang kali: menjalankan ulang
 * hanya menyegarkan sandi, tidak menggandakan akun.
 */
import bcrypt from 'bcryptjs';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import 'dotenv/config';

const prisma = new PrismaClient({
  adapter: new PrismaNeon({
    connectionString: (process.env.DATABASE_URL ??
      process.env.DATABASE_POSTGRES_URL ??
      process.env.POSTGRES_URL)!,
  }),
});

const ACCOUNTS = [
  { name: 'Jane Doe', identifier: 'user@safeher.org', password: 'safeher123', role: 'USER' as const },
  { name: 'SafeHer Admin', identifier: 'admin@safeher.org', password: 'admin123456', role: 'ADMIN' as const },
];

async function main() {
  for (const a of ACCOUNTS) {
    const passwordHash = await bcrypt.hash(a.password, 10);
    await prisma.user.upsert({
      where: { identifier: a.identifier },
      update: { passwordHash, role: a.role, name: a.name },
      create: { name: a.name, identifier: a.identifier, passwordHash, role: a.role },
    });
    console.log(`  ${a.role.padEnd(5)}  ${a.identifier}  /  ${a.password}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
