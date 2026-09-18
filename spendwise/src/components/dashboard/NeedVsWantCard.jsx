import { useState } from 'react';
import { ShieldCheck, Heart, CheckCircle2, AlertCircle } from 'lucide-react';
import { getNeedsVsWantsBreakdown, getPlannedVsUnplannedBreakdown } from '../../lib/budget';
import { useSpendWise } from '../../context/SpendWiseContext';

export function NeedVsWantCard({ monthKey, transactions = [] }) {
  const { formatAppMoney } = useSpendWise();
  const [activeTab, setActiveTab] = useState('nature'); // 'nature' | 'planned'

  const needsWants = getNeedsVsWantsBreakdown(monthKey, transactions);
  const plannedUnplanned = getPlannedVsUnplannedBreakdown(monthKey, transactions);

  return (
    <div
      className="rounded-3xl border border-subtle p-6 shadow-sm transition-colors"
      style={{ backgroundColor: 'var(--bg-surface)' }}
    >
      {/* Header with Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-subtle pb-4 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-widest text-[var(--color-accent)] font-bold">
              Value Alignment
            </span>
          </div>
          <h2 className="text-base font-bold font-mono tracking-tight mt-0.5" style={{ color: 'var(--text-primary)' }}>
            {activeTab === 'nature' ? 'Needs vs Wants' : 'Planned vs Unplanned'}
          </h2>
        </div>

        {/* Tab Switcher */}
        <div
          className="flex items-center rounded-xl border border-subtle p-1 font-mono text-xs"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('nature')}
            className={`rounded-lg px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'nature'
                ? 'shadow-xs font-bold'
                : 'hover:opacity-100 opacity-70'
            }`}
            style={{
              backgroundColor: activeTab === 'nature' ? 'var(--color-accent)' : 'transparent',
              color: activeTab === 'nature' ? '#ffffff' : 'var(--text-secondary)'
            }}
          >
            Need / Want
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('planned')}
            className={`rounded-lg px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'planned'
                ? 'shadow-xs font-bold'
                : 'hover:opacity-100 opacity-70'
            }`}
            style={{
              backgroundColor: activeTab === 'planned' ? 'var(--color-accent)' : 'transparent',
              color: activeTab === 'planned' ? '#ffffff' : 'var(--text-secondary)'
            }}
          >
            Planned / Unplanned
          </button>
        </div>
      </div>

      {activeTab === 'nature' ? (
        /* Need vs Want Tab */
        needsWants.total === 0 ? (
          <div
            className="rounded-2xl border border-dashed border-subtle p-8 text-center my-6"
            style={{ backgroundColor: 'var(--bg-elevated)' }}
          >
            <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
              No Need/Want classifications yet
            </p>
            <p className="mt-1 text-[11px] max-w-sm mx-auto" style={{ color: 'var(--text-muted)' }}>
              When logging expenses in Capture Hub, classify as <strong>Need</strong> or <strong>Want</strong> to reveal lifestyle balance.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {/* Dual Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div
                className="rounded-2xl border border-emerald-500/20 p-4"
                style={{ backgroundColor: 'var(--bg-elevated)' }}
              >
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-500">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Essential Needs</span>
                </div>
                <p className="mt-2 text-2xl font-bold font-mono font-tabular" style={{ color: 'var(--text-primary)' }}>
                  {formatAppMoney(needsWants.needsAmount)}
                </p>
                <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                  {needsWants.needsPercentage}% of classified
                </span>
              </div>

              <div
                className="rounded-2xl border border-sky-500/20 p-4"
                style={{ backgroundColor: 'var(--bg-elevated)' }}
              >
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-sky-500">
                  <Heart className="h-4 w-4" />
                  <span>Discretionary Wants</span>
                </div>
                <p className="mt-2 text-2xl font-bold font-mono font-tabular" style={{ color: 'var(--text-primary)' }}>
                  {formatAppMoney(needsWants.wantsAmount)}
                </p>
                <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                  {needsWants.wantsPercentage}% of classified
                </span>
              </div>
            </div>

            {/* Split Progress Bar */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                <span>Needs ({needsWants.needsPercentage}%)</span>
                <span>Wants ({needsWants.wantsPercentage}%)</span>
              </div>
              <div className="flex h-2.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-subtle)' }}>
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${needsWants.needsPercentage}%` }}
                />
                <div
                  className="h-full bg-sky-400 transition-all duration-500"
                  style={{ width: `${needsWants.wantsPercentage}%` }}
                />
              </div>
            </div>

            {/* Potential Savings Opportunity Callout */}
            <div
              className="rounded-2xl border border-subtle p-4 flex items-center justify-between gap-4"
              style={{ backgroundColor: 'var(--bg-elevated)' }}
            >
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--color-accent)] block">
                  Potential Savings Opportunity
                </span>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Trimming 25% of discretionary wants captures extra liquidity for your savings goals.
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xl font-bold font-mono text-[var(--color-accent)] font-tabular">
                  +{formatAppMoney(needsWants.potentialSavings)}
                </span>
              </div>
            </div>
          </div>
        )
      ) : (
        /* Planned vs Unplanned Tab */
        plannedUnplanned.total === 0 ? (
          <div
            className="rounded-2xl border border-dashed border-subtle p-8 text-center my-6"
            style={{ backgroundColor: 'var(--bg-elevated)' }}
          >
            <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
              No Planned/Unplanned transactions yet
            </p>
            <p className="mt-1 text-[11px] max-w-sm mx-auto" style={{ color: 'var(--text-muted)' }}>
              When logging expenses, select whether the payment was planned in advance or an impulse purchase.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {/* Dual Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div
                className="rounded-2xl border border-subtle p-4"
                style={{ backgroundColor: 'var(--bg-elevated)' }}
              >
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-500">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Planned ({plannedUnplanned.plannedCount})</span>
                </div>
                <p className="mt-2 text-2xl font-bold font-mono font-tabular" style={{ color: 'var(--text-primary)' }}>
                  {formatAppMoney(plannedUnplanned.plannedAmount)}
                </p>
                <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                  {plannedUnplanned.plannedPercentage}% of volume
                </span>
              </div>

              <div
                className="rounded-2xl border border-amber-500/20 p-4"
                style={{ backgroundColor: 'var(--bg-elevated)' }}
              >
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-500">
                  <AlertCircle className="h-4 w-4" />
                  <span>Unplanned ({plannedUnplanned.unplannedCount})</span>
                </div>
                <p className="mt-2 text-2xl font-bold font-mono text-amber-500 font-tabular">
                  {formatAppMoney(plannedUnplanned.unplannedAmount)}
                </p>
                <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                  {plannedUnplanned.unplannedPercentage}% impulse buys
                </span>
              </div>
            </div>

            {/* Split Progress Bar */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                <span>Planned ({plannedUnplanned.plannedPercentage}%)</span>
                <span>Unplanned ({plannedUnplanned.unplannedPercentage}%)</span>
              </div>
              <div className="flex h-2.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-subtle)' }}>
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${plannedUnplanned.plannedPercentage}%` }}
                />
                <div
                  className="h-full bg-amber-500 transition-all duration-500"
                  style={{ width: `${plannedUnplanned.unplannedPercentage}%` }}
                />
              </div>
            </div>

            <div
              className="rounded-2xl border border-subtle p-4"
              style={{ backgroundColor: 'var(--bg-elevated)' }}
            >
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest block" style={{ color: 'var(--text-muted)' }}>
                Discipline Diagnosis
              </span>
              <p className="mt-1 text-xs leading-relaxed font-sans" style={{ color: 'var(--text-secondary)' }}>
                {plannedUnplanned.unplannedPercentage > 30
                  ? 'High volume of spontaneous purchases. Setting a dedicated pocket-money cap guards your savings.'
                  : 'High intentionality! Over 70% of your expenses were scheduled or expected.'}
              </p>
            </div>
          </div>
        )
      )}
    </div>
  );
}
