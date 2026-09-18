import { Target, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSpendWise } from '../../context/SpendWiseContext';

export function SavingsProgressCard({ budgetSnapshot }) {
  const { formatAppMoney } = useSpendWise();
  if (!budgetSnapshot || !budgetSnapshot.hasPlan) return null;

  const { savingsGoal, remainingAmount } = budgetSnapshot;

  // Real formula: savings is fully protected as long as variable spending has not breached the spendable budget
  const isOverspent = remainingAmount < 0;
  const currentSafeSavings = isOverspent
    ? Math.max(0, savingsGoal - Math.abs(remainingAmount))
    : savingsGoal;

  const fundedPercentage = savingsGoal > 0 ? Math.round((currentSafeSavings / savingsGoal) * 100) : 100;
  const deficit = Math.max(0, savingsGoal - currentSafeSavings);

  return (
    <div
      className="rounded-3xl border border-subtle p-6 shadow-sm transition-colors"
      style={{ backgroundColor: 'var(--bg-surface)' }}
    >
      <div className="flex items-center justify-between border-b border-subtle pb-4">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl"
            style={{ backgroundColor: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}
          >
            <Target className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold font-mono tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Savings Goal Security
            </h2>
            <p className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
              Wealth corpus protection telemetry
            </p>
          </div>
        </div>
        <Link
          to="/setup"
          className="text-xs font-mono font-bold hover:underline transition-colors"
          style={{ color: 'var(--color-accent)' }}
        >
          Adjust Target →
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 items-center">
        {/* Metric Overview */}
        <div className="space-y-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest block" style={{ color: 'var(--text-muted)' }}>
              Monthly Savings Target
            </span>
            <p className="mt-1 text-3xl font-extrabold font-mono font-tabular text-emerald-500">
              {formatAppMoney(savingsGoal)}
            </p>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              Reserved upfront before daily variable spending
            </p>
          </div>

          <div>
            <div className="flex justify-between text-xs font-mono mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              <span>Funded Runway</span>
              <span className={isOverspent ? 'text-rose-500 font-bold' : 'text-emerald-500 font-bold'}>
                {fundedPercentage}% Protected
              </span>
            </div>
            <div className="h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-subtle)' }}>
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isOverspent ? 'bg-rose-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${fundedPercentage}%` }}
              />
            </div>
          </div>

          {/* Status Message */}
          <div
            className="rounded-xl border border-subtle p-3 flex items-start gap-2.5"
            style={{ backgroundColor: 'var(--bg-elevated)' }}
          >
            {isOverspent ? (
              <>
                <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold font-mono text-rose-500">
                    Deficit Alert: {formatAppMoney(deficit)}
                  </p>
                  <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    Variable expenses have exceeded your allowance, currently eating into your savings target.
                  </p>
                </div>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold font-mono text-emerald-500">
                    100% Intact & Protected
                  </p>
                  <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    You have {formatAppMoney(remainingAmount)} in variable funds remaining before your savings target is impacted.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Circular Progress Ring */}
        <div className="flex flex-col items-center justify-center p-2">
          <div className="relative h-40 w-40 flex items-center justify-center">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="var(--border-subtle)"
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                className={`transition-all duration-1000 ${
                  isOverspent ? 'stroke-rose-500' : 'stroke-emerald-500'
                }`}
                strokeWidth="8"
                strokeDasharray={2 * Math.PI * 40}
                strokeDashoffset={2 * Math.PI * 40 * (1 - fundedPercentage / 100)}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black font-mono font-tabular" style={{ color: 'var(--text-primary)' }}>
                {fundedPercentage}%
              </span>
              <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                INTACT
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
