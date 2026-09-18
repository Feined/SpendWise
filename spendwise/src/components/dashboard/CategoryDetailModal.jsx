import { X } from 'lucide-react';
import { useSpendWise } from '../../context/SpendWiseContext';

export function CategoryDetailModal({ category, monthKey, transactions = [], onClose }) {
  const { formatAppMoney } = useSpendWise();
  if (!category) return null;

  const monthTransactions = transactions.filter(
    (t) => (t.date && t.date.startsWith(monthKey)) || t.monthKey === monthKey
  );
  const catTxs = monthTransactions.filter((t) => (t.categoryId || t.category) === category.id);
  const totalAmount = catTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const count = catTxs.length;
  const avgAmount = count > 0 ? Math.round(totalAmount / count) : 0;
  const largestTx = catTxs.reduce(
    (max, t) => ((Number(t.amount) || 0) > (Number(max?.amount) || 0) ? t : max),
    null
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-subtle shadow-2xl transition-colors"
        style={{ backgroundColor: 'var(--bg-surface)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-subtle p-6">
          <div className="flex items-center gap-3">
            <span
              className="text-3xl p-2 rounded-2xl border border-subtle"
              style={{ backgroundColor: 'var(--bg-elevated)' }}
            >
              {category.emoji}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-widest text-[var(--color-accent)] font-bold">
                  Category Exploration
                </span>
                <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                  // {monthKey}
                </span>
              </div>
              <h2 className="text-xl font-bold font-mono tracking-tight" style={{ color: 'var(--text-primary)' }}>
                {category.name} Analysis
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-subtle p-2 transition-colors cursor-pointer hover:bg-[var(--border-subtle)]"
            style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 4 Performance Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px border-b border-subtle" style={{ backgroundColor: 'var(--border-subtle)' }}>
          <div className="p-4" style={{ backgroundColor: 'var(--bg-surface)' }}>
            <span className="text-[10px] font-mono uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
              Total Spent
            </span>
            <p className="mt-1 text-lg font-bold font-mono font-tabular" style={{ color: 'var(--text-primary)' }}>
              {formatAppMoney(totalAmount)}
            </p>
          </div>
          <div className="p-4" style={{ backgroundColor: 'var(--bg-surface)' }}>
            <span className="text-[10px] font-mono uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
              Transactions
            </span>
            <p className="mt-1 text-lg font-bold font-mono font-tabular" style={{ color: 'var(--text-primary)' }}>
              {count}
            </p>
          </div>
          <div className="p-4" style={{ backgroundColor: 'var(--bg-surface)' }}>
            <span className="text-[10px] font-mono uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
              Average Purchase
            </span>
            <p className="mt-1 text-lg font-bold font-mono font-tabular text-emerald-500">
              {formatAppMoney(avgAmount)}
            </p>
          </div>
          <div className="p-4" style={{ backgroundColor: 'var(--bg-surface)' }}>
            <span className="text-[10px] font-mono uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
              Largest Ticket
            </span>
            <p className="mt-1 text-lg font-bold font-mono font-tabular text-amber-500">
              {largestTx ? formatAppMoney(largestTx.amount) : '0'}
            </p>
          </div>
        </div>

        {/* Transactions Stream */}
        <div className="p-6 max-h-[380px] overflow-y-auto space-y-2">
          <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
            <span>Transaction Event Log ({count})</span>
            <span>Recorded Amount</span>
          </div>

          {catTxs.length === 0 ? (
            <div className="py-12 text-center text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              No transactions recorded in {category.name} for {monthKey}.
            </div>
          ) : (
            catTxs.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-xl border border-subtle p-3 transition-colors hover:border-[var(--color-accent)]"
                style={{ backgroundColor: 'var(--bg-elevated)' }}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      {tx.label || tx.merchant || 'Transaction'}
                    </span>
                    {tx.nature && (
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider ${
                          tx.nature === 'need'
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : 'bg-sky-500/10 text-sky-500 border border-sky-500/20'
                        }`}
                      >
                        {tx.nature}
                      </span>
                    )}
                    {tx.planned !== undefined && (
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider ${
                          tx.planned
                            ? 'bg-zinc-800 text-zinc-300'
                            : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                        }`}
                      >
                        {tx.planned ? 'PLANNED' : 'UNPLANNED'}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                    <span>{tx.date}</span>
                    {tx.note && <span className="truncate max-w-[200px]">"{tx.note}"</span>}
                  </div>
                </div>

                <span className="text-sm font-bold font-mono font-tabular" style={{ color: 'var(--text-primary)' }}>
                  -{formatAppMoney(tx.amount)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
