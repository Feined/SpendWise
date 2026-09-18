import prisma from '../db/prisma.js';
import { monthPlanSchema, validMonth } from '../validators/index.js';

/**
 * Calculates complete SpendWise budget metrics according to product specifications:
 * - incomeForBudget = actualIncome !== 0 ? actualIncome : estimatedIncome
 * - spendableBudget = incomeForBudget - totalFixedExpenses - savingsGoal
 * - remainingToSpend = spendableBudget - variableExpenses
 * - dailyLimit = remainingToSpend / daysRemainingIncludingToday (current month only, >= 0, rounded down)
 */
export function calculateBudgetMetrics(monthPlan, transactions = [], monthKey) {
  const actualIncome = Number(monthPlan?.actualIncome) || 0;
  const estimatedIncome = Number(monthPlan?.estimatedIncome) || 0;
  const savingsGoal = Number(monthPlan?.savingsGoal) || 0;

  // Rule: actualIncome is used when non-zero, otherwise estimatedIncome
  const incomeForBudget = actualIncome !== 0 ? actualIncome : estimatedIncome;

  const totalFixedExpenses = (monthPlan?.fixedExpenses || []).reduce(
    (sum, fe) => sum + (Number(fe.amount) || 0),
    0
  );

  // Rule: spendableBudget = incomeForBudget - totalFixedExpenses - savingsGoal
  const spendableBudget = incomeForBudget - totalFixedExpenses - savingsGoal;
  const spendableBudgetForLimit = Math.max(0, spendableBudget);

  // Variable expenses from transactions (fixed expenses are NEVER treated as variable)
  let variableExpenses = 0;
  let foodTotal = 0;
  let shoppingTotal = 0;

  for (const t of transactions) {
    const amt = Number(t.amount) || 0;
    variableExpenses += amt;
    const cat = (t.category || '').toLowerCase();
    if (cat === 'food') foodTotal += amt;
    if (cat === 'shopping') shoppingTotal += amt;
  }

  // Rule: remainingToSpend = spendableBudget - variableExpenses
  const remainingToSpend = spendableBudget - variableExpenses;

  // Calendar calculations for daily limit
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNum = now.getMonth() + 1;
  const currentMonthKey = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`;

  const isCurrentMonth = monthKey === currentMonthKey;

  let daysRemainingIncludingToday = null;
  let dailyLimit = null;

  if (isCurrentMonth) {
    const daysInMonth = new Date(currentYear, currentMonthNum, 0).getDate();
    const currentDay = now.getDate();
    daysRemainingIncludingToday = Math.max(1, daysInMonth - currentDay + 1);

    // Rule: remaining variable money divided by days remaining including today; never negative
    if (remainingToSpend <= 0) {
      dailyLimit = 0;
    } else {
      dailyLimit = Math.floor((remainingToSpend / daysRemainingIncludingToday) * 100) / 100;
    }
  }

  let statusId = 'on-track';
  if (spendableBudgetForLimit === 0 && variableExpenses === 0) {
    statusId = 'no-room';
  } else if (remainingToSpend < 0) {
    statusId = 'overspent';
  } else if (remainingToSpend === 0) {
    statusId = 'zero-left';
  } else if (
    remainingToSpend > 0 &&
    spendableBudgetForLimit > 0 &&
    remainingToSpend <= 0.15 * spendableBudgetForLimit
  ) {
    statusId = 'tight';
  }

  return {
    monthKey,
    incomeForBudget,
    incomeSource: actualIncome !== 0 ? 'actual' : 'estimated',
    estimatedIncome,
    actualIncome,
    totalFixedExpenses,
    savingsGoal,
    spendableBudget,
    variableExpenses,
    foodTotal,
    shoppingTotal,
    remainingToSpend,
    isCurrentMonth,
    daysRemainingIncludingToday,
    dailyLimit,
    statusId,
  };
}

export async function getMonthPlans(req, res, next) {
  try {
    if (!prisma) {
      return res.status(200).json({
        success: true,
        monthPlans: [],
      });
    }

    const monthPlans = await prisma.monthPlan.findMany({
      where: {
        userId: req.user.id,
      },
      include: {
        fixedExpenses: true,
      },
      orderBy: {
        monthKey: 'desc',
      },
    });

    return res.status(200).json({
      success: true,
      monthPlans,
    });
  } catch (err) {
    next(err);
  }
}

export async function getMonthPlan(req, res, next) {
  try {
    const { month } = req.params;

    if (!validMonth(month)) {
      return res.status(400).json({
        success: false,
        error: 'Month must be in YYYY-MM format between 1900 and 2100',
      });
    }

    if (!prisma) {
      return res.status(200).json({
        success: true,
        monthPlan: null,
        budgetSummary: null,
      });
    }

    const monthPlan = await prisma.monthPlan.findUnique({
      where: {
        userId_monthKey: {
          userId: req.user.id,
          monthKey: month,
        },
      },
      include: {
        fixedExpenses: true,
      },
    });

    if (!monthPlan) {
      return res.status(200).json({
        success: true,
        monthPlan: null,
        budgetSummary: null,
      });
    }

    // Fetch user's variable transactions for this month to compute exact remaining & daily limit
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: req.user.id,
        date: {
          startsWith: month,
        },
      },
      select: {
        amount: true,
        category: true,
        date: true,
      },
    });

    const budgetSummary = calculateBudgetMetrics(monthPlan, transactions, month);

    return res.status(200).json({
      success: true,
      monthPlan,
      budgetSummary,
    });
  } catch (err) {
    next(err);
  }
}

export async function upsertMonthPlan(req, res, next) {
  try {
    const { month } = req.params;

    // Allow monthKey from URL parameter or body
    const bodyWithMonth = {
      ...req.body,
      monthKey: req.body?.monthKey || month,
    };

    const data = monthPlanSchema.parse(bodyWithMonth);

    if (month && month !== data.monthKey) {
      return res.status(400).json({
        success: false,
        error: `Route month parameter (${month}) does not match body monthKey (${data.monthKey})`,
      });
    }

    if (!prisma) {
      const budgetSummary = calculateBudgetMetrics(data, [], data.monthKey);
      return res.status(200).json({
        success: true,
        monthPlan: data,
        budgetSummary,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const plan = await tx.monthPlan.upsert({
        where: {
          userId_monthKey: {
            userId: req.user.id,
            monthKey: data.monthKey,
          },
        },
        update: {
          estimatedIncome: data.estimatedIncome,
          actualIncome: data.actualIncome,
          savingsGoal: data.savingsGoal,
        },
        create: {
          userId: req.user.id,
          monthKey: data.monthKey,
          estimatedIncome: data.estimatedIncome,
          actualIncome: data.actualIncome,
          savingsGoal: data.savingsGoal,
        },
      });

      await tx.fixedExpense.deleteMany({
        where: {
          monthPlanId: plan.id,
        },
      });

      if (data.fixedExpenses.length > 0) {
        await tx.fixedExpense.createMany({
          data: data.fixedExpenses.map((expense) => ({
            monthPlanId: plan.id,
            name: expense.name.trim(),
            amount: expense.amount,
          })),
        });
      }

      return tx.monthPlan.findUnique({
        where: {
          id: plan.id,
        },
        include: {
          fixedExpenses: true,
        },
      });
    });

    // Fetch user's variable transactions for this month to compute exact remaining & daily limit
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: req.user.id,
        date: {
          startsWith: data.monthKey,
        },
      },
      select: {
        amount: true,
        category: true,
        date: true,
      },
    });

    const budgetSummary = calculateBudgetMetrics(result, transactions, data.monthKey);

    return res.status(200).json({
      success: true,
      monthPlan: result,
      budgetSummary,
    });
  } catch (err) {
    next(err);
  }
}