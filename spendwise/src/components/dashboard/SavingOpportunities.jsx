import { Target } from 'lucide-react';
import { calculateSavingOpportunities } from '../../lib/budget';
import { useSpendWise } from '../../context/SpendWiseContext';

export function SavingOpportunities({ monthKey, transactions = [] }) {
  const { formatAppMoney } = useSpendWise();
  const opportunities = calculateSavingOpportunities(monthKey, transactions);

  if (!opportunities || opportunities.length === 0) {
    return (
      <div
        className="rounded-3xl border border-subtle p-6 shadow-sm transition-colors"
        style={{ backgroundColor: 'var(--bg-surface)' }}
      >
        <div className="flex items-center gap-2.5 border-b border-subtle pb-4">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl"
            style={{ backgroundColor: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}
          >
            <Target className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold font-mono tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Where Can You Save?
            </h2>
            <p className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
              Heuristic optimizations grounded in actual transaction data
            </p>
          </div>
        </div>
        <div
          className="mt-6 rounded-2xl border border-dashed border-subtle p-8 text-center"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        >
          <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
            Not enough category data for optimization yet
          </p>
          <p className="mt-1 text-[11px] max-w-sm mx-auto" style={{ color: 'var(--text-muted)' }}>
            Log your regular food, shopping, and discretionary purchases to unlock realistic savings suggestions.
          </p>
        </div>
      </div>
    );
  }

  const totalMinSavings = opportunities.reduce((sum, o) => sum + o.minReduction, 0);
  const totalMaxSavings = opportunities.reduce((sum, o) => sum + o.maxReduction, 0);

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
            <Target className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold font-mono tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Where Can You Save?
            </h2>
            <p className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
              Actionable suggestions derived strictly from your active transactions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            POTENTIAL RECAPTURE:
          </span>
          <span
            className="text-xs font-bold font-mono font-tabular border px-2.5 py-1 rounded-lg"
            style={{
              backgroundColor: 'var(--color-accent-subtle)',
              borderColor: 'var(--color-accent)',
              color: 'var(--color-accent)'
            }}
          >
            +{formatAppMoney(totalMinSavings)} – {formatAppMoney(totalMaxSavings)}
          </span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {opportunities.map((opp) => (
          <div
            key={opp.id}
            className="rounded-2xl border border-subtle p-5 flex flex-col justify-between hover:border-[var(--color-accent)] transition-all group"
            style={{ backgroundColor: 'var(--bg-elevated)' }}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  {opp.category}
                </span>
                <span className="text-xs font-mono font-bold font-tabular" style={{ color: 'var(--text-secondary)' }}>
                  {formatAppMoney(opp.currentSpend)} logged
                </span>
              </div>

              <h3 className="mt-3 text-sm font-bold font-mono tracking-tight" style={{ color: 'var(--text-primary)' }}>
                {opp.title}
              </h3>
              <p className="mt-2 text-xs leading-relaxed font-sans" style={{ color: 'var(--text-secondary)' }}>
                {opp.rationale}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-subtle space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase" style={{ color: 'var(--text-muted)' }}>
                  Target Reduction
                </span>
                <span className="text-sm font-bold font-mono text-emerald-500 font-tabular">
                  +{formatAppMoney(opp.minReduction)} – {formatAppMoney(opp.maxReduction)}
                </span>
              </div>
              <p className="text-[10px] font-mono italic" style={{ color: 'var(--text-muted)' }}>
                * {opp.methodology}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
