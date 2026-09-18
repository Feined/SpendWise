import { Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import {
  formatMonthDisplay,
  getNeedsVsWantsBreakdown,
  getPlannedVsUnplannedBreakdown
} from '../../lib/budget';
import { getCategoryById } from '../../constants/categories';
import { useSpendWise } from '../../context/SpendWiseContext';

export function MonthInReview({
  budgetSnapshot,
  monthKey,
  transactions = [],
  previousMonthSnapshot = null
}) {
  const { formatAppMoney } = useSpendWise();
  if (!budgetSnapshot || !budgetSnapshot.hasPlan) return null;

  const monthTransactions = transactions.filter(
    (t) => (t.date && t.date.startsWith(monthKey)) || t.monthKey === monthKey
  );

  const needsWants = getNeedsVsWantsBreakdown(monthKey, transactions);
  const plannedUnplanned = getPlannedVsUnplannedBreakdown(monthKey, transactions);

  // Find largest transaction
  const largestTx = monthTransactions.reduce(
    (max, t) => ((Number(t.amount) || 0) > (Number(max?.amount) || 0) ? t : max),
    null
  );

  // Find largest category
  const catTotals = {};
  monthTransactions.forEach((t) => {
    const cid = t.categoryId || 'other';
    catTotals[cid] = (catTotals[cid] || 0) + (Number(t.amount) || 0);
  });
  const sortedCats = Object.entries(catTotals).sort(([, a], [, b]) => b - a);
  const largestCat = sortedCats.length > 0 ? getCategoryById(sortedCats[0][0]) : null;
  const largestCatAmount = sortedCats.length > 0 ? sortedCats[0][1] : 0;

  // Month-over-month comparisons if prior month exists
  const hasMoM = previousMonthSnapshot && previousMonthSnapshot.hasPlan && previousMonthSnapshot.variableExpenses > 0;
  const spendDiff = hasMoM ? budgetSnapshot.variableExpenses - previousMonthSnapshot.variableExpenses : 0;
  const spendPctDiff = hasMoM
    ? Math.round((Math.abs(spendDiff) / previousMonthSnapshot.variableExpenses) * 100)
    : null;

  return (
    <div
      className="rounded-3xl border border-subtle p-6 shadow-sm transition-colors"
      style={{ backgroundColor: 'var(--bg-surface)' }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-subtle pb-4 gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl"
            style={{ backgroundColor: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}
          >
            <Calendar className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold font-mono tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Month in Review
            </h2>
            <p className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
              System performance matrix for {formatMonthDisplay(monthKey)}
            </p>
          </div>
        </div>

        {hasMoM ? (
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span style={{ color: 'var(--text-muted)' }}>VS PRIOR MONTH:</span>
            {spendDiff > 0 ? (
              <span className="text-amber-500 font-bold flex items-center gap-0.5">
                <TrendingUp className="h-3.5 w-3.5" />
                +{spendPctDiff}% ({formatAppMoney(spendDiff)})
              </span>
            ) : (
              <span className="text-emerald-500 font-bold flex items-center gap-0.5">
                <TrendingDown className="h-3.5 w-3.5" />
                -{spendPctDiff}% ({formatAppMoney(Math.abs(spendDiff))})
              </span>
            )}
          </div>
        ) : (
          <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Track another month to unlock comparisons
          </span>
        )}
      </div>

      {/* Grid of 8 Metrics */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Income */}
        <div
          className="rounded-2xl border border-subtle p-4"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        >
          <span className="text-[10px] font-mono uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
            Total Income
          </span>
          <p className="mt-1 text-lg font-bold font-mono font-tabular" style={{ color: 'var(--text-primary)' }}>
            {formatAppMoney(budgetSnapshot.incomeForBudget)}
          </p>
          <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
            {budgetSnapshot.incomeSource === 'actual' ? 'Actual verified' : 'Estimate'}
          </span>
        </div>

        {/* Fixed Commitments */}
        <div
          className="rounded-2xl border border-subtle p-4"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        >
          <span className="text-[10px] font-mono uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
            Fixed Costs
          </span>
          <p className="mt-1 text-lg font-bold font-mono font-tabular" style={{ color: 'var(--text-primary)' }}>
            {formatAppMoney(budgetSnapshot.totalFixedExpenses)}
          </p>
          <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
            {budgetSnapshot.incomeForBudget > 0
              ? `${Math.round((budgetSnapshot.totalFixedExpenses / budgetSnapshot.incomeForBudget) * 100)}% of income`
              : '0%'}
          </span>
        </div>

        {/* Variable Spending */}
        <div
          className="rounded-2xl border border-subtle p-4"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        >
          <span className="text-[10px] font-mono uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
            Total Variable Spend
          </span>
          <p className="mt-1 text-lg font-bold font-mono font-tabular text-amber-500">
            {formatAppMoney(budgetSnapshot.variableExpenses)}
          </p>
          <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
            {monthTransactions.length} transactions
          </span>
        </div>

        {/* Savings Goal Intact */}
        <div
          className="rounded-2xl border border-subtle p-4"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        >
          <span className="text-[10px] font-mono uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
            Savings Target
          </span>
          <p className="mt-1 text-lg font-bold font-mono font-tabular text-emerald-500">
            {formatAppMoney(budgetSnapshot.savingsGoal)}
          </p>
          <span className="text-[10px] font-mono text-emerald-500">
            {budgetSnapshot.remainingAmount >= 0 ? '100% Protected' : 'Deficit Risk'}
          </span>
        </div>

        {/* Largest Category */}
        <div
          className="rounded-2xl border border-subtle p-4"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        >
          <span className="text-[10px] font-mono uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
            Top Category
          </span>
          <p className="mt-1 text-sm font-bold font-mono truncate" style={{ color: 'var(--text-primary)' }}>
            {largestCat ? `${largestCat.emoji} ${largestCat.name}` : 'None'}
          </p>
          <span className="text-[10px] font-mono font-tabular" style={{ color: 'var(--text-secondary)' }}>
            {largestCatAmount > 0 ? formatAppMoney(largestCatAmount) : '0'}
          </span>
        </div>

        {/* Largest Single Purchase */}
        <div
          className="rounded-2xl border border-subtle p-4"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        >
          <span className="text-[10px] font-mono uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
            Largest Ticket
          </span>
          <p className="mt-1 text-sm font-bold font-mono truncate" style={{ color: 'var(--text-primary)' }}>
            {largestTx ? (largestTx.label || largestTx.merchant) : 'None'}
          </p>
          <span className="text-[10px] font-mono font-tabular text-amber-500">
            {largestTx ? formatAppMoney(largestTx.amount) : '0'}
          </span>
        </div>

        {/* Needs vs Wants Ratio */}
        <div
          className="rounded-2xl border border-subtle p-4"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        >
          <span className="text-[10px] font-mono uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
            Need / Want Split
          </span>
          <p className="mt-1 text-sm font-bold font-mono font-tabular" style={{ color: 'var(--text-primary)' }}>
            {needsWants.total > 0
              ? `${needsWants.needsPercentage}% / ${needsWants.wantsPercentage}%`
              : 'Unclassified'}
          </p>
          <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
            {formatAppMoney(needsWants.wantsAmount)} on wants
          </span>
        </div>

        {/* Planned vs Unplanned Ratio */}
        <div
          className="rounded-2xl border border-subtle p-4"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        >
          <span className="text-[10px] font-mono uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
            Planned / Unplanned
          </span>
          <p className="mt-1 text-sm font-bold font-mono font-tabular" style={{ color: 'var(--text-primary)' }}>
            {plannedUnplanned.total > 0
              ? `${plannedUnplanned.plannedPercentage}% / ${plannedUnplanned.unplannedPercentage}%`
              : 'Unclassified'}
          </p>
          <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
            {plannedUnplanned.unplannedCount} unplanned buys
          </span>
        </div>
      </div>
    </div>
  );
}
