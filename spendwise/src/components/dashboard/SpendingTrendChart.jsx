import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { useSpendWise } from '../../context/SpendWiseContext';

export function SpendingTrendChart({ monthKey, transactions = [] }) {
  const { formatAppMoney } = useSpendWise();
  const monthTransactions = transactions.filter(
    (t) => (t.date && t.date.startsWith(monthKey)) || t.monthKey === monthKey
  );

  // Group by date
  const dailyMap = {};
  monthTransactions.forEach((t) => {
    const d = t.date ? (t.date.includes('T') ? t.date.split('T')[0] : t.date) : null;
    if (d) {
      dailyMap[d] = (dailyMap[d] || 0) + (Number(t.amount) || 0);
    }
  });

  const sortedDates = Object.keys(dailyMap).sort();
  const chartData = sortedDates.map((dateStr) => {
    const dayNum = dateStr.split('-')[2];
    return {
      date: dateStr,
      displayDate: `D${parseInt(dayNum, 10)}`,
      amount: Math.round(dailyMap[dateStr])
    };
  });

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
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold font-mono tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Spending Velocity
            </h2>
            <p className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
              Daily discretionary outlay progression
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          {sortedDates.length} Active {sortedDates.length === 1 ? 'Day' : 'Days'}
        </span>
      </div>

      {chartData.length < 2 ? (
        <div
          className="rounded-2xl border border-dashed border-subtle p-8 text-center my-6"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
        >
          <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
            Not enough daily checkpoints yet
          </p>
          <p className="mt-1 text-[11px] max-w-sm mx-auto" style={{ color: 'var(--text-muted)' }}>
            Log transactions across multiple dates to unlock the chronological burn velocity trendline.
          </p>
        </div>
      ) : (
        <div className="mt-6 h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="spendVelocityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="displayDate" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} tickFormatter={(v) => `${v}`} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div
                        className="rounded-xl border border-subtle p-3 shadow-xl font-mono text-xs"
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          color: 'var(--text-primary)'
                        }}
                      >
                        <span className="text-[10px] uppercase block" style={{ color: 'var(--text-muted)' }}>
                          Date: {data.date}
                        </span>
                        <span className="text-sm font-bold font-tabular mt-0.5 block" style={{ color: 'var(--color-accent)' }}>
                          {formatAppMoney(data.amount)} spent
                        </span>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="var(--color-accent)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#spendVelocityGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
