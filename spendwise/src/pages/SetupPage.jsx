import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSpendWise } from '../context/SpendWiseContext';
import {
  calculateBudget,
  formatCurrency,
  formatMonthDisplay,
  shiftMonth
} from '../lib/budget';
import { Plus, Trash2, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Inner form component keyed by selectedMonth to guarantee clean,
 * non-cascading state initialization without anti-pattern useEffect setState.
 */
function SetupForm({ selectedMonth, existingPlan, onSave, isSaving, submitError }) {
  const [estimatedIncome, setEstimatedIncome] = useState(
    String(existingPlan?.estimatedIncome ?? 0)
  );
  const [actualIncome, setActualIncome] = useState(
    String(existingPlan?.actualIncome ?? 0)
  );
  const [savingsGoal, setSavingsGoal] = useState(
    String(existingPlan?.savingsGoal ?? 0)
  );
  const [fixedExpenses, setFixedExpenses] = useState(() =>
    Array.isArray(existingPlan?.fixedExpenses)
      ? existingPlan.fixedExpenses.map((fe) => ({
          id: fe.id || `fe-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: fe.name || '',
          amount: String(fe.amount ?? '')
        }))
      : []
  );

  const [errors, setErrors] = useState({});

  // Live budget calculation using pure calculation utility
  const liveBudget = useMemo(() => {
    const est = parseFloat(estimatedIncome) || 0;
    const act = parseFloat(actualIncome) || 0;
    const sav = parseFloat(savingsGoal) || 0;
    const fixed = fixedExpenses.map((fe) => ({
      id: fe.id,
      name: fe.name,
      amount: parseFloat(fe.amount) || 0
    }));

    return calculateBudget({
      monthKey: selectedMonth,
      estimatedIncome: est,
      actualIncome: act,
      savingsGoal: sav,
      fixedExpenses: fixed
    });
  }, [selectedMonth, estimatedIncome, actualIncome, savingsGoal, fixedExpenses]);

  // Fixed expense handlers
  const handleAddFixedExpense = () => {
    const newId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `fe-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    setFixedExpenses((prev) => [
      ...prev,
      { id: newId, name: '', amount: '' }
    ]);
  };

  const handleUpdateFixedExpense = (id, field, value) => {
    setFixedExpenses((prev) =>
      prev.map((fe) => (fe.id === id ? { ...fe, [field]: value } : fe))
    );

    const errKey = `fe_${id}_${field}`;
    if (errors[errKey]) {
      setErrors((prev) => ({ ...prev, [errKey]: undefined }));
    }
  };

  const handleRemoveFixedExpense = (id) => {
    setFixedExpenses((prev) => prev.filter((fe) => fe.id !== id));
  };

  // Form Validation and Submission
  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    const est = parseFloat(estimatedIncome);
    if (isNaN(est) || est < 0) {
      newErrors.estimatedIncome = 'Estimated income must be 0 or greater.';
    }

    const act = parseFloat(actualIncome);
    if (isNaN(act) || act < 0) {
      newErrors.actualIncome = 'Actual income must be 0 or greater.';
    }

    const sav = parseFloat(savingsGoal);
    if (isNaN(sav) || sav < 0) {
      newErrors.savingsGoal = 'Savings goal must be 0 or greater.';
    }

    fixedExpenses.forEach((fe) => {
      if (!fe.name.trim()) {
        newErrors[`fe_${fe.id}_name`] = 'Commitment name is required.';
      }
      const feAmt = parseFloat(fe.amount);
      if (isNaN(feAmt) || feAmt < 0) {
        newErrors[`fe_${fe.id}_amount`] = 'Amount must be 0 or greater.';
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    onSave({
      monthKey: selectedMonth,
      estimatedIncome: Math.max(0, est || 0),
      actualIncome: Math.max(0, act || 0),
      savingsGoal: Math.max(0, sav || 0),
      fixedExpenses: fixedExpenses.map((fe) => ({
        id: fe.id,
        name: fe.name.trim(),
        amount: Math.max(0, parseFloat(fe.amount) || 0)
      }))
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {/* Income Section */}
      <div className="rounded-3xl border border-white/[0.08] bg-[#0c0e12] p-6 md:p-8 shadow-xl">
        <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 block font-bold">
          Step 01
        </span>
        <h2 className="text-lg font-bold font-mono text-white mt-1">
          Monthly Inflow Calibration
        </h2>
        <p className="mt-1 text-xs text-zinc-400 font-sans leading-relaxed">
          Specify your anticipated baseline income and confirmed actual received salary.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Estimated Income */}
          <div>
            <label htmlFor="estimated-income" className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
              Estimated Monthly Inflow (₹) <span className="text-emerald-400">*</span>
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500 font-mono text-sm">
                ₹
              </span>
              <input
                id="estimated-income"
                type="number"
                min="0"
                step="any"
                value={estimatedIncome}
                onChange={(e) => {
                  setEstimatedIncome(e.target.value);
                  if (errors.estimatedIncome) {
                    setErrors((prev) => ({ ...prev, estimatedIncome: undefined }));
                  }
                }}
                className={`block min-h-11 w-full rounded-xl border pl-8 pr-3 text-sm font-mono text-white shadow-xs focus:outline-none ${
                  errors.estimatedIncome
                    ? 'border-rose-500 bg-rose-500/10'
                    : 'border-white/[0.08] bg-zinc-900 focus:border-emerald-500'
                }`}
                placeholder="80000"
              />
            </div>
            {errors.estimatedIncome && (
              <p className="mt-1 text-[11px] font-mono text-rose-400">{errors.estimatedIncome}</p>
            )}
          </div>

          {/* Actual Income */}
          <div>
            <label htmlFor="actual-income" className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
              Actual Confirmed Inflow (₹)
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500 font-mono text-sm">
                ₹
              </span>
              <input
                id="actual-income"
                type="number"
                min="0"
                step="any"
                value={actualIncome}
                onChange={(e) => {
                  setActualIncome(e.target.value);
                  if (errors.actualIncome) {
                    setErrors((prev) => ({ ...prev, actualIncome: undefined }));
                  }
                }}
                className={`block min-h-11 w-full rounded-xl border pl-8 pr-3 text-sm font-mono text-white shadow-xs focus:outline-none ${
                  errors.actualIncome
                    ? 'border-rose-500 bg-rose-500/10'
                    : 'border-white/[0.08] bg-zinc-900 focus:border-emerald-500'
                }`}
                placeholder="0"
              />
            </div>
            {errors.actualIncome && (
              <p className="mt-1 text-[11px] font-mono text-rose-400">{errors.actualIncome}</p>
            )}
            <p className="mt-1 text-[10px] font-mono text-zinc-500">
              When &gt; 0, SpendWise automatically overrides estimated income.
            </p>
          </div>
        </div>
      </div>

      {/* Fixed Expenses Section */}
      <div className="rounded-3xl border border-white/[0.08] bg-[#0c0e12] p-6 md:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/[0.06] pb-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 block font-bold">
              Step 02
            </span>
            <h2 className="text-lg font-bold font-mono text-white mt-1">
              Fixed Monthly Commitments
            </h2>
            <p className="mt-1 text-xs text-zinc-400 font-sans leading-relaxed">
              Mandatory costs like rent, Wi-Fi, electricity, or subscriptions. Reserved upfront.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddFixedExpense}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 hover:bg-emerald-500 hover:text-black transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Add Commitment</span>
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {fixedExpenses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/[0.08] bg-zinc-900/20 p-8 text-center">
              <p className="text-xs font-mono text-zinc-400">
                No fixed commitments added yet. Click "+ Add Commitment" to itemize House Rent, Utilities, etc.
              </p>
            </div>
          ) : (
            fixedExpenses.map((fe) => (
              <div
                key={fe.id}
                className="flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-zinc-900/40 p-3.5 sm:flex-row sm:items-center"
              >
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Commitment Name (e.g. Rent, Wi-Fi, EMI)"
                    value={fe.name}
                    onChange={(e) => handleUpdateFixedExpense(fe.id, 'name', e.target.value)}
                    className="block min-h-11 w-full rounded-xl border border-white/[0.08] bg-zinc-900 px-3.5 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
                  />
                  {errors[`fe_${fe.id}_name`] && (
                    <p className="mt-1 text-[11px] font-mono text-rose-400">
                      {errors[`fe_${fe.id}_name`]}
                    </p>
                  )}
                </div>

                <div className="w-full sm:w-44">
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500 font-mono text-xs">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Amount"
                      value={fe.amount}
                      onChange={(e) => handleUpdateFixedExpense(fe.id, 'amount', e.target.value)}
                      className="block min-h-11 w-full rounded-xl border border-white/[0.08] bg-zinc-900 pl-7 pr-3 text-xs font-mono text-white font-tabular focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  {errors[`fe_${fe.id}_amount`] && (
                    <p className="mt-1 text-[11px] font-mono text-rose-400">
                      {errors[`fe_${fe.id}_amount`]}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveFixedExpense(fe.id)}
                  title="Remove Commitment"
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-zinc-900 text-zinc-400 hover:text-rose-400 hover:border-rose-500/30 transition-colors cursor-pointer self-end sm:self-auto"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Savings Target Section */}
      <div className="rounded-3xl border border-white/[0.08] bg-[#0c0e12] p-6 md:p-8 shadow-xl">
        <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 block font-bold">
          Step 03
        </span>
        <h2 className="text-lg font-bold font-mono text-white mt-1">
          Monthly Savings Target
        </h2>
        <p className="mt-1 text-xs text-zinc-400 font-sans leading-relaxed">
          Dedicated wealth corpus reserved upfront before calculating variable daily allowances.
        </p>

        <div className="mt-6 max-w-sm">
          <label htmlFor="savings-goal" className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
            Savings Target (₹) <span className="text-emerald-400">*</span>
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500 font-mono text-sm">
              ₹
            </span>
            <input
              id="savings-goal"
              type="number"
              min="0"
              step="any"
              value={savingsGoal}
              onChange={(e) => {
                setSavingsGoal(e.target.value);
                if (errors.savingsGoal) {
                  setErrors((prev) => ({ ...prev, savingsGoal: undefined }));
                }
              }}
              className={`block min-h-11 w-full rounded-xl border pl-8 pr-3 text-sm font-mono text-white shadow-xs focus:outline-none ${
                errors.savingsGoal
                  ? 'border-rose-500 bg-rose-500/10'
                  : 'border-white/[0.08] bg-zinc-900 focus:border-emerald-500'
              }`}
              placeholder="10000"
            />
          </div>
          {errors.savingsGoal && (
            <p className="mt-1 text-[11px] font-mono text-rose-400">{errors.savingsGoal}</p>
          )}
        </div>
      </div>

      {/* Live Budget Summary Card */}
      <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-zinc-950 to-[#0c0e12] p-6 md:p-8 shadow-2xl">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.06] pb-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 block font-bold">
              Real-time Calibration
            </span>
            <h3 className="text-base font-bold font-mono text-white">
              Live Budget Outcome
            </h3>
          </div>
          <span
            className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-mono font-bold uppercase border ${
              liveBudget.incomeSource === 'actual'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-zinc-800 text-zinc-400 border-white/[0.08]'
            }`}
          >
            {liveBudget.incomeSource === 'actual' ? 'Actual Verified Pay' : 'Estimated Inflow'}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono">
          <div>
            <span className="text-[10px] uppercase text-zinc-500">Inflow For Budget</span>
            <p className="mt-1 text-xl font-bold text-white font-tabular">
              {formatCurrency(liveBudget.incomeForBudget)}
            </p>
          </div>
          <div>
            <span className="text-[10px] uppercase text-zinc-500">Total Fixed</span>
            <p className="mt-1 text-xl font-bold text-zinc-300 font-tabular">
              -{formatCurrency(liveBudget.totalFixedExpenses)}
            </p>
          </div>
          <div>
            <span className="text-[10px] uppercase text-emerald-500">Savings Target</span>
            <p className="mt-1 text-xl font-bold text-emerald-400 font-tabular">
              {formatCurrency(liveBudget.savingsGoal)}
            </p>
          </div>
          <div>
            <span className="text-[10px] uppercase text-teal-400">Spendable Variable Pool</span>
            <p
              className={`mt-1 text-xl font-bold font-tabular ${
                liveBudget.isNegative ? 'text-rose-400' : 'text-teal-300'
              }`}
            >
              {formatCurrency(liveBudget.spendableBudget)}
            </p>
          </div>
        </div>

        {/* Negative Budget Warning */}
        {liveBudget.isNegative && (
          <div className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-mono text-rose-300 leading-relaxed">
            <span className="font-bold text-rose-400">DEFICIT WARNING: </span>
            Your fixed costs ({formatCurrency(liveBudget.totalFixedExpenses)}) + savings target ({formatCurrency(liveBudget.savingsGoal)}) exceed your total inflow ({formatCurrency(liveBudget.incomeForBudget)}) by {formatCurrency(Math.abs(liveBudget.spendableBudget))}. Adjust values to preserve variable liquidity.
          </div>
        )}
      </div>

      {/* Form Error Notice */}
      {submitError && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-mono text-rose-400">
          {submitError}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-8 text-xs font-mono font-bold uppercase tracking-wider text-black shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:bg-emerald-400 disabled:opacity-50 transition-all cursor-pointer"
        >
          <span>{isSaving ? 'Saving Calibration...' : 'Lock In Month Plan'}</span>
          <ArrowRight className="h-4 w-4 stroke-[2.5]" />
        </button>
        <Link
          to="/dashboard"
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/[0.1] bg-zinc-900 px-6 text-xs font-mono font-medium text-zinc-400 hover:text-white transition-colors"
        >
          Cancel / Return to Dashboard
        </Link>
      </div>
    </form>
  );
}

export function SetupPage() {
  const navigate = useNavigate();
  const {
    selectedMonth,
    setSelectedMonth,
    getMonthPlan,
    saveMonthPlan
  } = useSpendWise();

  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const existingPlan = getMonthPlan(selectedMonth);

  const handleMonthChange = (newMonthKey) => {
    if (newMonthKey && /^\d{4}-\d{2}$/.test(newMonthKey)) {
      setSelectedMonth(newMonthKey);
    }
  };

  const handlePrevMonth = () => {
    setSelectedMonth(shiftMonth(selectedMonth, -1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(shiftMonth(selectedMonth, 1));
  };

  const handleSave = (planData) => {
    setIsSaving(true);
    setSubmitError(null);
    try {
      saveMonthPlan(planData);
      navigate('/dashboard');
    } catch (err) {
      setSubmitError(err.message || 'Failed to save monthly budget plan.');
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:py-10 space-y-6 font-sans">
      {/* Page Header */}
      <div className="border-b border-white/[0.06] pb-6">
        <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 block">
          Budget Configuration Engine
        </span>
        <h1 className="mt-1 text-2xl md:text-3xl font-extrabold text-white font-mono tracking-tight">
          Monthly Budget Setup
        </h1>
        <p className="mt-0.5 text-xs text-zinc-400 font-mono">
          Establish inflow baseline, non-negotiable commitments, and upfront savings
        </p>
      </div>

      {/* Month Selection Bar */}
      <div className="rounded-3xl border border-white/[0.08] bg-[#0c0e12] p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block">
              Configured Target Month
            </span>
            <div className="mt-1.5 flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                aria-label="Previous month"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-zinc-900 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="min-w-[150px] text-center text-base font-bold font-mono text-white">
                {formatMonthDisplay(selectedMonth)}
              </span>

              <button
                type="button"
                onClick={handleNextMonth}
                aria-label="Next month"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-zinc-900 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-xs font-mono text-zinc-500">Jump to:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="rounded-xl border border-white/[0.08] bg-zinc-900 px-3 py-2 text-xs font-mono text-zinc-300 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Form keyed to selectedMonth for atomic month switches */}
      <SetupForm
        key={selectedMonth}
        selectedMonth={selectedMonth}
        existingPlan={existingPlan}
        onSave={handleSave}
        isSaving={isSaving}
        submitError={submitError}
      />
    </div>
  );
}
