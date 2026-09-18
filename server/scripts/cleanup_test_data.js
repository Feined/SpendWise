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

async function cleanupTestData() {
  const args = process.argv.slice(2);
  const confirmed = args.includes('--confirm');

  console.log('SpendWise Controlled Development Test Data Cleanup');
  console.log('Safety rule: Only deletes accounts ending strictly in @spendwise.test\n');

  const testUsers = await prisma.user.findMany({
    where: {
      email: {
        endsWith: '@spendwise.test'
      }
    },
    select: {
      id: true,
      email: true,
      name: true
    }
  });

  if (testUsers.length === 0) {
    console.log('No @spendwise.test accounts found to clean up.');
    await prisma.$disconnect();
    return;
  }

  console.log(`Identified ${testUsers.length} test accounts eligible for safe development cleanup:`);
  testUsers.forEach(u => console.log(` - ${u.name} (${u.email}) [${u.id}]`));

  if (!confirmed) {
    console.log('\n[DRY RUN] No records were deleted.');
    console.log('To execute cleanup, re-run with: node scripts/cleanup_test_data.js --confirm');
    await prisma.$disconnect();
    return;
  }

  console.log('\nExecuting controlled cleanup of test accounts...');
  const testUserIds = testUsers.map(u => u.id);

  // Clean up test records
  await prisma.$transaction([
    prisma.refreshToken.deleteMany({ where: { userId: { in: testUserIds } } }),
    prisma.friendship.deleteMany({
      where: {
        OR: [
          { requesterId: { in: testUserIds } },
          { addresseeId: { in: testUserIds } }
        ]
      }
    }),
    prisma.friend.deleteMany({ where: { userId: { in: testUserIds } } }),
    prisma.transaction.deleteMany({ where: { userId: { in: testUserIds } } }),
    prisma.fixedExpense.deleteMany({ where: { monthPlan: { userId: { in: testUserIds } } } }),
    prisma.monthPlan.deleteMany({ where: { userId: { in: testUserIds } } }),
    prisma.userSettings.deleteMany({ where: { userId: { in: testUserIds } } }),
    prisma.settlement.deleteMany({
      where: {
        OR: [
          { fromId: { in: testUserIds } },
          { toId: { in: testUserIds } }
        ]
      }
    }),
    prisma.splitParticipant.deleteMany({ where: { participantId: { in: testUserIds } } }),
    prisma.splitExpense.deleteMany({ where: { createdById: { in: testUserIds } } }),
    prisma.groupMember.deleteMany({ where: { userId: { in: testUserIds } } }),
    prisma.group.deleteMany({ where: { createdById: { in: testUserIds } } }),
    prisma.user.deleteMany({ where: { id: { in: testUserIds } } })
  ]);

  console.log(`✔ Successfully and safely cleaned up ${testUsers.length} test accounts.`);
  const remaining = await prisma.user.count();
  console.log(`Remaining legitimate accounts in database: ${remaining}`);
  await prisma.$disconnect();
}

cleanupTestData().catch(console.error);
