import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target,
  ShieldCheck,
  PieChart,
  TrendingUp,
  CreditCard,
  CalendarDays,
  ArrowRight,
  Plus,
  Trash2,
  Cpu
} from 'lucide-react';
import { formatCurrency } from '../lib/budget';
import {
  calculateSavingsGoal,
  calculateEmergencyFund,
  calculate503020,
  calculateCompoundInterest,
  calculateSubscriptionCost,
  calculateDailySpending
} from '../lib/calculators';

const TOOLS_CONFIG = [
  {
    id: 'savings',
    name: 'Savings Goal',
    subtitle: 'Weekly & monthly milestone pacing',
    icon: Target,
    badge: 'Pacing'
  },
  {
    id: 'emergency',
    name: 'Emergency Fund',
    subtitle: '3 to 12-month survival runway',
    icon: ShieldCheck,
    badge: 'Essential'
  },
  {
    id: '50-30-20',
    name: '50/30/20 Rule',
    subtitle: 'Needs vs Wants vs Savings split',
    icon: PieChart,
    badge: 'Allocation'
  },
  {
    id: 'compound',
    name: 'Compound Growth',
    subtitle: 'Forecast long-term SIP compounding',
    icon: TrendingUp,
    badge: 'Wealth'
  },
  {
    id: 'subscriptions',
    name: 'Subscription Auditor',
    subtitle: 'Annual & 5-year recurring leak check',
    icon: CreditCard,
    badge: 'Audit'
  },
  {
    id: 'daily-spend',
    name: 'Daily Spending Cap',
    subtitle: 'Calculate day-by-day safe allowance',
    icon: CalendarDays,
    badge: 'Daily'
  }
];

export function ToolsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTool = searchParams.get('tool') || 'savings';
  const [activeTool, setActiveTool] = useState(
    TOOLS_CONFIG.some((t) => t.id === initialTool) ? initialTool : 'savings'
  );

  const handleSelectTool = (id) => {
    setActiveTool(id);
    setSearchParams({ tool: id });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12 space-y-8 font-sans">
      {/* Header telemetry banner */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-white/[0.06] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-mono text-emerald-400">
            <Cpu className="h-3.5 w-3.5" />
            <span className="uppercase tracking-widest">SpendWise Financial Engine</span>
            <span className="text-zinc-500">|</span>
            <span className="text-zinc-400">Deterministic Planning</span>
          </div>
          <h1 className="mt-3 text-2xl md:text-3xl font-extrabold text-white font-mono tracking-tight">
            Financial Planning Calculators
          </h1>
          <p className="mt-1 text-xs md:text-sm text-zinc-400 font-mono">
            Calibrate cash reserves, compound trajectories, and safe daily burning limits.
          </p>
        </div>
        <Link
          to="/setup"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-white/[0.1] bg-[#0c0e12] px-4 text-xs font-mono font-semibold text-white hover:border-emerald-500/40 hover:text-emerald-400 transition-colors self-start md:self-auto"
        >
          <span>Apply to Monthly Budget</span>
          <ArrowRight className="h-3.5 w-3.5 text-emerald-400" />
        </Link>
      </div>

      {/* Tool Selector Tabs */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {TOOLS_CONFIG.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => handleSelectTool(tool.id)}
              className={`group flex flex-col items-start rounded-2xl border p-3.5 text-left transition-all cursor-pointer ${
                isActive
                  ? 'border-emerald-500/40 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.1)] ring-1 ring-emerald-500/30'
                  : 'border-white/[0.06] bg-[#0c0e12] hover:border-white/[0.12] hover:bg-zinc-900/50'
              }`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-xl border transition-colors ${
                  isActive
                    ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-400'
                    : 'border-white/[0.08] bg-zinc-900 text-zinc-400 group-hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span className={`mt-3 text-xs font-mono font-bold leading-tight ${isActive ? 'text-emerald-400' : 'text-zinc-200'}`}>
                {tool.name}
              </span>
              <span className="mt-0.5 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                {tool.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Calculator Workspace */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTool}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.18 }}
          className="rounded-3xl border border-white/[0.08] bg-[#0c0e12] p-6 md:p-8 shadow-2xl"
        >
          {activeTool === 'savings' && <SavingsGoalTool />}
          {activeTool === 'emergency' && <EmergencyFundTool />}
          {activeTool === '50-30-20' && <FiftyThirtyTwentyTool />}
          {activeTool === 'compound' && <CompoundInterestTool />}
          {activeTool === 'subscriptions' && <SubscriptionAuditorTool />}
          {activeTool === 'daily-spend' && <DailySpendingTool />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------- */
/* 1. Savings Goal Calculator Component                          */
/* ------------------------------------------------------------- */
function SavingsGoalTool() {
  const [targetAmount, setTargetAmount] = useState('60000');
  const [currentAmount, setCurrentAmount] = useState('15000');
  const [monthsRemaining, setMonthsRemaining] = useState('6');

  const result = calculateSavingsGoal({
    targetAmount: Number(targetAmount),
    currentAmount: Number(currentAmount),
    monthsRemaining: Number(monthsRemaining)
  });

  return (
    <div className="space-y-6">
      <div className="border-b border-white/[0.06] pb-4">
        <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">Target Planning</span>
        <h2 className="mt-0.5 text-xl font-bold font-mono text-white">Savings Goal Milestone</h2>
        <p className="mt-1 text-xs font-mono text-zinc-400">
          Determine exactly how much capital you must allocate per month, week, and day to hit your target.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-400">
              Target Goal Amount
            </label>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500 font-mono">₹</span>
              <input
                type="number"
                min="0"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="w-full rounded-2xl border border-white/[0.08] bg-zinc-900/70 py-3 pl-8 pr-4 text-sm font-mono font-bold text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-400">
              Current Saved Amount
            </label>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500 font-mono">₹</span>
              <input
                type="number"
                min="0"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                className="w-full rounded-2xl border border-white/[0.08] bg-zinc-900/70 py-3 pl-8 pr-4 text-sm font-mono font-bold text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-400">
              Time Horizon (Months)
            </label>
            <input
              type="number"
              min="1"
              max="120"
              value={monthsRemaining}
              onChange={(e) => setMonthsRemaining(e.target.value)}
              className="mt-1.5 w-full rounded-2xl border border-white/[0.08] bg-zinc-900/70 py-3 px-4 text-sm font-mono font-bold text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Result Telemetry Card */}
        <div className="flex flex-col justify-between rounded-3xl border border-white/[0.08] bg-black/60 p-6 text-white shadow-xl">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">Milestone Telemetry</span>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-mono font-bold text-emerald-400">
                {result.progressPercent}% Funded
              </span>
            </div>

            <div className="mt-4">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Monthly Contribution Required</span>
              <p className="text-3xl font-extrabold font-mono text-emerald-400 font-tabular mt-1">
                {formatCurrency(result.monthlyRequired)}
                <span className="text-xs font-normal text-zinc-500"> / month</span>
              </p>
            </div>

            <div className="mt-4 h-2 w-full rounded-full bg-zinc-900 overflow-hidden border border-white/[0.04]">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                style={{ width: `${Math.min(100, result.progressPercent)}%` }}
              />
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-white/[0.06] pt-4 font-mono text-xs">
              <div>
                <dt className="text-[10px] uppercase tracking-widest text-zinc-500">Weekly Target</dt>
                <dd className="mt-1 text-sm font-bold text-white font-tabular">{formatCurrency(result.weeklyRequired)}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-widest text-zinc-500">Daily Target</dt>
                <dd className="mt-1 text-sm font-bold text-white font-tabular">{formatCurrency(result.dailyRequired)}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-widest text-zinc-500">Remaining Shortfall</dt>
                <dd className="mt-1 text-sm font-bold text-rose-400 font-tabular">{formatCurrency(result.shortfall)}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-widest text-zinc-500">Timeframe</dt>
                <dd className="mt-1 text-sm font-bold text-zinc-300 font-tabular">{monthsRemaining} Months</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- */
/* 2. Emergency Fund Calculator Component                        */
/* ------------------------------------------------------------- */
function EmergencyFundTool() {
  const [monthlyEssentials, setMonthlyEssentials] = useState('35000');
  const [targetMonths, setTargetMonths] = useState('6');
  const [currentSavings, setCurrentSavings] = useState('70000');

  const result = calculateEmergencyFund({
    monthlyEssentials: Number(monthlyEssentials),
    targetMonths: Number(targetMonths),
    currentSavings: Number(currentSavings)
  });

  return (
    <div className="space-y-6">
      <div className="border-b border-white/[0.06] pb-4">
        <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">Risk Mitigation</span>
        <h2 className="mt-0.5 text-xl font-bold font-mono text-white">Emergency Fund Runway</h2>
        <p className="mt-1 text-xs font-mono text-zinc-400">
          Calculate the cash reserve required to survive unexpected job disruption, medical events, or household emergencies.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-400">
              Monthly Essentials (Rent + Bills + Groceries)
            </label>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500 font-mono">₹</span>
              <input
                type="number"
                min="0"
                value={monthlyEssentials}
                onChange={(e) => setMonthlyEssentials(e.target.value)}
                className="w-full rounded-2xl border border-white/[0.08] bg-zinc-900/70 py-3 pl-8 pr-4 text-sm font-mono font-bold text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-400">
              Desired Coverage (Months)
            </label>
            <div className="mt-1.5 flex gap-2">
              {['3', '6', '9', '12'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setTargetMonths(m)}
                  className={`flex-1 rounded-xl border py-2.5 text-xs font-mono font-bold transition-all cursor-pointer ${
                    targetMonths === m
                      ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30'
                      : 'border-white/[0.08] bg-zinc-900/70 text-zinc-400 hover:text-white hover:border-white/[0.15]'
                  }`}
                >
                  {m}M
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-400">
              Current Liquid Savings
            </label>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500 font-mono">₹</span>
              <input
                type="number"
                min="0"
                value={currentSavings}
                onChange={(e) => setCurrentSavings(e.target.value)}
                className="w-full rounded-2xl border border-white/[0.08] bg-zinc-900/70 py-3 pl-8 pr-4 text-sm font-mono font-bold text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-3xl border border-white/[0.08] bg-black/60 p-6 text-white shadow-xl">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">Runway Target</span>
            <p className="mt-2 text-3xl font-extrabold font-mono text-white font-tabular">
              {formatCurrency(result.targetFund)}
            </p>
            <p className="mt-1 text-xs font-mono text-zinc-400">
              Guarantees {result.targetMonths} months of complete survival runway without cashflow.
            </p>

            <div className="mt-6 space-y-2">
              <div className="flex justify-between font-mono text-xs">
                <span className="text-zinc-500">Current Runway</span>
                <span className="font-bold text-emerald-400">{result.monthsCovered} Months Covered</span>
              </div>
              <div className="h-2 w-full rounded-full bg-zinc-900 overflow-hidden border border-white/[0.04]">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                  style={{ width: `${Math.min(100, result.fundedPercent)}%` }}
                />
              </div>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-white/[0.06] pt-4 font-mono text-xs">
              <div>
                <dt className="text-[10px] uppercase tracking-widest text-zinc-500">Remaining to Fund</dt>
                <dd className="mt-1 text-sm font-bold text-rose-400 font-tabular">
                  {formatCurrency(result.remainingToFund)}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-widest text-zinc-500">Funding Progress</dt>
                <dd className="mt-1 text-sm font-bold text-white font-tabular">{result.fundedPercent}%</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- */
/* 3. 50/30/20 Budget Planner Component                          */
/* ------------------------------------------------------------- */
function FiftyThirtyTwentyTool() {
  const [income, setIncome] = useState('75000');
  const [needsPct, setNeedsPct] = useState(50);
  const [wantsPct, setWantsPct] = useState(30);
  const [savingsPct, setSavingsPct] = useState(20);

  const result = calculate503020(Number(income), {
    needs: needsPct,
    wants: wantsPct,
    savings: savingsPct
  });

  const totalPct = needsPct + wantsPct + savingsPct;

  return (
    <div className="space-y-6">
      <div className="border-b border-white/[0.06] pb-4">
        <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">Capital Split</span>
        <h2 className="mt-0.5 text-xl font-bold font-mono text-white">50/30/20 Budget Allocation</h2>
        <p className="mt-1 text-xs font-mono text-zinc-400">
          Partition net take-home income into essential needs, lifestyle desires, and future wealth accumulation.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-400">
              Net Monthly Income
            </label>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500 font-mono">₹</span>
              <input
                type="number"
                min="0"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                className="w-full rounded-2xl border border-white/[0.08] bg-zinc-900/70 py-3 pl-8 pr-4 text-sm font-mono font-bold text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <div className="flex justify-between text-xs font-mono font-semibold">
                <span className="text-zinc-300">Needs Split: {needsPct}%</span>
                <span className="text-emerald-400 font-tabular">{formatCurrency(result.needs.amount)}</span>
              </div>
              <input
                type="range"
                min="20"
                max="80"
                value={needsPct}
                onChange={(e) => setNeedsPct(Number(e.target.value))}
                className="w-full mt-2 accent-emerald-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono font-semibold">
                <span className="text-zinc-300">Wants Split: {wantsPct}%</span>
                <span className="text-amber-400 font-tabular">{formatCurrency(result.wants.amount)}</span>
              </div>
              <input
                type="range"
                min="10"
                max="60"
                value={wantsPct}
                onChange={(e) => setWantsPct(Number(e.target.value))}
                className="w-full mt-2 accent-amber-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono font-semibold">
                <span className="text-zinc-300">Savings Split: {savingsPct}%</span>
                <span className="text-cyan-400 font-tabular">{formatCurrency(result.savings.amount)}</span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                value={savingsPct}
                onChange={(e) => setSavingsPct(Number(e.target.value))}
                className="w-full mt-2 accent-cyan-500 cursor-pointer"
              />
            </div>

            {totalPct !== 100 && (
              <p className="text-[11px] font-mono text-amber-400">
                Notice: Total allocation is {totalPct}% (adjust sliders to sum exactly 100%).
              </p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-white/[0.08] bg-black/60 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">1. Essential Needs ({needsPct}%)</span>
              <span className="text-base font-bold font-mono text-white font-tabular">{formatCurrency(result.needs.amount)}</span>
            </div>
            <p className="mt-1 text-[11px] font-mono text-zinc-400">
              Rent, bills, groceries, transit, healthcare, and baseline obligations.
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-black/60 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400">2. Discretionary Wants ({wantsPct}%)</span>
              <span className="text-base font-bold font-mono text-white font-tabular">{formatCurrency(result.wants.amount)}</span>
            </div>
            <p className="mt-1 text-[11px] font-mono text-zinc-400">
              Dining out, lifestyle shopping, travel, entertainment, and digital subscriptions.
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-black/60 p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">3. Savings & Wealth ({savingsPct}%)</span>
              <span className="text-base font-bold font-mono text-white font-tabular">{formatCurrency(result.savings.amount)}</span>
            </div>
            <p className="mt-1 text-[11px] font-mono text-zinc-400">
              Liquid emergency reserves, mutual funds SIP, retirement funds, and prepayment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- */
/* 4. Compound Growth Calculator Component                       */
/* ------------------------------------------------------------- */
function CompoundInterestTool() {
  const [principal, setPrincipal] = useState('50000');
  const [monthlyContribution, setMonthlyContribution] = useState('10000');
  const [annualRate, setAnnualRate] = useState('12');
  const [years, setYears] = useState('10');

  const result = calculateCompoundInterest({
    principal: Number(principal),
    monthlyContribution: Number(monthlyContribution),
    annualRate: Number(annualRate),
    years: Number(years)
  });

  return (
    <div className="space-y-6">
      <div className="border-b border-white/[0.06] pb-4">
        <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">Wealth Horizon</span>
        <h2 className="mt-0.5 text-xl font-bold font-mono text-white">Compound Growth Trajectory</h2>
        <p className="mt-1 text-xs font-mono text-zinc-400">
          Visualize exponential growth through disciplined monthly SIPs and market compounding.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-400">
              Initial Lump Sum
            </label>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500 font-mono">₹</span>
              <input
                type="number"
                min="0"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                className="w-full rounded-2xl border border-white/[0.08] bg-zinc-900/70 py-3 pl-8 pr-4 text-sm font-mono font-bold text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-400">
              Monthly Investment
            </label>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500 font-mono">₹</span>
              <input
                type="number"
                min="0"
                value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(e.target.value)}
                className="w-full rounded-2xl border border-white/[0.08] bg-zinc-900/70 py-3 pl-8 pr-4 text-sm font-mono font-bold text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-400">
              Expected Return (% p.a.)
            </label>
            <input
              type="number"
              min="1"
              max="30"
              step="0.5"
              value={annualRate}
              onChange={(e) => setAnnualRate(e.target.value)}
              className="mt-1.5 w-full rounded-2xl border border-white/[0.08] bg-zinc-900/70 py-3 px-4 text-sm font-mono font-bold text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-400">
              Duration (Years)
            </label>
            <input
              type="number"
              min="1"
              max="40"
              value={years}
              onChange={(e) => setYears(e.target.value)}
              className="mt-1.5 w-full rounded-2xl border border-white/[0.08] bg-zinc-900/70 py-3 px-4 text-sm font-mono font-bold text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="rounded-3xl border border-white/[0.08] bg-black/60 p-6 text-white shadow-xl flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">Projected Corpus</span>
            <p className="mt-2 text-3xl md:text-4xl font-extrabold font-mono text-emerald-400 font-tabular">
              {formatCurrency(result.finalAmount)}
            </p>
            <p className="mt-1 text-xs font-mono text-zinc-400">
              {result.multiplier}x multiplier on total capital invested over {years} years.
            </p>

            <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-white/[0.06] pt-4 font-mono text-xs">
              <div>
                <dt className="text-[10px] uppercase tracking-widest text-zinc-500">Total Deposited</dt>
                <dd className="mt-1 text-sm font-bold text-zinc-300 font-tabular">{formatCurrency(result.totalContributed)}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-widest text-zinc-500">Wealth Generated</dt>
                <dd className="mt-1 text-sm font-bold text-emerald-400 font-tabular">+{formatCurrency(result.totalInterest)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- */
/* 5. Subscription Cost Auditor Component                        */
/* ------------------------------------------------------------- */
function SubscriptionAuditorTool() {
  const [subs, setSubs] = useState([
    { id: '1', name: 'Netflix Premium', amount: 649, billingCycle: 'monthly' },
    { id: '2', name: 'Spotify Duo', amount: 149, billingCycle: 'monthly' },
    { id: '3', name: 'Amazon Prime', amount: 1499, billingCycle: 'yearly' },
    { id: '4', name: 'Cloud Storage', amount: 130, billingCycle: 'monthly' }
  ]);

  const result = calculateSubscriptionCost(subs);

  const handleAddSub = () => {
    setSubs((prev) => [
      ...prev,
      { id: `s-${Date.now()}`, name: '', amount: 299, billingCycle: 'monthly' }
    ]);
  };

  const handleUpdate = (id, field, val) => {
    setSubs((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: val } : s))
    );
  };

  const handleRemove = (id) => {
    setSubs((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.06] pb-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">Leak Audit</span>
          <h2 className="mt-0.5 text-xl font-bold font-mono text-white">Subscription Cost Auditor</h2>
          <p className="mt-1 text-xs font-mono text-zinc-400">
            Uncover digital burn: see what recurring subscriptions cumulatively drain over 1 and 5 years.
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddSub}
          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-mono font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Service</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-2.5 lg:col-span-2">
          {subs.map((sub) => (
            <div
              key={sub.id}
              className="flex items-center gap-2.5 rounded-2xl border border-white/[0.06] bg-zinc-900/50 p-2.5"
            >
              <input
                type="text"
                placeholder="Service name (e.g. Netflix)"
                value={sub.name}
                onChange={(e) => handleUpdate(sub.id, 'name', e.target.value)}
                className="flex-1 rounded-xl border border-white/[0.08] bg-black/50 px-3 py-2 text-xs font-mono font-medium text-white focus:outline-none focus:border-emerald-500"
              />
              <div className="relative w-28">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-zinc-500 font-mono text-xs">₹</span>
                <input
                  type="number"
                  min="0"
                  value={sub.amount}
                  onChange={(e) => handleUpdate(sub.id, 'amount', e.target.value)}
                  className="w-full rounded-xl border border-white/[0.08] bg-black/50 py-2 pl-6 pr-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <select
                value={sub.billingCycle}
                onChange={(e) => handleUpdate(sub.id, 'billingCycle', e.target.value)}
                className="rounded-xl border border-white/[0.08] bg-black/50 px-2 py-2 text-xs font-mono text-zinc-300 focus:outline-none"
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
              <button
                type="button"
                onClick={() => handleRemove(sub.id)}
                aria-label="Remove subscription"
                className="text-zinc-500 hover:text-rose-400 p-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-white/[0.08] bg-black/60 p-6 text-white shadow-xl flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">Cumulative Drain</span>
            <div className="mt-4 space-y-4 font-mono">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-zinc-500">Monthly Burn</span>
                <p className="text-2xl font-bold text-white font-tabular">{formatCurrency(result.monthlyTotal)}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-widest text-zinc-500">Annual Outflow</span>
                <p className="text-2xl font-bold text-emerald-400 font-tabular">{formatCurrency(result.yearlyTotal)}</p>
              </div>
              <div className="border-t border-white/[0.06] pt-3">
                <span className="text-[10px] uppercase tracking-widest text-rose-400 font-semibold">5-Year Cumulative Leak</span>
                <p className="text-xl font-extrabold text-rose-400 font-tabular mt-0.5">{formatCurrency(result.fiveYearTotal)}</p>
                <p className="mt-1 text-[10px] text-zinc-500">
                  Investing this capital in an emergency reserve prevents high-interest debt.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- */
/* 6. Daily Spending Limit Calculator Component                  */
/* ------------------------------------------------------------- */
function DailySpendingTool() {
  const [income, setIncome] = useState('80000');
  const [fixedExpenses, setFixedExpenses] = useState('22000');
  const [savingsGoal, setSavingsGoal] = useState('10000');
  const [daysRemaining, setDaysRemaining] = useState('20');

  const result = calculateDailySpending({
    income: Number(income),
    fixedExpenses: Number(fixedExpenses),
    savingsGoal: Number(savingsGoal),
    daysRemaining: Number(daysRemaining)
  });

  return (
    <div className="space-y-6">
      <div className="border-b border-white/[0.06] pb-4">
        <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">Safe Burn</span>
        <h2 className="mt-0.5 text-xl font-bold font-mono text-white">Daily Spending Limit</h2>
        <p className="mt-1 text-xs font-mono text-zinc-400">
          Determine safe daily variable spending after reserving committed fixed expenses and savings targets.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-400">
              Monthly Income
            </label>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500 font-mono">₹</span>
              <input
                type="number"
                min="0"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                className="w-full rounded-2xl border border-white/[0.08] bg-zinc-900/70 py-3 pl-8 pr-4 text-sm font-mono font-bold text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-400">
              Committed Fixed Expenses (Rent, Bills)
            </label>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500 font-mono">₹</span>
              <input
                type="number"
                min="0"
                value={fixedExpenses}
                onChange={(e) => setFixedExpenses(e.target.value)}
                className="w-full rounded-2xl border border-white/[0.08] bg-zinc-900/70 py-3 pl-8 pr-4 text-sm font-mono font-bold text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-400">
              Monthly Savings Target
            </label>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500 font-mono">₹</span>
              <input
                type="number"
                min="0"
                value={savingsGoal}
                onChange={(e) => setSavingsGoal(e.target.value)}
                className="w-full rounded-2xl border border-white/[0.08] bg-zinc-900/70 py-3 pl-8 pr-4 text-sm font-mono font-bold text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-400">
              Days Remaining in Month
            </label>
            <input
              type="number"
              min="1"
              max="31"
              value={daysRemaining}
              onChange={(e) => setDaysRemaining(e.target.value)}
              className="mt-1.5 w-full rounded-2xl border border-white/[0.08] bg-zinc-900/70 py-3 px-4 text-sm font-mono font-bold text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="rounded-3xl border border-white/[0.08] bg-black/60 p-6 text-white shadow-xl flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">Safe Daily Allowance</span>
            <p className="mt-2 text-4xl font-extrabold font-mono text-emerald-400 font-tabular">
              {formatCurrency(result.safeDaily)}
              <span className="text-xs font-normal text-zinc-500"> / day</span>
            </p>
            <p className="mt-1 text-xs font-mono text-zinc-400">
              Maximum safe variable outflow today to preserve rent obligations and savings targets.
            </p>

            <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-white/[0.06] pt-4 font-mono text-xs">
              <div>
                <dt className="text-[10px] uppercase tracking-widest text-zinc-500">Total Spendable Pool</dt>
                <dd className={`mt-1 text-base font-bold font-tabular ${result.isNegative ? 'text-rose-400' : 'text-white'}`}>
                  {formatCurrency(result.spendablePool)}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-widest text-zinc-500">Days Remaining</dt>
                <dd className="mt-1 text-base font-bold text-white font-tabular">{result.daysRemaining} Days</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
