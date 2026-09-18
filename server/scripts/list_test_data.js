import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
let dbUrl = process.env.DATABASE_URL || '';
try {
  const parsed = new URL(dbUrl);
  if (parsed.hostname.includes('pooler.supabase.com') && !parsed.searchParams.has('sslmode')) {
    parsed.searchParams.set('sslmode', 'disable');
    dbUrl = parsed.toString();
  }
} catch {}

const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } },
});

async function main() {
  const testUsers = await prisma.user.findMany({
    where: {
      email: {
        endsWith: '@spendwise.test'
      }
    },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      _count: {
        select: {
          transactions: true,
          splits: true,
          memberships: true
        }
      }
    }
  });

  console.log(`Found ${testUsers.length} automated test accounts (@spendwise.test):`);
  testUsers.forEach(u => {
    console.log(`- ${u.name} (${u.email}) [ID: ${u.id}]`);
    console.log(`  Transactions: ${u._count.transactions}, Splits: ${u._count.splitExpensesCreated}, Groups: ${u._count.groupMembers}`);
  });

  const totalUsers = await prisma.user.count();
  console.log(`\nTotal users in DB: ${totalUsers}`);
  await prisma.$disconnect();
}

main().catch(console.error);
