import { Zap, Activity, AlertTriangle, TrendingUp, TrendingDown, Repeat, ShoppingCart, ShieldAlert } from 'lucide-react';
import { generateSmartInsights } from '../../lib/insights';

export function SpendingIntelligence({ budgetSnapshot, transactions = [], previousMonthSnapshot = null }) {
  const insights = generateSmartInsights({
    budgetSnapshot,
    transactions,
    previousMonthSnapshot
  });

  if (!budgetSnapshot || !budgetSnapshot.hasPlan) {
    return null;
  }

  // Choose icon based on insight type / id
  const getInsightIcon = (item) => {
    if (item.id === 'overspent') return <ShieldAlert className="h-4 w-4 text-rose-500" />;
    if (item.id === 'top-category') return <ShoppingCart className="h-4 w-4 text-emerald-500" />;
    if (item.id === 'velocity-7day') return <Activity className="h-4 w-4 text-teal-500" />;
    if (item.id === 'unplanned-signal') return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    if (item.id === 'mom-increase') return <TrendingUp className="h-4 w-4 text-amber-500" />;
    if (item.id === 'mom-decrease') return <TrendingDown className="h-4 w-4 text-emerald-500" />;
    if (item.id === 'frequent-merchant') return <Repeat className="h-4 w-4 text-sky-500" />;
    return <Zap className="h-4 w-4 text-[var(--color-accent)]" />;
  };

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
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold font-mono tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Spending Intelligence
            </h2>
            <p className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
              Deterministic rule-based signals derived from verified logs
            </p>
          </div>
        </div>
        <span
          className="text-[10px] font-mono uppercase tracking-widest rounded-md px-2.5 py-1 font-bold border"
          style={{
            backgroundColor: 'var(--color-accent-badge-bg)',
            borderColor: 'var(--color-accent)',
            color: 'var(--color-accent)'
          }}
        >
          ACTIVE SIGNALS ({insights.length})
        </span>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.map((item) => {
          const isAlert = item.type === 'alert';
          const isWarning = item.type === 'warning';
          const isSuccess = item.type === 'success';

          let badgeColor = 'bg-zinc-800 text-zinc-300 border-subtle';
          let borderClass = 'border-subtle';

          if (isAlert) {
            borderClass = 'border-rose-500/30';
            badgeColor = 'bg-rose-500/10 text-rose-500 border-rose-500/20';
          } else if (isWarning) {
            borderClass = 'border-amber-500/30';
            badgeColor = 'bg-amber-500/10 text-amber-500 border-amber-500/20';
          } else if (isSuccess) {
            borderClass = 'border-emerald-500/30';
            badgeColor = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
          }

          return (
            <div
              key={item.id}
              className={`rounded-2xl border ${borderClass} p-4 flex flex-col justify-between transition-all`}
              style={{ backgroundColor: 'var(--bg-elevated)' }}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getInsightIcon(item)}
                    <h3 className="text-xs font-bold font-mono tracking-tight" style={{ color: 'var(--text-primary)' }}>
                      {item.title}
                    </h3>
                  </div>
                  {item.metric && (
                    <span
                      className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-mono font-bold uppercase border ${badgeColor}`}
                    >
                      {item.metric}
                    </span>
                  )}
                </div>
                <p className="mt-2.5 text-xs leading-relaxed font-sans" style={{ color: 'var(--text-secondary)' }}>
                  {item.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
