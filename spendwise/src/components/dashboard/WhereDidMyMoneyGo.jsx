import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import { getCategoryBreakdown } from '../../lib/budget';
import { useSpendWise } from '../../context/SpendWiseContext';

export function WhereDidMyMoneyGo({
  monthKey,
  transactions = [],
  spendableBudget = 0,
  onSelectCategory = null
}) {
  const { formatAppMoney } = useSpendWise();
  const categories = getCategoryBreakdown(monthKey, transactions, spendableBudget);
  const totalSpent = categories.reduce((sum, c) => sum + c.amount, 0);

  // Filter categories that have spending for the chart
  const chartData = categories
    .filter((c) => c.amount > 0)
    .map((c) => ({
      name: c.name,
      value: c.amount,
      color: c.color,
      emoji: c.emoji,
      id: c.id
    }));

  // Sort categories by amount descending
  const sortedCategories = [...categories].sort((a, b) => b.amount - a.amount);

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
            <PieIcon className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold font-mono tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Where Your Money Went
            </h2>
            <p className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
              Categorical distribution of variable outlays
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Total Spent:
          </span>
          <span className="text-sm font-bold font-mono font-tabular" style={{ color: 'var(--text-primary)' }}>
            {formatAppMoney(totalSpent)}
          </span>
        </div>
      </div>

      {totalSpent === 0 ? (
        <div
          className="rounded-2xl border border-dashed border-subtle p-8 text-center my-6"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        >
          <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
            No variable expenses recorded yet
          </p>
          <p className="mt-1 text-[11px] max-w-sm mx-auto" style={{ color: 'var(--text-muted)' }}>
            Log your daily food, groceries, transit, or shopping to visualize your categorical distribution.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Recharts Donut */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <div className="relative h-52 w-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="transparent"
                    strokeWidth={0}
                  >
                    {chartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div
                            className="rounded-xl border border-subtle p-3 shadow-xl font-mono text-xs"
                            style={{
                              backgroundColor: 'var(--bg-surface)',
                              color: 'var(--text-primary)',
                            }}
                          >
                            <p className="font-bold flex items-center gap-1.5">
                              <span>{item.emoji}</span>
                              <span>{item.name}</span>
                            </p>
                            <p className="mt-1 font-bold font-tabular text-[var(--color-accent)]">
                              {formatAppMoney(item.value)}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center Metric */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  VARIABLE
                </span>
                <span className="text-lg font-bold font-mono font-tabular" style={{ color: 'var(--text-primary)' }}>
                  {formatAppMoney(totalSpent)}
                </span>
              </div>
            </div>
          </div>

          {/* Categorical Bars Column */}
          <div className="lg:col-span-7 space-y-2.5">
            {sortedCategories.map((cat) => {
              const pct = totalSpent > 0 ? Math.round((cat.amount / totalSpent) * 100) : 0;
              const isProminent = cat.id === 'food' || cat.id === 'shopping';

              return (
                <div
                  key={cat.id}
                  onClick={() => onSelectCategory && onSelectCategory(cat)}
                  className="group rounded-xl border border-subtle p-3 transition-all cursor-pointer hover:border-[var(--color-accent)]"
                  style={{ backgroundColor: 'var(--bg-elevated)' }}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base leading-none">{cat.emoji}</span>
                      <span className="font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                        {cat.name}
                      </span>
                      {isProminent && (
                        <span
                          className="rounded px-1.5 py-0.5 text-[9px] font-mono uppercase"
                          style={{
                            backgroundColor: 'var(--color-accent-badge-bg)',
                            color: 'var(--color-accent)'
                          }}
                        >
                          Core
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                        {cat.count} tx
                      </span>
                      <span className="text-sm font-bold font-mono font-tabular" style={{ color: 'var(--text-primary)' }}>
                        {formatAppMoney(cat.amount)}
                      </span>
                    </div>
                  </div>

                  {/* Visual Bar */}
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-subtle)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: cat.color || 'var(--color-accent)'
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-mono w-8 text-right font-tabular" style={{ color: 'var(--text-secondary)' }}>
                      {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
