/**
 * SpendWise Smart Financial Insights Engine
 * 
 * Deterministic, rule-based analytics derived from actual user transactions and budget data.
 * Pure logic without artificial or fabricated statistics.
 */

import { formatCurrency } from './budget.js';
import { getCategoryById } from '../constants/categories.js';

/**
 * Generates structured, deterministic insights from active financial data.
 * 
 * @param {object} params
 * @param {object} params.budgetSnapshot Output of calculateBudget()
 * @param {Array} params.transactions Transactions for the current month
 * @param {object} [params.previousMonthSnapshot=null] Previous month's snapshot if available
 * @returns {Array<{ id: string, type: 'alert'|'warning'|'success'|'info', title: string, description: string, metric?: string, icon?: string }>}
 */
export function generateSmartInsights({
  budgetSnapshot,
  transactions = [],
  previousMonthSnapshot = null
}) {
  const insights = [];

  if (!budgetSnapshot || !budgetSnapshot.hasPlan) {
    return [
      {
        id: 'no-plan',
        type: 'info',
        title: 'No Plan Configured',
        description: 'Set up your monthly income, fixed bills, and savings target to unlock financial intelligence.',
        metric: 'Setup Required',
        icon: 'SlidersHorizontal'
      }
    ];
  }

  // If user has zero transactions this month
  if (!transactions || transactions.length === 0) {
    return [
      {
        id: 'no-transactions',
        type: 'info',
        title: 'Not Enough Data Yet',
        description: 'Add a few transactions or scan a payment receipt to start detecting spending patterns and insights.',
        metric: '0 Transactions',
        icon: 'Sparkles'
      }
    ];
  }

  const {
    spendableBudget,
    variableExpenses,
    remainingAmount,
    savingsGoal,
    isNegative
  } = budgetSnapshot;

  // 1. Critical Overspending / Negative Budget Alert
  if (isNegative || remainingAmount < 0) {
    insights.push({
      id: 'overspent',
      type: 'alert',
      title: 'Variable Spending Exceeded',
      description: `You have spent ${formatCurrency(Math.abs(remainingAmount))} beyond your spendable variable budget. This deficit now cuts into your savings target or rent reserve.`,
      metric: `Deficit: ${formatCurrency(Math.abs(remainingAmount))}`,
      icon: 'AlertTriangle'
    });
  }

  // 2. Category Aggregations & Largest Category
  const categoryTotals = {};
  const categoryCounts = {};

  transactions.forEach((t) => {
    const cid = t.categoryId || 'other';
    const amt = Number(t.amount) || 0;
    categoryTotals[cid] = (categoryTotals[cid] || 0) + amt;
    categoryCounts[cid] = (categoryCounts[cid] || 0) + 1;
  });

  const sortedCategories = Object.entries(categoryTotals).sort(
    ([, a], [, b]) => b - a
  );

  if (sortedCategories.length > 0) {
    const [topCid, topAmt] = sortedCategories[0];
    const topCat = getCategoryById(topCid);
    const topCount = categoryCounts[topCid] || 1;
    const topPct = variableExpenses > 0 ? Math.round((topAmt / variableExpenses) * 100) : 0;
    const avgTx = Math.round(topAmt / topCount);

    insights.push({
      id: 'top-category',
      type: topPct > 40 ? 'warning' : 'info',
      title: `${topCat.emoji} ${topCat.name} is Your Largest Expense`,
      description: `You spent ${formatCurrency(topAmt)} across ${topCount} purchases in ${topCat.name} (${topPct}% of your variable spending). Average purchase: ${formatCurrency(avgTx)}.`,
      metric: `${topPct}% of Spend`,
      icon: 'PieChart'
    });
  }

  // 3. Needs vs Wants Analysis
  let needsTotal = 0;
  let wantsTotal = 0;
  let taggedCount = 0;

  transactions.forEach((t) => {
    const amt = Number(t.amount) || 0;
    if (t.nature === 'need') {
      needsTotal += amt;
      taggedCount++;
    } else if (t.nature === 'want') {
      wantsTotal += amt;
      taggedCount++;
    }
  });

  if (taggedCount > 0 && variableExpenses > 0) {
    const wantsPct = Math.round((wantsTotal / variableExpenses) * 100);
    if (wantsPct > 35) {
      insights.push({
        id: 'high-wants',
        type: 'warning',
        title: 'Discretionary Wants Ratio',
        description: `You allocated ${wantsPct}% (${formatCurrency(wantsTotal)}) of your variable spending to lifestyle wants. Reducing discretionary orders could save up to ${formatCurrency(Math.round(wantsTotal * 0.25))} this month.`,
        metric: `${wantsPct}% Wants`,
        icon: 'Sparkles'
      });
    } else {
      insights.push({
        id: 'good-wants',
        type: 'success',
        title: 'Disciplined Spending Balance',
        description: `Excellent discipline! Only ${wantsPct}% (${formatCurrency(wantsTotal)}) was spent on discretionary wants, keeping essential commitments guarded.`,
        metric: `${wantsPct}% Wants`,
        icon: 'ShieldCheck'
      });
    }
  }

  // 4. Most Frequent Merchant Detection
  const merchantCounts = {};
  const merchantTotals = {};

  transactions.forEach((t) => {
    const m = t.label ? t.label.trim() : 'Unknown';
    if (m && m !== 'Unknown') {
      merchantCounts[m] = (merchantCounts[m] || 0) + 1;
      merchantTotals[m] = (merchantTotals[m] || 0) + (Number(t.amount) || 0);
    }
  });

  const sortedMerchants = Object.entries(merchantCounts).sort(
    ([, a], [, b]) => b - a
  );

  if (sortedMerchants.length > 0 && sortedMerchants[0][1] >= 3) {
    const [topMerchant, count] = sortedMerchants[0];
    const totalSpentAtMerchant = merchantTotals[topMerchant] || 0;

    insights.push({
      id: 'frequent-merchant',
      type: 'info',
      title: `Frequent Merchant: ${topMerchant}`,
      description: `You have made ${count} separate transactions at ${topMerchant} totaling ${formatCurrency(totalSpentAtMerchant)} this month.`,
      metric: `${count} Purchases`,
      icon: 'Repeat'
    });
  }

  // 5. Savings Trajectory & Protection
  if (remainingAmount >= 0 && savingsGoal > 0) {
    insights.push({
      id: 'savings-on-track',
      type: 'success',
      title: 'Savings Goal Protected',
      description: `Your full monthly target of ${formatCurrency(savingsGoal)} remains intact with ${formatCurrency(remainingAmount)} remaining for variable spending.`,
      metric: '100% Intact',
      icon: 'Target'
    });
  }

  // 6. Month-over-Month Comparison
  if (previousMonthSnapshot && previousMonthSnapshot.hasPlan && previousMonthSnapshot.variableExpenses > 0) {
    const prevVar = previousMonthSnapshot.variableExpenses;
    const diff = variableExpenses - prevVar;
    const pctDiff = Math.round((Math.abs(diff) / prevVar) * 100);

    if (diff > 0) {
      insights.push({
        id: 'mom-increase',
        type: 'warning',
        title: 'Spending Higher Than Last Month',
        description: `Your variable expenses are currently ${pctDiff}% (${formatCurrency(diff)}) higher compared to the previous month (${formatCurrency(prevVar)}).`,
        metric: `+${pctDiff}% vs Last Month`,
        icon: 'TrendingUp'
      });
    } else if (diff < 0) {
      insights.push({
        id: 'mom-decrease',
        type: 'success',
        title: 'Spending Lower Than Last Month',
        description: `You are currently spending ${pctDiff}% (${formatCurrency(Math.abs(diff))}) less than the previous month (${formatCurrency(prevVar)}). Great habit pacing!`,
        metric: `-${pctDiff}% vs Last Month`,
        icon: 'TrendingDown'
      });
    }
  }

  // 7. Recent 7-Day Velocity
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysStr = sevenDaysAgo.toISOString().split('T')[0];
  const recent7DayTxs = transactions.filter((t) => t.date && t.date >= sevenDaysStr);
  const recent7DayTotal = recent7DayTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  if (recent7DayTotal > 0 && spendableBudget > 0) {
    const weeklyBudgetPace = Math.round((spendableBudget / 30) * 7);
    const isAboveWeeklyPace = weeklyBudgetPace > 0 && recent7DayTotal > weeklyBudgetPace;
    insights.push({
      id: 'velocity-7day',
      type: isAboveWeeklyPace ? 'warning' : 'info',
      title: '7-Day Velocity Signal',
      description: `You spent ${formatCurrency(recent7DayTotal)} in the last 7 days across ${recent7DayTxs.length} transactions.${
        weeklyBudgetPace > 0
          ? ` Expected 7-day pace: ~${formatCurrency(weeklyBudgetPace)}.`
          : ''
      }`,
      metric: `${formatCurrency(recent7DayTotal)} / 7d`,
      icon: 'Activity'
    });
  }

  // 8. Unplanned Purchases Signal
  const unplannedTxs = transactions.filter((t) => t.planned === false);
  if (unplannedTxs.length > 0) {
    const unplannedSum = unplannedTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    insights.push({
      id: 'unplanned-signal',
      type: 'warning',
      title: 'Unplanned Purchases Detected',
      description: `You have ${unplannedTxs.length} unplanned purchases totaling ${formatCurrency(unplannedSum)} this month. Pre-allocating variable allowances guards your savings goal.`,
      metric: `${unplannedTxs.length} Purchases`,
      icon: 'AlertCircle'
    });
  }

  return insights;
}
