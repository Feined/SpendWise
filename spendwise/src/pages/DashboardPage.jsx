import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  Plus,
  Camera,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Zap,
  Users
} from 'lucide-react';
import { useSpendWise } from '../context/SpendWiseContext';
import {
  calculateBudget,
  formatMonthDisplay,
  shiftMonth
} from '../lib/budget';
import { getCategoryById } from '../constants/categories';
import { calculateNetBalances } from '../lib/splitEngine';

// Visual Subcomponents
import { MoneyFlow } from '../components/dashboard/MoneyFlow';
import { WhereDidMyMoneyGo } from '../components/dashboard/WhereDidMyMoneyGo';
import { NeedVsWantCard } from '../components/dashboard/NeedVsWantCard';
import { CategoryDetailModal } from '../components/dashboard/CategoryDetailModal';
import { SpendingIntelligence } from '../components/dashboard/SpendingIntelligence';
import { SavingOpportunities } from '../components/dashboard/SavingOpportunities';
import { MonthInReview } from '../components/dashboard/MonthInReview';
import { SavingsProgressCard } from '../components/dashboard/SavingsProgressCard';
import { SpendingTrendChart } from '../components/dashboard/SpendingTrendChart';

export function DashboardPage() {
  const {
    appData,
    selectedMonth,
    setSelectedMonth,
    currentMonthPlan,
    getMonthPlan,
    openPaymentHub,
    formatAppMoney,
    financialSummary,
    unifiedTimeline = []
  } = useSpendWise();

  const [inspectCategory, setInspectCategory] = useState(null);

  // Compute live real-time snapshot
  const snapshot = calculateBudget(currentMonthPlan, appData.transactions);

  const handlePrevMonth = () => {
    setSelectedMonth(shiftMonth(selectedMonth, -1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(shiftMonth(selectedMonth, 1));
  };

  const handleMonthChange = (e) => {
    if (e.target.value && /^\d{4}-\d{2}$/.test(e.target.value)) {
      setSelectedMonth(e.target.value);
    }
  };

  // Filter transactions for this month
  const monthTransactions = appData.transactions.filter(
    (t) => (t.date && t.date.startsWith(selectedMonth)) || t.monthKey === selectedMonth
  );

  // Previous month snapshot for comparisons
  const prevMonthKey = shiftMonth(selectedMonth, -1);
  const prevPlan = getMonthPlan(prevMonthKey);
  const prevSnapshot = prevPlan ? calculateBudget(prevPlan, appData.transactions) : null;

  // Compute peer split balances
  const splitBalances = useMemo(() => {
    return calculateNetBalances('user-self', appData.splitExpenses || [], appData.settlements || []);
  }, [appData.splitExpenses, appData.settlements]);

  // Real Financial Status
  let statusText = 'ON TRACK';
  let statusColor = 'text-emerald-500';
  let dotColor = 'bg-emerald-500';

  if (snapshot.hasPlan) {
    if (snapshot.isNegative || snapshot.remainingAmount < 0) {
      statusText = 'OVERSPENT';
      statusColor = 'text-rose-500';
      dotColor = 'bg-rose-500';
    } else if (!snapshot.isAheadOfPace) {
      statusText = 'TIGHT';
      statusColor = 'text-amber-500';
      dotColor = 'bg-amber-500';
    }
  }

  // Calculate percentages for "Your Money at a Glance"
  const inc = snapshot.incomeForBudget || 1;
  const fixedPct = Math.round((snapshot.totalFixedExpenses / inc) * 1000) / 10;
  const savPct = Math.round((snapshot.savingsGoal / inc) * 1000) / 10;
  const spentPct = Math.round((snapshot.variableExpenses / inc) * 1000) / 10;
  const availPct = Math.round((snapshot.remainingAmount / inc) * 1000) / 10;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-10 space-y-8 font-sans">
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP HEADER & MONTH SWITCHER CONTROLS                       */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-subtle pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-widest text-[var(--color-accent)] font-bold">
              Financial Operating System
            </span>
            <span className="opacity-30 font-mono">//</span>
            <span className={`text-xs font-mono font-bold flex items-center gap-1.5 ${statusColor}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${dotColor} animate-status-pulse`} />
              FINANCIAL STATUS: {statusText}
            </span>
          </div>
          <h1 className="mt-1.5 text-2xl md:text-3xl font-extrabold font-mono tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {formatMonthDisplay(selectedMonth)} Command Center
          </h1>
        </div>

        {/* Month Navigation Stepper */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center rounded-2xl border border-subtle p-1 shadow-xs" style={{ backgroundColor: 'var(--bg-surface)' }}>
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className="flex h-8 w-8 items-center justify-center rounded-xl cursor-pointer hover:bg-[var(--border-subtle)] transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[130px] text-center text-xs font-mono font-bold px-2" style={{ color: 'var(--text-primary)' }}>
              {formatMonthDisplay(selectedMonth)}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Next month"
              className="flex h-8 w-8 items-center justify-center rounded-xl cursor-pointer hover:bg-[var(--border-subtle)] transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <input
            type="month"
            value={selectedMonth}
            onChange={handleMonthChange}
            className="rounded-2xl border border-subtle px-3 py-2 text-xs font-mono font-semibold focus:outline-none focus:border-[var(--color-accent)]"
            style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}
          />

          {snapshot.hasPlan && (
            <Link
              to="/setup"
              className="inline-flex min-h-9 items-center justify-center rounded-2xl border border-subtle px-3.5 text-xs font-mono font-bold hover:border-[var(--color-accent)] transition-colors"
              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
            >
              Edit Plan
            </Link>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. NO PLAN EMPTY STATE (IF MONTH HAS NO BUDGET PLAN)          */}
      {/* ------------------------------------------------------------- */}
      {!snapshot.hasPlan ? (
        <div className="rounded-3xl border border-subtle p-8 md:p-14 text-center shadow-lg" style={{ backgroundColor: 'var(--bg-surface)' }}>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-subtle text-[var(--color-accent)] shadow-sm" style={{ backgroundColor: 'var(--color-accent-subtle)' }}>
            <Sparkles className="h-8 w-8" />
          </div>
          <h2 className="mt-5 text-2xl font-bold font-mono tracking-tight" style={{ color: 'var(--text-primary)' }}>
            No Budget Configured for {formatMonthDisplay(selectedMonth)}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-xs sm:text-sm leading-relaxed font-sans" style={{ color: 'var(--text-secondary)' }}>
            SpendWise reserves your rent, fixed bills, and savings goal on day one so you know your safe daily spending allowance.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              to="/setup"
              className="inline-flex items-center gap-2 rounded-2xl px-7 py-3 text-xs font-mono font-bold uppercase tracking-wider text-white shadow-md transition-all hover:scale-105 cursor-pointer"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              <span>Configure {formatMonthDisplay(selectedMonth)} Plan</span>
              <ArrowRight className="h-4 w-4 stroke-[2.5]" />
            </Link>
          </div>
        </div>
      ) : (
        /* ------------------------------------------------------------- */
        /* 3. ACTIVE COMMAND CENTER SECTIONS                             */
        /* ------------------------------------------------------------- */
        <div className="space-y-8">
          {/* MASSIVE HERO SECTION: REMAINING MONEY & COMPACT STATUS LINE */}
          <div className="rounded-3xl border border-subtle p-6 md:p-10 shadow-xl relative overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)' }}>
            <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              {/* Primary Left Metric */}
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-mono uppercase tracking-widest text-[var(--color-accent)] font-bold">
                    Remaining to Spend
                  </span>
                  <span
                    className={`rounded-lg px-2 py-0.5 text-[10px] font-mono font-bold uppercase border border-subtle`}
                    style={{
                      backgroundColor: snapshot.incomeSource === 'actual' ? 'var(--color-accent-badge-bg)' : 'var(--bg-elevated)',
                      color: snapshot.incomeSource === 'actual' ? 'var(--color-accent)' : 'var(--text-secondary)'
                    }}
                  >
                    {snapshot.incomeSource === 'actual' ? 'Actual Verified Pay' : 'Estimated Inflow'}
                  </span>
                </div>

                <div className="mt-3 flex items-baseline gap-4">
                  <span
                    className={`text-5xl sm:text-6xl md:text-7xl font-extrabold font-mono tracking-tight font-tabular ${
                      snapshot.remainingAmount < 0 ? 'text-rose-500' : ''
                    }`}
                    style={{ color: snapshot.remainingAmount >= 0 ? 'var(--text-primary)' : undefined }}
                  >
                    {formatAppMoney(snapshot.remainingAmount)}
                  </span>
                  {snapshot.remainingAmount < 0 && (
                    <span className="rounded-xl bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 text-xs font-mono font-bold text-rose-500">
                      DEFICIT ACTIVE
                    </span>
                  )}
                </div>

                {/* Compact Technical Status Line */}
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-mono pt-3 border-t border-subtle" style={{ color: 'var(--text-secondary)' }}>
                  <span className="font-bold font-tabular" style={{ color: 'var(--text-primary)' }}>
                    {formatAppMoney(snapshot.remainingAmount)} available
                  </span>
                  <span className="opacity-40">·</span>
                  <span>{snapshot.daysRemaining} days remaining</span>
                  <span className="opacity-40">·</span>
                  <span className="font-bold font-tabular text-[var(--color-accent)]">
                    {formatAppMoney(snapshot.safeDailyLimit)}/day safe limit
                  </span>
                </div>
              </div>

              {/* Action Buttons & Safe Daily Limit Pill */}
              <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
                <div className="rounded-2xl border border-subtle p-4 min-w-[220px]" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                  <span className="text-[10px] font-mono uppercase tracking-widest block font-bold" style={{ color: 'var(--text-muted)' }}>
                    Today's Safe Limit
                  </span>
                  <p className="text-2xl font-bold font-mono font-tabular mt-1 text-[var(--color-accent)]">
                    {formatAppMoney(snapshot.safeDailyLimit)}
                    <span className="text-xs font-normal opacity-70" style={{ color: 'var(--text-secondary)' }}> / day</span>
                  </p>
                  <span className="text-[11px] font-mono block mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Paced for {snapshot.daysRemaining} days
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openPaymentHub('manual')}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-mono font-bold uppercase tracking-wider text-white shadow-md cursor-pointer transition-all hover:scale-105"
                    style={{ backgroundColor: 'var(--color-accent)' }}
                  >
                    <Plus className="h-4 w-4 stroke-[2.5]" />
                    <span>Capture</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openPaymentHub('scan')}
                    title="Scan Payment Screenshot"
                    className="flex items-center justify-center rounded-2xl border border-subtle px-3 cursor-pointer hover:border-[var(--color-accent)] transition-colors"
                    style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                  >
                    <Camera className="h-4 w-4 text-[var(--color-accent)]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openPaymentHub('paste')}
                    title="Paste SMS Payment Alert"
                    className="flex items-center justify-center rounded-2xl border border-subtle px-3 cursor-pointer hover:border-[var(--color-accent)] transition-colors"
                    style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                  >
                    <MessageSquare className="h-4 w-4 text-[var(--color-accent)]" />
                  </button>
                </div>
              </div>
            </div>

            {/* Pacing Bar */}
            <div className="mt-8 pt-4 border-t border-subtle">
              <div className="flex items-center justify-between text-xs font-mono mb-2" style={{ color: 'var(--text-secondary)' }}>
                <div className="flex items-center gap-2">
                  <span className="uppercase font-bold" style={{ color: 'var(--text-muted)' }}>Burn Pacing:</span>
                  <span className={snapshot.isAheadOfPace ? 'text-emerald-500 font-bold' : 'text-amber-500 font-bold'}>
                    {snapshot.isAheadOfPace
                      ? `${formatAppMoney(Math.abs(snapshot.paceDifference))} under anticipated pace`
                      : `${formatAppMoney(Math.abs(snapshot.paceDifference))} above anticipated pace`}
                  </span>
                </div>
                <span style={{ color: 'var(--text-muted)' }}>
                  {formatAppMoney(snapshot.variableExpenses)} spent of {formatAppMoney(snapshot.spendableBudget)} pool
                </span>
              </div>
              <div className="h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-subtle)' }}>
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    snapshot.remainingAmount < 0
                      ? 'bg-rose-500'
                      : snapshot.isAheadOfPace
                      ? 'bg-emerald-500'
                      : 'bg-amber-500'
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      snapshot.spendableBudget > 0
                        ? (snapshot.variableExpenses / snapshot.spendableBudget) * 100
                        : 0
                    )}%`
                  }}
                />
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* 3B. EXECUTIVE FINANCIAL VITALS (4-CARD GRID)                  */}
          {/* ------------------------------------------------------------- */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. Spendable Budget */}
            <div className="rounded-2xl border border-subtle p-4 shadow-xs" style={{ backgroundColor: 'var(--bg-surface)' }}>
              <span className="text-[10px] font-mono uppercase tracking-wider block font-bold text-[var(--color-accent)]">
                Spendable Budget
              </span>
              <p className="mt-1.5 text-xl sm:text-2xl font-extrabold font-mono font-tabular" style={{ color: 'var(--text-primary)' }}>
                {formatAppMoney(snapshot.spendableBudget)}
              </p>
              <span className="text-[11px] font-mono block mt-1" style={{ color: 'var(--text-muted)' }}>
                Income − Fixed − Savings
              </span>
            </div>

            {/* 2. Total Spending */}
            <div className="rounded-2xl border border-subtle p-4 shadow-xs" style={{ backgroundColor: 'var(--bg-surface)' }}>
              <span className="text-[10px] font-mono uppercase tracking-wider block font-bold text-amber-500">
                Total Monthly Outflow
              </span>
              <p className="mt-1.5 text-xl sm:text-2xl font-extrabold font-mono font-tabular text-amber-500">
                {formatAppMoney(snapshot.totalFixedExpenses + snapshot.variableExpenses)}
              </p>
              <span className="text-[11px] font-mono block mt-1" style={{ color: 'var(--text-muted)' }}>
                {formatAppMoney(snapshot.variableExpenses)} variable + {formatAppMoney(snapshot.totalFixedExpenses)} fixed
              </span>
            </div>

            {/* 3. Fixed Commitments */}
            <div className="rounded-2xl border border-subtle p-4 shadow-xs" style={{ backgroundColor: 'var(--bg-surface)' }}>
              <span className="text-[10px] font-mono uppercase tracking-wider block font-bold text-sky-500">
                Fixed Obligations
              </span>
              <p className="mt-1.5 text-xl sm:text-2xl font-extrabold font-mono font-tabular text-sky-500">
                {formatAppMoney(snapshot.totalFixedExpenses)}
              </p>
              <span className="text-[11px] font-mono block mt-1" style={{ color: 'var(--text-muted)' }}>
                {fixedPct}% of month income ({Array.isArray(currentMonthPlan?.fixedExpenses) ? currentMonthPlan.fixedExpenses.length : 0} items)
              </span>
            </div>

            {/* 4. Savings Goal */}
            <div className="rounded-2xl border border-subtle p-4 shadow-xs" style={{ backgroundColor: 'var(--bg-surface)' }}>
              <span className="text-[10px] font-mono uppercase tracking-wider block font-bold text-emerald-500">
                Protected Savings
              </span>
              <p className="mt-1.5 text-xl sm:text-2xl font-extrabold font-mono font-tabular text-emerald-500">
                {formatAppMoney(snapshot.savingsGoal)}
              </p>
              <span className="text-[11px] font-mono block mt-1" style={{ color: 'var(--text-muted)' }}>
                {savPct}% of income reserved
              </span>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* 3C. FIXED COMMITMENTS & RECURRING OBLIGATIONS BREAKDOWN        */}
          {/* ------------------------------------------------------------- */}
          <div className="rounded-3xl border border-subtle p-6 shadow-sm space-y-4" style={{ backgroundColor: 'var(--bg-surface)' }}>
            <div className="flex items-center justify-between border-b border-subtle pb-3">
              <div>
                <span className="text-xs font-mono uppercase tracking-widest font-bold text-[var(--color-accent)] block">
                  Fixed Expenses & Commitments
                </span>
                <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                  Non-negotiable recurring monthly expenses (Rent, utilities, subscriptions, insurance)
                </span>
              </div>
              <Link
                to="/setup"
                className="text-xs font-mono text-[var(--color-accent)] hover:underline flex items-center gap-1 font-bold"
              >
                <span>Edit Bills</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {(!currentMonthPlan?.fixedExpenses || currentMonthPlan.fixedExpenses.length === 0) ? (
              <div className="rounded-2xl border border-dashed border-subtle p-6 text-center" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                  No fixed commitments defined for {formatMonthDisplay(selectedMonth)}.
                </p>
                <p className="text-[11px] font-mono mt-1" style={{ color: 'var(--text-muted)' }}>
                  Add your rent, loan EMIs, WiFi, or bills to protect your spendable daily allowance.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {currentMonthPlan.fixedExpenses.map((fe, idx) => (
                  <div
                    key={fe.id || idx}
                    className="p-3.5 rounded-2xl border border-subtle flex items-center justify-between transition-colors"
                    style={{ backgroundColor: 'var(--bg-elevated)' }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 text-sm">
                        🔒
                      </div>
                      <div>
                        <p className="text-xs font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
                          {fe.name || 'Fixed Commitment'}
                        </p>
                        <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                          Recurring Monthly
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold font-mono font-tabular text-sky-500">
                        {formatAppMoney(Number(fe.amount) || 0)}
                      </p>
                      <span className="text-[9px] font-mono block" style={{ color: 'var(--text-muted)' }}>
                        Committed
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ------------------------------------------------------------- */}
          {/* 4. SHARED MONEY DYNAMIC WIDGET (Req 14)                       */}
          {/* ------------------------------------------------------------- */}
          <div className="rounded-3xl border border-subtle p-6 shadow-sm space-y-4" style={{ backgroundColor: 'var(--bg-surface)' }}>
            <div className="flex items-center justify-between border-b border-subtle pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[var(--color-accent)]" />
                <span className="text-xs font-mono uppercase tracking-widest font-bold" style={{ color: 'var(--text-primary)' }}>
                  Shared Money
                </span>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">// Social Ledger</span>
              </div>
              <Link
                to="/split"
                className="text-xs font-mono text-[var(--color-accent)] hover:underline flex items-center gap-1 font-bold"
              >
                <span>Open Splits</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Dynamic Metric Trio */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-500 font-bold block">
                  You are owed
                </span>
                <span className="text-2xl md:text-3xl font-extrabold font-mono font-tabular text-emerald-500 mt-1 block">
                  {formatAppMoney(financialSummary.globalReceivables)}
                </span>
                <span className="text-[10px] font-mono text-emerald-600/80 mt-0.5 block">
                  Outstanding peer receivables
                </span>
              </div>

              <div className="p-4 rounded-2xl border border-rose-500/20 bg-rose-500/5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-rose-500 font-bold block">
                  You owe
                </span>
                <span className="text-2xl md:text-3xl font-extrabold font-mono font-tabular text-rose-500 mt-1 block">
                  {formatAppMoney(financialSummary.globalPayables)}
                </span>
                <span className="text-[10px] font-mono text-rose-600/80 mt-0.5 block">
                  Active peer liabilities
                </span>
              </div>

              <div className="p-4 rounded-2xl border border-subtle" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] font-bold block">
                  Net Shared Position
                </span>
                <span className={`text-2xl md:text-3xl font-extrabold font-mono font-tabular mt-1 block ${
                  financialSummary.netPeerBalance > 0
                    ? 'text-emerald-500'
                    : financialSummary.netPeerBalance < 0
                    ? 'text-rose-500'
                    : 'text-zinc-400'
                }`}>
                  {financialSummary.netPeerBalance > 0 ? `+${formatAppMoney(financialSummary.netPeerBalance)}` : formatAppMoney(financialSummary.netPeerBalance)}
                </span>
                <span className="text-[10px] font-mono text-[var(--text-muted)] mt-0.5 block">
                  {financialSummary.netPeerBalance > 0 ? 'Net positive asset' : financialSummary.netPeerBalance < 0 ? 'Net negative liability' : 'Fully settled'}
                </span>
              </div>
            </div>

            {/* Recent split banner */}
            {appData.splitExpenses && appData.splitExpenses.length > 0 && (
              <div className="rounded-2xl border border-subtle p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] block">
                    Recent Shared Expense
                  </span>
                  <p className="text-xs font-mono font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>
                    {appData.splitExpenses[0].title} · {formatAppMoney(appData.splitExpenses[0].totalAmount)}
                  </p>
                  <span className="text-[11px] font-mono text-[var(--text-secondary)]">
                    {appData.splitExpenses[0].paidBy === 'user-self' ? 'You paid the bill' : 'Friend paid the bill'}
                  </span>
                </div>
                <Link
                  to="/split"
                  className="inline-flex items-center gap-1 text-xs font-mono font-bold text-[var(--color-accent)] hover:underline self-start sm:self-auto"
                >
                  <span>View in Split →</span>
                </Link>
              </div>
            )}
          </div>

          {/* ------------------------------------------------------------- */}
          {/* 5. 7-STEP CONNECTED MONEY FLOW (Req 15, 30)                   */}
          {/* ------------------------------------------------------------- */}
          <div className="rounded-3xl border border-subtle p-6 shadow-sm space-y-4" style={{ backgroundColor: 'var(--bg-surface)' }}>
            <div className="flex items-center justify-between border-b border-subtle pb-3">
              <div>
                <span className="text-xs font-mono uppercase tracking-widest font-bold text-[var(--color-accent)] block">
                  Complete Financial Flow
                </span>
                <span className="text-[11px] font-mono text-[var(--text-muted)]">
                  Income → Fixed → Savings → Personal Spending → Shared Outflow → Receivables → Net
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-subtle text-[var(--text-muted)]">
                7-Phase Architecture
              </span>
            </div>

            {/* 7 Interactive Pipeline Nodes */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
              {financialSummary.moneyFlowSteps.map((step) => {
                const isReceivable = step.step === 6;
                const isSharedOutflow = step.step === 5;
                const ContentWrapper = isReceivable || isSharedOutflow ? Link : 'div';
                const wrapperProps = isReceivable
                  ? { to: '/split' }
                  : isSharedOutflow
                  ? { to: '/split' }
                  : {};

                return (
                  <ContentWrapper
                    key={step.step}
                    {...wrapperProps}
                    className={`rounded-2xl border border-subtle p-3 transition-all flex flex-col justify-between ${
                      isReceivable || isSharedOutflow
                        ? 'hover:border-[var(--color-accent)] cursor-pointer hover:scale-[1.02]'
                        : ''
                    }`}
                    style={{
                      backgroundColor:
                        step.step === 7
                          ? 'var(--color-accent-subtle)'
                          : 'var(--bg-elevated)'
                    }}
                  >
                    <div>
                      <span className="text-[9px] font-mono uppercase tracking-wider block font-bold" style={{ color: 'var(--text-muted)' }}>
                        0{step.step}. {step.label}
                      </span>
                      <p className={`mt-2 text-base font-extrabold font-mono font-tabular ${
                        step.direction === 'inflow' || step.direction === 'asset'
                          ? 'text-emerald-500'
                          : step.direction === 'outflow'
                          ? 'text-rose-500'
                          : step.direction === 'locked'
                          ? 'text-[var(--color-accent)]'
                          : 'text-[var(--text-primary)]'
                      }`}>
                        {step.direction === 'outflow' ? `-${formatAppMoney(step.amount)}` : formatAppMoney(step.amount)}
                      </p>
                    </div>

                    <div className="mt-2 pt-1 border-t border-subtle text-[9px] font-mono text-[var(--text-muted)] flex items-center justify-between">
                      <span className="capitalize">{step.direction}</span>
                      {(isReceivable || isSharedOutflow) && (
                        <span className="text-[var(--color-accent)] font-bold">Inspect →</span>
                      )}
                    </div>
                  </ContentWrapper>
                );
              })}
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* 5B. SPENDING VELOCITY & PACING (Req 24, 30)                    */}
          {/* ------------------------------------------------------------- */}
          <div className="rounded-3xl border border-subtle p-6 shadow-sm space-y-4" style={{ backgroundColor: 'var(--bg-surface)' }}>
            <div className="flex items-center justify-between border-b border-subtle pb-3">
              <span className="text-xs font-mono uppercase tracking-widest font-bold text-[var(--color-accent)]">
                Spending Velocity
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                  financialSummary.spendingVelocity.status === 'ON_TRACK'
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                    : financialSummary.spendingVelocity.status === 'WATCH'
                    ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                    : 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
                }`}
              >
                ● STATUS: {financialSummary.spendingVelocity.status.replace('_', ' ')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl border border-subtle" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] block font-bold">
                  Current Daily Pace
                </span>
                <span className="text-3xl font-extrabold font-mono font-tabular text-[var(--text-primary)] mt-1 block">
                  {formatAppMoney(financialSummary.spendingVelocity.currentDailyPace)}
                  <span className="text-xs font-normal text-[var(--text-muted)]"> / day</span>
                </span>
                <span className="text-[11px] font-mono text-[var(--text-secondary)] mt-1 block">
                  Burn rate across {financialSummary.spendingVelocity.daysElapsed} days elapsed
                </span>
              </div>

              <div className="p-4 rounded-2xl border border-subtle" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-accent)] block font-bold">
                  Safe Daily Pace
                </span>
                <span className="text-3xl font-extrabold font-mono font-tabular text-[var(--color-accent)] mt-1 block">
                  {formatAppMoney(financialSummary.spendingVelocity.safeDailyPace)}
                  <span className="text-xs font-normal text-[var(--text-muted)]"> / day</span>
                </span>
                <span className="text-[11px] font-mono text-[var(--text-secondary)] mt-1 block">
                  Paced across {financialSummary.spendingVelocity.daysRemaining} days remaining
                </span>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* 6. INTERACTIVE MONEY FLOW DIAGRAM                             */}
          {/* ------------------------------------------------------------- */}
          <MoneyFlow
            budgetSnapshot={snapshot}
            transactions={appData.transactions}
            onExploreCategory={(cat) => setInspectCategory(cat)}
          />

          {/* ------------------------------------------------------------- */}
          {/* 7. SPENDING SIGNAL (PROMINENT AI-STYLE INSIGHT CALLOUT)      */}
          {/* ------------------------------------------------------------- */}
          <div className="rounded-2xl border border-subtle p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm" style={{ backgroundColor: 'var(--bg-surface)' }}>
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}>
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-accent)] block font-bold">
                  System Spending Signal
                </span>
                <p className="mt-1 text-base font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                  {snapshot.isAheadOfPace
                    ? 'Spending pace is currently optimal across all active categories.'
                    : `Variable spending is ${formatAppMoney(Math.abs(snapshot.paceDifference))} above anticipated calendar burn.`}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  At this burn velocity, you have {formatAppMoney(snapshot.safeDailyLimit)}/day remaining across {snapshot.daysRemaining} days.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => openPaymentHub('manual')}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider text-white shadow-xs transition-all hover:scale-105 cursor-pointer shrink-0 self-start md:self-auto"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              <span>+ Record Expense</span>
            </button>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* 8. WHERE YOUR MONEY WENT & VALUE ALIGNMENT (NEED VS WANT)     */}
          {/* ------------------------------------------------------------- */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <WhereDidMyMoneyGo
              monthKey={selectedMonth}
              transactions={appData.transactions}
              spendableBudget={snapshot.spendableBudget}
              onSelectCategory={(cat) => setInspectCategory(cat)}
            />
            <NeedVsWantCard
              monthKey={selectedMonth}
              transactions={appData.transactions}
            />
          </div>

          {/* ------------------------------------------------------------- */}
          {/* 9. SPENDING INTELLIGENCE                                      */}
          {/* ------------------------------------------------------------- */}
          <SpendingIntelligence
            budgetSnapshot={snapshot}
            transactions={monthTransactions}
            previousMonthSnapshot={prevSnapshot}
          />

          {/* ------------------------------------------------------------- */}
          {/* 10. WHERE CAN YOU SAVE?                                       */}
          {/* ------------------------------------------------------------- */}
          <SavingOpportunities
            monthKey={selectedMonth}
            transactions={appData.transactions}
          />

          {/* ------------------------------------------------------------- */}
          {/* 11. SAVINGS GOAL STATUS & DAILY VELOCITY CHART                */}
          {/* ------------------------------------------------------------- */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <SavingsProgressCard budgetSnapshot={snapshot} />
            <SpendingTrendChart monthKey={selectedMonth} transactions={appData.transactions} />
          </div>

          {/* ------------------------------------------------------------- */}
          {/* 12. MONTH IN REVIEW MATRIX                                    */}
          {/* ------------------------------------------------------------- */}
          <MonthInReview
            budgetSnapshot={snapshot}
            monthKey={selectedMonth}
            transactions={appData.transactions}
            previousMonthSnapshot={prevSnapshot}
          />

          {/* ------------------------------------------------------------- */}
          {/* 13. RECENT ACTIVITY EVENT STREAM PREVIEW                      */}
          {/* ------------------------------------------------------------- */}
          <div className="rounded-3xl border border-subtle p-6 shadow-sm" style={{ backgroundColor: 'var(--bg-surface)' }}>
            <div className="flex items-center justify-between border-b border-subtle pb-4">
              <div>
                <h2 className="text-base font-bold font-mono tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  Recent Financial Activity
                </h2>
                <p className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                  Latest recorded events for {formatMonthDisplay(selectedMonth)}
                </p>
              </div>
              <Link
                to="/transactions"
                className="inline-flex items-center gap-1.5 text-xs font-mono font-bold hover:underline transition-colors"
                style={{ color: 'var(--color-accent)' }}
              >
                <span>Full Ledger ({unifiedTimeline.length})</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {unifiedTimeline.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                No financial events recorded yet. Record an expense or split a bill to get started.
              </div>
            ) : (
              <div className="divide-y divide-subtle mt-2">
                {unifiedTimeline.slice(0, 6).map((item) => {
                  const isMoneyIn = item.direction === 'in';
                  return (
                    <div key={item.id} className="flex items-center justify-between py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-subtle text-base"
                          style={{
                            backgroundColor:
                              item.streamType === 'split'
                                ? 'rgba(59, 130, 246, 0.1)'
                                : item.streamType === 'settlement'
                                ? 'rgba(16, 185, 129, 0.1)'
                                : 'var(--bg-elevated)'
                          }}
                        >
                          {item.icon || (item.streamType === 'split' ? '👥' : item.streamType === 'settlement' ? '🤝' : '💳')}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold font-mono leading-tight" style={{ color: 'var(--text-primary)' }}>
                              {item.title}
                            </p>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-mono uppercase font-bold ${
                                item.streamType === 'split'
                                  ? 'bg-blue-500/15 text-blue-400'
                                  : item.streamType === 'settlement'
                                  ? 'bg-emerald-500/15 text-emerald-400'
                                  : 'bg-zinc-700/40 text-zinc-300'
                              }`}
                            >
                              {item.streamType}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                            <span>{item.categoryName || 'General'}</span>
                            <span>•</span>
                            <span>{item.date}</span>
                            {item.streamType === 'split' && item.details && (
                              <>
                                <span>•</span>
                                <span className={item.details.isPayer ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>
                                  {item.details.isPayer
                                    ? `You paid · ${formatAppMoney(item.details.owedToMe)} to receive`
                                    : `Share: ${formatAppMoney(item.details.myShare)}`}
                                </span>
                              </>
                            )}
                            {item.streamType === 'settlement' && (
                              <>
                                <span>•</span>
                                <span className="text-emerald-500 font-bold">
                                  {item.details?.isReceived ? 'Settlement received' : 'Settlement paid'}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`text-sm font-bold font-mono font-tabular ${
                            isMoneyIn ? 'text-emerald-500' : ''
                          }`}
                          style={{ color: !isMoneyIn ? 'var(--text-primary)' : undefined }}
                        >
                          {isMoneyIn ? `+${formatAppMoney(item.amount)}` : `-${formatAppMoney(item.amount)}`}
                        </span>
                        <span className="text-[10px] font-mono block" style={{ color: 'var(--text-muted)' }}>
                          {isMoneyIn ? 'Inflow' : 'Outflow'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Category Deep-Dive Modal if open */}
      {inspectCategory && (
        <CategoryDetailModal
          category={inspectCategory}
          monthKey={selectedMonth}
          transactions={appData.transactions}
          onClose={() => setInspectCategory(null)}
        />
      )}
    </div>
  );
}
