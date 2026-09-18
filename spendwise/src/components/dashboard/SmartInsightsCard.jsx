import {
  Sparkles,
  AlertTriangle,
  ShieldCheck,
  Target,
  Repeat,
  PieChart,
  SlidersHorizontal,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { generateSmartInsights } from '../../lib/insights';

const ICON_MAP = {
  AlertTriangle,
  ShieldCheck,
  Target,
  Repeat,
  PieChart,
  SlidersHorizontal,
  TrendingUp,
  TrendingDown,
  Sparkles
};

export function SmartInsightsCard({ budgetSnapshot, transactions = [], previousMonthSnapshot = null }) {
  const insights = generateSmartInsights({
    budgetSnapshot,
    transactions,
    previousMonthSnapshot
  });

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-teal-700 to-emerald-600 text-white shadow-xs">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 md:text-lg">
              Smart Money Insights
            </h2>
            <p className="text-xs text-slate-500">
              Rule-based intelligence derived from your real transactions
            </p>
          </div>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
          {insights.length} {insights.length === 1 ? 'Insight' : 'Insights'}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        {insights.map((insight) => {
          const Icon = ICON_MAP[insight.icon] || Sparkles;

          let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';
          let iconStyle = 'bg-slate-100 text-slate-700';

          if (insight.type === 'alert') {
            badgeStyle = 'bg-rose-100 text-rose-800 border-rose-200';
            iconStyle = 'bg-rose-100 text-rose-700';
          } else if (insight.type === 'warning') {
            badgeStyle = 'bg-amber-100 text-amber-900 border-amber-200';
            iconStyle = 'bg-amber-100 text-amber-800';
          } else if (insight.type === 'success') {
            badgeStyle = 'bg-emerald-100 text-emerald-900 border-emerald-200';
            iconStyle = 'bg-emerald-100 text-emerald-800';
          } else if (insight.type === 'info') {
            badgeStyle = 'bg-teal-100 text-teal-900 border-teal-200';
            iconStyle = 'bg-teal-100 text-teal-800';
          }

          return (
            <div
              key={insight.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-4 hover:border-slate-200 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${iconStyle}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  {insight.metric && (
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${badgeStyle}`}>
                      {insight.metric}
                    </span>
                  )}
                </div>

                <h3 className="mt-3 text-sm font-bold text-slate-900">
                  {insight.title}
                </h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  {insight.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
