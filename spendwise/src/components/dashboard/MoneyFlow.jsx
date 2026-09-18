import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  Shield,
  Target,
  Layers,
  Activity,
  ArrowRight
} from 'lucide-react';
import { CATEGORIES } from '../../constants/categories';
import { useSpendWise } from '../../context/SpendWiseContext';

export function MoneyFlow({ budgetSnapshot, transactions = [], onExploreCategory = null }) {
  const { formatAppMoney } = useSpendWise();
  const [activeBranch, setActiveBranch] = useState('spendable');

  if (!budgetSnapshot || !budgetSnapshot.hasPlan) return null;

  const {
    incomeForBudget,
    incomeSource,
    totalFixedExpenses,
    savingsGoal,
    spendableBudget,
    variableExpenses,
    remainingAmount
  } = budgetSnapshot;

  // Filter transactions for this month
  const monthKey = budgetSnapshot.monthKey;
  const monthTransactions = transactions.filter(
    (t) => (t.date && t.date.startsWith(monthKey)) || t.monthKey === monthKey
  );

  // Category totals
  const categoryStats = CATEGORIES.map((cat) => {
    const txs = monthTransactions.filter((t) => (t.categoryId || t.category) === cat.id);
    const amount = txs.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const count = txs.length;
    const pctOfSpendable = spendableBudget > 0 ? Math.round((amount / spendableBudget) * 1000) / 10 : 0;
    const pctOfVariable = variableExpenses > 0 ? Math.round((amount / variableExpenses) * 1000) / 10 : 0;

    return {
      id: cat.id,
      name: cat.name,
      emoji: cat.emoji,
      color: cat.color,
      amount,
      count,
      pctOfSpendable,
      pctOfVariable
    };
  });

  // Calculate detailed stats for the currently selected branch
  const getBranchDetails = () => {
    if (activeBranch === 'income') {
      return {
        title: 'Monthly Cash Inflow',
        subtitle: incomeSource === 'actual' ? 'Confirmed Actual Pay' : 'Estimated Monthly Income',
        amount: incomeForBudget,
        pct: '100% of Base Budget',
        count: 'Source of truth inflow',
        insight: incomeSource === 'actual'
          ? 'Derived from your verified paycheck inflow. Prioritized ahead of baseline estimate.'
          : 'Estimated monthly cash inflow. Will dynamically calibrate as actual income deposits arrive.',
        badgeColor: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30'
      };
    }

    if (activeBranch === 'fixed') {
      return {
        title: 'Fixed Costs & Subscriptions',
        subtitle: 'Recurring Non-Negotiable Outflows',
        amount: totalFixedExpenses,
        pct: `${incomeForBudget > 0 ? Math.round((totalFixedExpenses / incomeForBudget) * 100) : 0}% of Income`,
        count: `${budgetSnapshot.fixedExpenses?.length || 0} Commitments`,
        insight: 'Committed rent, EMIs, utilities, and subscriptions walled off on day one so your daily limit stays pure.',
        badgeColor: 'text-amber-500 bg-amber-500/10 border-amber-500/30'
      };
    }

    if (activeBranch === 'savings') {
      return {
        title: 'Guaranteed Savings Target',
        subtitle: 'Wealth Corpus Allocation',
        amount: savingsGoal,
        pct: `${incomeForBudget > 0 ? Math.round((savingsGoal / incomeForBudget) * 100) : 0}% of Income`,
        count: 'Prioritized Capital',
        insight: 'Savings is treated as an active commitment rather than "whatever is left over at the end of the month".',
        badgeColor: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30'
      };
    }

    if (activeBranch === 'spendable') {
      return {
        title: 'Variable Spending Allowance',
        subtitle: 'Calculated Discretionary Pool',
        amount: spendableBudget,
        pct: `${incomeForBudget > 0 ? Math.round((spendableBudget / incomeForBudget) * 100) : 0}% of Inflow`,
        count: `${formatAppMoney(remainingAmount)} Available`,
        insight: `Income (${formatAppMoney(incomeForBudget)}) minus Fixed (${formatAppMoney(totalFixedExpenses)}) minus Savings (${formatAppMoney(savingsGoal)}).`,
        badgeColor: 'text-teal-500 bg-teal-500/10 border-teal-500/30'
      };
    }

    const cat = categoryStats.find((c) => c.id === activeBranch);
    if (cat) {
      return {
        title: `${cat.emoji} ${cat.name}`,
        subtitle: 'Discretionary Category Outflow',
        amount: cat.amount,
        pct: `${cat.pctOfSpendable}% of Variable Pool`,
        count: `${cat.count} purchases logged`,
        insight: cat.amount === 0
          ? `No ${cat.name.toLowerCase()} expenses logged yet this month.`
          : `Represents ${cat.pctOfVariable}% of all variable money spent so far.`,
        badgeColor: 'text-[var(--color-accent)] bg-[var(--color-accent-subtle)] border-[var(--color-accent)]',
        canExplore: true,
        categoryObj: cat
      };
    }

    return null;
  };

  const branchDetails = getBranchDetails();

  return (
    <div
      className="rounded-3xl border border-subtle p-6 shadow-sm transition-colors"
      style={{ backgroundColor: 'var(--bg-surface)' }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-subtle pb-4 gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl"
            style={{ backgroundColor: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}
          >
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold font-mono tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Interactive Money Flow
            </h2>
            <p className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
              Visual multi-tier cash pipeline from inflow to category drains
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          SELECT A NODE TO INSPECT
        </span>
      </div>

      {/* Main Visual Flow Pipeline */}
      <div className="mt-8 space-y-6">
        {/* Tier 0: Inflow Node */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setActiveBranch('income')}
            className={`group relative flex items-center gap-4 rounded-2xl border px-8 py-4 transition-all cursor-pointer ${
              activeBranch === 'income'
                ? 'ring-2 ring-[var(--color-accent)] shadow-md'
                : 'border-subtle hover:border-[var(--border-medium)]'
            }`}
            style={{
              backgroundColor: activeBranch === 'income' ? 'var(--color-accent-subtle)' : 'var(--bg-elevated)',
              borderColor: activeBranch === 'income' ? 'var(--color-accent)' : undefined
            }}
          >
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl"
              style={{ backgroundColor: 'var(--color-accent-badge-bg)', color: 'var(--color-accent)' }}
            >
              <Wallet className="h-5 w-5" />
            </div>
            <div className="text-left">
              <span className="text-[10px] font-mono uppercase tracking-widest block font-bold" style={{ color: 'var(--text-muted)' }}>
                01. Monthly Inflow
              </span>
              <span className="text-2xl font-extrabold font-mono tracking-tight font-tabular" style={{ color: 'var(--text-primary)' }}>
                {formatAppMoney(incomeForBudget)}
              </span>
            </div>
          </button>
        </div>

        {/* Central Hairline Connector */}
        <div className="flex justify-center">
          <div className="h-6 w-px" style={{ backgroundColor: 'var(--border-medium)' }} />
        </div>

        {/* Tier 1: Fixed Obligations, Savings, Variable Pool */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Branch 1A: Fixed Costs */}
          <button
            type="button"
            onClick={() => setActiveBranch('fixed')}
            className={`group flex items-center gap-3.5 rounded-2xl border p-4 text-left transition-all cursor-pointer ${
              activeBranch === 'fixed'
                ? 'ring-2 ring-amber-500 shadow-sm'
                : 'border-subtle hover:border-[var(--border-medium)]'
            }`}
            style={{
              backgroundColor: activeBranch === 'fixed' ? 'rgba(245, 158, 11, 0.1)' : 'var(--bg-elevated)',
              borderColor: activeBranch === 'fixed' ? '#f59e0b' : undefined
            }}
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
              style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)' }}
            >
              <Shield className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-mono uppercase tracking-widest block font-bold" style={{ color: 'var(--text-muted)' }}>
                02. Fixed Costs
              </span>
              <span className="text-lg font-bold font-mono block font-tabular" style={{ color: 'var(--text-primary)' }}>
                -{formatAppMoney(totalFixedExpenses)}
              </span>
              <span className="text-[11px] font-mono" style={{ color: 'var(--text-secondary)' }}>
                {incomeForBudget > 0 ? Math.round((totalFixedExpenses / incomeForBudget) * 100) : 0}% of income
              </span>
            </div>
          </button>

          {/* Branch 1B: Savings Target */}
          <button
            type="button"
            onClick={() => setActiveBranch('savings')}
            className={`group flex items-center gap-3.5 rounded-2xl border p-4 text-left transition-all cursor-pointer ${
              activeBranch === 'savings'
                ? 'ring-2 ring-[var(--color-accent)] shadow-sm'
                : 'border-subtle hover:border-[var(--border-medium)]'
            }`}
            style={{
              backgroundColor: activeBranch === 'savings' ? 'var(--color-accent-subtle)' : 'var(--bg-elevated)',
              borderColor: activeBranch === 'savings' ? 'var(--color-accent)' : undefined
            }}
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
              style={{ backgroundColor: 'var(--color-accent-badge-bg)', color: 'var(--color-accent)' }}
            >
              <Target className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-mono uppercase tracking-widest block font-bold text-[var(--color-accent)]">
                03. Savings Goal
              </span>
              <span className="text-lg font-bold font-mono block font-tabular text-emerald-500">
                {formatAppMoney(savingsGoal)}
              </span>
              <span className="text-[11px] font-mono text-emerald-600/80">
                {incomeForBudget > 0 ? Math.round((savingsGoal / incomeForBudget) * 100) : 0}% locked
              </span>
            </div>
          </button>

          {/* Branch 1C: Spendable Variable Pool */}
          <button
            type="button"
            onClick={() => setActiveBranch('spendable')}
            className={`group flex items-center gap-3.5 rounded-2xl border p-4 text-left transition-all cursor-pointer ${
              activeBranch === 'spendable'
                ? 'ring-2 ring-teal-500 shadow-sm'
                : 'border-subtle hover:border-[var(--border-medium)]'
            }`}
            style={{
              backgroundColor: activeBranch === 'spendable' ? 'rgba(20, 184, 166, 0.1)' : 'var(--bg-elevated)',
              borderColor: activeBranch === 'spendable' ? '#14b8a6' : undefined
            }}
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0"
              style={{ backgroundColor: 'rgba(20, 184, 166, 0.15)', color: '#14b8a6' }}
            >
              <Layers className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-mono uppercase tracking-widest block font-bold" style={{ color: '#14b8a6' }}>
                04. Variable Pool
              </span>
              <span className="text-lg font-bold font-mono block font-tabular" style={{ color: 'var(--text-primary)' }}>
                {formatAppMoney(spendableBudget)}
              </span>
              <span className="text-[11px] font-mono font-bold" style={{ color: '#14b8a6' }}>
                {formatAppMoney(remainingAmount)} left
              </span>
            </div>
          </button>
        </div>

        {/* Central Connector to Categories */}
        <div className="flex justify-center">
          <div className="h-6 w-px" style={{ backgroundColor: 'var(--border-medium)' }} />
        </div>

        {/* Tier 2: Category Outflow Nodes */}
        <div>
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest mb-3 px-1" style={{ color: 'var(--text-muted)' }}>
            <span>05. Variable Category Allocations</span>
            <span>{monthTransactions.length} Transactions</span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {categoryStats.map((cat) => {
              const isSelected = activeBranch === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveBranch(cat.id)}
                  className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'ring-2 ring-[var(--color-accent)] shadow-xs'
                      : 'border-subtle hover:border-[var(--border-medium)]'
                  }`}
                  style={{
                    backgroundColor: isSelected ? 'var(--color-accent-subtle)' : 'var(--bg-elevated)',
                    borderColor: isSelected ? 'var(--color-accent)' : undefined
                  }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-lg leading-none">{cat.emoji}</span>
                    <span className="text-[10px] font-mono font-tabular" style={{ color: 'var(--text-muted)' }}>
                      {cat.count} tx
                    </span>
                  </div>
                  <span className="text-xs font-bold block truncate" style={{ color: 'var(--text-primary)' }}>
                    {cat.name}
                  </span>
                  <span className="text-sm font-bold font-mono block mt-1 font-tabular" style={{ color: 'var(--text-secondary)' }}>
                    {formatAppMoney(cat.amount)}
                  </span>
                  <span className="text-[10px] font-mono block mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {cat.pctOfVariable}% of spend
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Branch Telemetry Detail Panel */}
        <AnimatePresence mode="wait">
          {branchDetails && (
            <motion.div
              key={activeBranch}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="rounded-2xl border border-subtle p-5 mt-6 relative overflow-hidden"
              style={{ backgroundColor: 'var(--bg-elevated)' }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                      Telemetry Detail
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-mono font-bold uppercase border ${branchDetails.badgeColor}`}
                    >
                      {branchDetails.pct}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold font-mono tracking-tight mt-1" style={{ color: 'var(--text-primary)' }}>
                    {branchDetails.title}
                  </h3>
                  <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {branchDetails.subtitle} · {branchDetails.count}
                  </p>
                  <p className="text-xs mt-2 font-sans leading-relaxed max-w-xl" style={{ color: 'var(--text-secondary)' }}>
                    {branchDetails.insight}
                  </p>
                </div>

                <div className="text-left sm:text-right shrink-0">
                  <span className="text-[10px] font-mono uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                    Recorded Amount
                  </span>
                  <span className="text-2xl sm:text-3xl font-extrabold font-mono font-tabular block mt-0.5" style={{ color: 'var(--text-primary)' }}>
                    {formatAppMoney(branchDetails.amount)}
                  </span>
                  {branchDetails.canExplore && onExploreCategory && (
                    <button
                      type="button"
                      onClick={() => onExploreCategory(branchDetails.categoryObj)}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-mono transition-all cursor-pointer"
                      style={{
                        backgroundColor: 'var(--color-accent-subtle)',
                        borderColor: 'var(--color-accent)',
                        color: 'var(--color-accent)'
                      }}
                    >
                      <span>Explore {branchDetails.categoryObj.name} Stream</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
