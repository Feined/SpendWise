import prisma from '../db/prisma.js';
import { migrationSchema } from '../validators/index.js';

export async function migrateLocalData(req, res, next) {
  try {
    const validatedData = migrationSchema.parse(req.body);
    const { settings, monthPlans, transactions, friends, groups, splitExpenses, settlements } = validatedData;

    if (!prisma) {
      return res.status(200).json({
        success: true,
        message: 'Running in local mode. Local data preserved in browser storage.',
        counts: {
          monthPlans: monthPlans?.length || 0,
          transactions: transactions?.length || 0,
          friends: friends?.length || 0,
          groups: groups?.length || 0,
          splits: splitExpenses?.length || 0,
          settlements: settlements?.length || 0,
        },
      });
    }

    const userId = req.user.id;

    const counts = await prisma.$transaction(async (tx) => {
      // 1. Sync Settings
      if (settings) {
        await tx.userSettings.upsert({
          where: { userId },
          update: {
            currencyCode: settings.currencyCode || 'INR',
            currencySymbol: settings.currencySymbol || '₹',
            theme: settings.theme || 'system',
            accentColor: settings.accentColor || 'emerald',
            dateFormat: settings.dateFormat || 'DD/MM/YYYY',
            budgetWarnings: settings.budgetWarnings ?? true,
            dailyReminder: settings.dailyReminder ?? false,
            splitReminders: settings.splitReminders ?? true,
          },
          create: {
            userId,
            currencyCode: settings.currencyCode || 'INR',
            currencySymbol: settings.currencySymbol || '₹',
            theme: settings.theme || 'system',
            accentColor: settings.accentColor || 'emerald',
            dateFormat: settings.dateFormat || 'DD/MM/YYYY',
            budgetWarnings: settings.budgetWarnings ?? true,
            dailyReminder: settings.dailyReminder ?? false,
            splitReminders: settings.splitReminders ?? true,
          },
        });
      }

      // 2. Sync MonthPlans & FixedExpenses
      let monthPlanCount = 0;
      if (Array.isArray(monthPlans)) {
        for (const plan of monthPlans) {
          const monthKey = plan.monthKey || plan.month;
          if (!monthKey || typeof monthKey !== 'string') continue;
          const createdPlan = await tx.monthPlan.upsert({
            where: {
              userId_monthKey: { userId, monthKey },
            },
            update: {
              estimatedIncome: Number(plan.estimatedIncome) || 0,
              actualIncome: Number(plan.actualIncome) || 0,
              savingsGoal: Number(plan.savingsGoal) || 0,
            },
            create: {
              userId,
              monthKey,
              estimatedIncome: Number(plan.estimatedIncome) || 0,
              actualIncome: Number(plan.actualIncome) || 0,
              savingsGoal: Number(plan.savingsGoal) || 0,
            },
          });

          await tx.fixedExpense.deleteMany({ where: { monthPlanId: createdPlan.id } });
          if (Array.isArray(plan.fixedExpenses) && plan.fixedExpenses.length > 0) {
            await tx.fixedExpense.createMany({
              data: plan.fixedExpenses
                .filter((fe) => fe && fe.name)
                .map((fe) => ({
                  monthPlanId: createdPlan.id,
                  name: String(fe.name).trim(),
                  amount: Number(fe.amount) || 0,
                })),
            });
          }
          monthPlanCount++;
        }
      }

      // 3. Sync Transactions
      let txCount = 0;
      if (Array.isArray(transactions)) {
        for (const t of transactions) {
          if (!t.date || !t.amount) continue;
          await tx.transaction.create({
            data: {
              userId,
              date: String(t.date),
              amount: Number(t.amount) || 0,
              category: t.category || t.categoryId || 'Other',
              merchant: t.merchant || t.label || null,
              note: t.note || null,
              needWant: t.needWant || 'need',
              plannedUnplanned: t.plannedUnplanned || 'planned',
              source: t.source || 'migrated',
            },
          });
          txCount++;
        }
      }

      // 4. Sync Friends
      let friendCount = 0;
      if (Array.isArray(friends)) {
        for (const f of friends) {
          if (!f.name) continue;
          const trimmedName = String(f.name).trim();
          const existing = await tx.friend.findFirst({
            where: { userId, name: { equals: trimmedName, mode: 'insensitive' } },
          });

          if (!existing) {
            await tx.friend.create({
              data: {
                userId,
                name: trimmedName,
                avatar: f.avatar || null,
                email: f.email ? String(f.email).trim().toLowerCase() : null,
              },
            });
            friendCount++;
          }
        }
      }

      // 5. Sync Groups (Map local IDs to new DB IDs)
      let groupCount = 0;
      const groupIdMap = new Map();
      if (Array.isArray(groups)) {
        for (const g of groups) {
          if (!g.name) continue;
          const memberList = Array.isArray(g.members)
            ? g.members.map((m) => (typeof m === 'string' ? m : m.name || 'Member'))
            : [];

          const uniqueMemberNames = Array.from(
            new Set(
              memberList
                .map((m) => String(m).trim())
                .filter((m) => m.length > 0 && m.toLowerCase() !== 'you')
            )
          );

          const createdGroup = await tx.group.create({
            data: {
              createdById: userId,
              name: String(g.name).trim(),
              avatar: g.avatar || null,
              currency: g.currency || 'INR',
              members: {
                create: [
                  { name: 'You', role: 'ADMIN', userId },
                  ...uniqueMemberNames.map((name) => ({
                    name,
                    role: 'MEMBER',
                  })),
                ],
              },
            },
          });

          if (g.id) {
            groupIdMap.set(String(g.id), createdGroup.id);
          }
          groupCount++;
        }
      }

      // 6. Sync Split Expenses (Map local split IDs to DB IDs)
      let splitCount = 0;
      const splitIdMap = new Map();
      if (Array.isArray(splitExpenses)) {
        for (const s of splitExpenses) {
          if (!s.title || !s.totalAmount) continue;

          const rawGroupId = s.groupId ? String(s.groupId) : null;
          const mappedGroupId = rawGroupId ? (groupIdMap.get(rawGroupId) || null) : null;

          const participants = Array.isArray(s.participants) && s.participants.length > 0
            ? s.participants.map((p) => ({
                participantId: p.participantId ? String(p.participantId) : `p-${Date.now()}`,
                participantName: String(p.participantName || p.name || 'Participant').trim(),
                shareAmount: Number(p.shareAmount) || 0,
                percentage: p.percentage != null ? Number(p.percentage) : null,
                shares: p.shares != null ? Number(p.shares) : null,
                amountPaid: Number(p.amountPaid) || 0,
                balance: Number(p.balance) != null ? Number(p.balance) : Math.max(0, (Number(p.shareAmount) || 0) - (Number(p.amountPaid) || 0)),
                settledAmount: Number(p.settledAmount) || 0,
              }))
            : [
                {
                  participantId: userId,
                  participantName: 'You',
                  shareAmount: Number(s.totalAmount) || 0,
                  amountPaid: Number(s.totalAmount) || 0,
                  balance: 0,
                  settledAmount: 0,
                },
              ];

          const createdSplit = await tx.splitExpense.create({
            data: {
              createdById: userId,
              groupId: mappedGroupId,
              title: String(s.title).trim(),
              totalAmount: Number(s.totalAmount) || 0,
              currency: s.currency || 'INR',
              paidById: s.paidById ? String(s.paidById) : userId,
              payerName: s.payerName ? String(s.payerName).trim() : 'You',
              splitMethod: s.splitMethod || 'EQUALLY',
              date: s.date || new Date().toISOString().slice(0, 10),
              notes: s.notes || null,
              status: s.status || 'ACTIVE',
              participants: {
                create: participants,
              },
            },
          });

          if (s.id) {
            splitIdMap.set(String(s.id), createdSplit.id);
          }
          splitCount++;
        }
      }

      // 7. Sync Settlements
      let settlementCount = 0;
      if (Array.isArray(settlements)) {
        for (const st of settlements) {
          if (!st.fromName || !st.toName || !st.amount) continue;

          const rawExpenseId = st.expenseId ? String(st.expenseId) : null;
          const mappedExpenseId = rawExpenseId ? (splitIdMap.get(rawExpenseId) || null) : null;

          await tx.settlement.create({
            data: {
              expenseId: mappedExpenseId,
              fromId: st.fromId ? String(st.fromId) : 'unknown-from',
              fromName: String(st.fromName).trim(),
              toId: st.toId ? String(st.toId) : 'unknown-to',
              toName: String(st.toName).trim(),
              amount: Number(st.amount) || 0,
              currency: st.currency || 'INR',
              status: st.status || 'SETTLED',
              note: st.note || null,
              settledAt: st.settledAt ? new Date(st.settledAt) : new Date(),
            },
          });
          settlementCount++;
        }
      }

      return {
        monthPlans: monthPlanCount,
        transactions: txCount,
        friends: friendCount,
        groups: groupCount,
        splits: splitCount,
        settlements: settlementCount,
      };
    });

    return res.status(200).json({
      success: true,
      message: 'Local data successfully migrated and persisted to your SpendWise cloud account',
      counts,
    });
  } catch (err) {
    next(err);
  }
}
