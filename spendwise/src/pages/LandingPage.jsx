import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ShieldCheck,
  Target,
  Zap,
  Activity,
  Layers,
  Sparkles,
  Lock,
  Compass,
  Users,
  Camera,
  MessageSquare,
  CheckCircle2,
  Cloud,
  Database,
  TrendingUp,
  Wallet,
  Calendar,
  ChevronRight
} from 'lucide-react';
import { useSpendWise } from '../context/SpendWiseContext';

// Stagger animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
  }
};

export function LandingPage() {
  const { currentMonthPlan, appData, formatAppMoney } = useSpendWise();
  const [activeFeatureTab, setActiveFeatureTab] = useState('track');

  // Derive live numbers if configured, else realistic baseline
  const income = currentMonthPlan?.actualIncome || currentMonthPlan?.estimatedIncome || 85000;
  const fixed = (currentMonthPlan?.fixedExpenses || []).reduce(
    (sum, fe) => sum + (Number(fe.amount) || 0),
    0
  ) || 24500;
  const savings = currentMonthPlan?.savingsGoal || 15000;
  const spendable = Math.max(0, income - fixed - savings);
  const spent = (appData?.transactions || []).reduce(
    (sum, t) => sum + (Number(t.amount) || 0),
    0
  ) || 9800;
  const remaining = spendable - spent;
  const safeDaily = Math.max(0, Math.round(remaining / 22));

  return (
    <div
      className="relative min-h-screen font-sans selection:bg-[var(--color-accent)] selection:text-white"
      style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}
    >
      {/* Subtle Background Elements */}
      <div className="absolute inset-0 bg-grid-technical opacity-40 pointer-events-none" />
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[650px] pointer-events-none opacity-20"
        style={{
          background: 'radial-gradient(ellipse at top, var(--color-accent) 0%, transparent 70%)'
        }}
      />

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-8 md:py-16 space-y-24 md:space-y-32">
        {/* ============================================================= */}
        {/* 1. HERO SECTION                                              */}
        {/* ============================================================= */}
        <section className="pt-6 md:pt-12">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="space-y-8"
          >
            {/* Platform Status Pill */}
            <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-2.5">
              <div
                className="inline-flex items-center gap-2 rounded-full border border-subtle px-3.5 py-1 text-xs font-mono"
                style={{ backgroundColor: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}
              >
                <span className="h-2 w-2 rounded-full bg-[var(--color-accent)] animate-status-pulse" />
                <span className="tracking-wider uppercase font-bold">Personal Financial OS</span>
              </div>
              <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                // CLOUD SYNCHRONIZED · LOCAL FIRST RESILIENT
              </span>
            </motion.div>

            {/* Oversized Headline */}
            <motion.div variants={itemVariants} className="max-w-4xl space-y-4">
              <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.05]" style={{ color: 'var(--text-primary)' }}>
                Know where your money goes. <br />
                <span
                  className="text-transparent bg-clip-text"
                  style={{
                    backgroundImage: 'linear-gradient(90deg, var(--color-accent) 0%, #38bdf8 50%, var(--text-primary) 100%)'
                  }}
                >
                  Before it disappears.
                </span>
              </h1>
              <p className="max-w-2xl text-base sm:text-lg md:text-xl leading-relaxed font-normal" style={{ color: 'var(--text-secondary)' }}>
                SpendWise turns everyday spending into a clear, living financial architecture — reserving your rent and savings on day one, so you always know your exact safe daily spending allowance.
              </p>
            </motion.div>

            {/* Action CTAs */}
            <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to="/setup"
                className="inline-flex items-center gap-2.5 rounded-2xl px-7 py-3.5 text-sm font-mono font-bold uppercase tracking-wider text-white shadow-lg transition-all hover:scale-105 cursor-pointer"
                style={{ backgroundColor: 'var(--color-accent)' }}
              >
                <span>Launch Free Budget Setup</span>
                <ArrowRight className="h-4 w-4 stroke-[2.5]" />
              </Link>

              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-2xl border border-subtle px-6 py-3.5 text-sm font-mono font-bold transition-all hover:border-[var(--color-accent)] cursor-pointer"
                style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
              >
                <Compass className="h-4 w-4 text-[var(--color-accent)]" />
                <span>Open Command Center</span>
              </Link>
            </motion.div>

            {/* LIVE FINANCIAL TELEMETRY PIPELINE PREVIEW */}
            <motion.div
              variants={itemVariants}
              className="mt-12 rounded-3xl border border-subtle p-6 md:p-8 shadow-xl relative overflow-hidden"
              style={{ backgroundColor: 'var(--bg-surface)' }}
            >
              <div className="flex items-center justify-between border-b border-subtle pb-4 mb-6 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[var(--color-accent)]" />
                  <span className="uppercase tracking-wider font-bold" style={{ color: 'var(--text-primary)' }}>
                    Live Capital Allocation Flow
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  <span>PACING: ACTIVE</span>
                  <span className="hidden sm:inline">STATE: DETERMINISTIC</span>
                </div>
              </div>

              {/* Horizontal Pipeline Steps */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 relative">
                {/* Step 1: Income */}
                <div className="rounded-2xl border border-subtle p-4 transition-all" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                  <span className="text-[10px] font-mono uppercase tracking-widest block font-bold" style={{ color: 'var(--text-muted)' }}>
                    01. Verified Income
                  </span>
                  <p className="mt-2 text-2xl font-bold font-mono tracking-tight font-tabular" style={{ color: 'var(--text-primary)' }}>
                    {formatAppMoney(income)}
                  </p>
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] font-mono text-emerald-500 font-bold">
                    <span>100% INFLOW</span>
                  </div>
                </div>

                {/* Step 2: Fixed Costs */}
                <div className="rounded-2xl border border-subtle p-4 transition-all" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                  <span className="text-[10px] font-mono uppercase tracking-widest block font-bold text-sky-500">
                    02. Fixed Costs
                  </span>
                  <p className="mt-2 text-2xl font-bold font-mono tracking-tight font-tabular text-sky-500">
                    -{formatAppMoney(fixed)}
                  </p>
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                    <span>RENT & BILLS</span>
                  </div>
                </div>

                {/* Step 3: Savings Target */}
                <div className="rounded-2xl border border-subtle p-4 transition-all" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                  <span className="text-[10px] font-mono uppercase tracking-widest block font-bold text-emerald-500">
                    03. Savings First
                  </span>
                  <p className="mt-2 text-2xl font-bold font-mono tracking-tight font-tabular text-emerald-500">
                    {formatAppMoney(savings)}
                  </p>
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] font-mono text-emerald-500/90 font-bold">
                    <span>LOCKED UPFRONT</span>
                  </div>
                </div>

                {/* Step 4: Variable Spent */}
                <div className="rounded-2xl border border-subtle p-4 transition-all" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                  <span className="text-[10px] font-mono uppercase tracking-widest block font-bold text-amber-500">
                    04. Variable Spent
                  </span>
                  <p className="mt-2 text-2xl font-bold font-mono tracking-tight font-tabular text-amber-500">
                    -{formatAppMoney(spent)}
                  </p>
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                    <span>FOOD & LIFESTYLE</span>
                  </div>
                </div>

                {/* Step 5: Safe Remaining */}
                <div className="rounded-2xl border border-[var(--color-accent)] p-4 col-span-2 sm:col-span-1 shadow-sm" style={{ backgroundColor: 'var(--color-accent-subtle)' }}>
                  <span className="text-[10px] font-mono uppercase tracking-widest block font-bold text-[var(--color-accent)]">
                    05. Available
                  </span>
                  <p className="mt-2 text-2xl font-bold font-mono tracking-tight font-tabular text-[var(--color-accent)]">
                    {formatAppMoney(remaining)}
                  </p>
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] font-mono font-bold text-[var(--color-accent)]">
                    <span>{formatAppMoney(safeDaily)}/DAY SAFE</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* ============================================================= */}
        {/* 2. THE 8 CORE PILLARS OF SPENDWISE                            */}
        {/* ============================================================= */}
        <section id="system-architecture" className="space-y-12 border-t border-subtle pt-16 md:pt-24">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="max-w-2xl">
              <span className="text-xs font-mono uppercase tracking-widest font-bold text-[var(--color-accent)] block">
                Integrated Financial Architecture
              </span>
              <h2 className="mt-2 text-3xl md:text-4xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Everything You Need To Master Your Money
              </h2>
              <p className="mt-3 text-sm md:text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Unlike generic note apps or broken screen scrapers, SpendWise provides a unified, deterministic framework combining budgeting, peer expense splitting, and receipt intelligence.
              </p>
            </div>

            <Link
              to="/setup"
              className="inline-flex items-center gap-2 text-xs font-mono font-bold text-[var(--color-accent)] hover:underline self-start md:self-auto"
            >
              <span>Explore full capabilities</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* 8 Pillar Modern Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Pillar 1: Track Spending */}
            <div className="rounded-3xl border border-subtle p-6 flex flex-col justify-between transition-all hover:border-[var(--color-accent)]" style={{ backgroundColor: 'var(--bg-surface)' }}>
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl text-[var(--color-accent)]" style={{ backgroundColor: 'var(--color-accent-subtle)' }}>
                  <Zap className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                  Track Spending Fast
                </h3>
                <p className="mt-2 text-xs leading-relaxed font-sans" style={{ color: 'var(--text-secondary)' }}>
                  Instant expense recording with full keyboard flow, receipt photo extraction, and SMS debit alert parsing. Review detected drafts before creating transactions.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-subtle flex items-center justify-between text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                <span>Sub-second Logging</span>
                <span className="text-[var(--color-accent)] font-bold">OCR + SMS</span>
              </div>
            </div>

            {/* Pillar 2: Build a Budget */}
            <div className="rounded-3xl border border-subtle p-6 flex flex-col justify-between transition-all hover:border-[var(--color-accent)]" style={{ backgroundColor: 'var(--bg-surface)' }}>
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl text-sky-500 bg-sky-500/10">
                  <Layers className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                  3-Bucket Budgeting
                </h3>
                <p className="mt-2 text-xs leading-relaxed font-sans" style={{ color: 'var(--text-secondary)' }}>
                  Prioritizes actual income over estimates. Automatically locks rent and fixed bills first, reserves savings second, leaving a true spendable balance.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-subtle flex items-center justify-between text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                <span>Deterministic Math</span>
                <span className="text-sky-500 font-bold">Fixed First</span>
              </div>
            </div>

            {/* Pillar 3: Save Money */}
            <div className="rounded-3xl border border-subtle p-6 flex flex-col justify-between transition-all hover:border-[var(--color-accent)]" style={{ backgroundColor: 'var(--bg-surface)' }}>
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl text-emerald-500 bg-emerald-500/10">
                  <Target className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                  Save With Intention
                </h3>
                <p className="mt-2 text-xs leading-relaxed font-sans" style={{ color: 'var(--text-secondary)' }}>
                  Visual circular savings progress, monthly surplus preservation, and realistic, data-driven saving opportunities tailored to your actual transaction patterns.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-subtle flex items-center justify-between text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                <span>Surplus Buffer</span>
                <span className="text-emerald-500 font-bold">Actionable Tips</span>
              </div>
            </div>

            {/* Pillar 4: Understand Spending Habits */}
            <div className="rounded-3xl border border-subtle p-6 flex flex-col justify-between transition-all hover:border-[var(--color-accent)]" style={{ backgroundColor: 'var(--bg-surface)' }}>
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl text-amber-500 bg-amber-500/10">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                  Understand Habits
                </h3>
                <p className="mt-2 text-xs leading-relaxed font-sans" style={{ color: 'var(--text-secondary)' }}>
                  Classify every expense as Need vs Want and Planned vs Unplanned. Spot impulse leaks, category concentration, and weekend burn velocity surges.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-subtle flex items-center justify-between text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                <span>Value Alignment</span>
                <span className="text-amber-500 font-bold">Impulse Radar</span>
              </div>
            </div>

            {/* Pillar 5: Split Expenses */}
            <div className="rounded-3xl border border-subtle p-6 flex flex-col justify-between transition-all hover:border-[var(--color-accent)]" style={{ backgroundColor: 'var(--bg-surface)' }}>
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl text-purple-500 bg-purple-500/10">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                  Social Split Engine
                </h3>
                <p className="mt-2 text-xs leading-relaxed font-sans" style={{ color: 'var(--text-secondary)' }}>
                  Seamless multi-person bill splitting (equal, exact amounts, percentages, and shares). Who-owes-whom net calculations, debt simplification, and settlement history.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-subtle flex items-center justify-between text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                <span>Shared Ledger</span>
                <span className="text-purple-500 font-bold">Simplify Debt</span>
              </div>
            </div>

            {/* Pillar 6: Smart Insights */}
            <div className="rounded-3xl border border-subtle p-6 flex flex-col justify-between transition-all hover:border-[var(--color-accent)]" style={{ backgroundColor: 'var(--bg-surface)' }}>
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl text-[var(--color-accent)]" style={{ backgroundColor: 'var(--color-accent-subtle)' }}>
                  <TrendingUp className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                  Smart Telemetry
                </h3>
                <p className="mt-2 text-xs leading-relaxed font-sans" style={{ color: 'var(--text-secondary)' }}>
                  Safe daily spending limit that automatically recalibrates every calendar day based on remaining funds and burn velocity. No fake numbers or hallucinated advice.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-subtle flex items-center justify-between text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                <span>Daily Pacing</span>
                <span className="text-[var(--color-accent)] font-bold">Burn Velocity</span>
              </div>
            </div>

            {/* Pillar 7: Cloud Synchronization */}
            <div className="rounded-3xl border border-subtle p-6 flex flex-col justify-between transition-all hover:border-[var(--color-accent)]" style={{ backgroundColor: 'var(--bg-surface)' }}>
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl text-teal-500 bg-teal-500/10">
                  <Cloud className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                  Cloud Synchronization
                </h3>
                <p className="mt-2 text-xs leading-relaxed font-sans" style={{ color: 'var(--text-secondary)' }}>
                  Rock-solid backend persistence with Postgres & Prisma. Access your budget and shared ledgers across phone, tablet, and desktop with automatic token refresh.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-subtle flex items-center justify-between text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                <span>Multi-Device</span>
                <span className="text-teal-500 font-bold">Offline Ready</span>
              </div>
            </div>

            {/* Pillar 8: Privacy & Security */}
            <div className="rounded-3xl border border-subtle p-6 flex flex-col justify-between transition-all hover:border-[var(--color-accent)]" style={{ backgroundColor: 'var(--bg-surface)' }}>
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl text-rose-500 bg-rose-500/10">
                  <Lock className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                  Privacy & Sovereignty
                </h3>
                <p className="mt-2 text-xs leading-relaxed font-sans" style={{ color: 'var(--text-secondary)' }}>
                  Zero third-party tracking, zero bank login scraping, and zero ads. Full user authorization enforcement on every endpoint and encrypted JWT session cookies.
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-subtle flex items-center justify-between text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                <span>Encrypted Auth</span>
                <span className="text-rose-500 font-bold">100% Isolated</span>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================= */}
        {/* 3. INTERACTIVE SPOTLIGHT: HOW SPENDWISE OPERATES              */}
        {/* ============================================================= */}
        <section className="rounded-3xl border border-subtle p-6 md:p-10 shadow-lg space-y-8" style={{ backgroundColor: 'var(--bg-surface)' }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-subtle pb-6">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest font-bold text-[var(--color-accent)]">
                Workflow Spotlight
              </span>
              <h2 className="text-2xl font-bold font-mono tracking-tight mt-1" style={{ color: 'var(--text-primary)' }}>
                Designed For Daily Financial Clarity
              </h2>
            </div>

            {/* Tab selector */}
            <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-subtle p-1 font-mono text-xs" style={{ backgroundColor: 'var(--bg-elevated)' }}>
              {[
                { id: 'track', label: '1. Fast Capture' },
                { id: 'budget', label: '2. Safe Allowance' },
                { id: 'split', label: '3. Social Ledger' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFeatureTab(tab.id)}
                  className={`rounded-xl px-3.5 py-1.5 font-bold transition-all cursor-pointer ${
                    activeFeatureTab === tab.id
                      ? 'text-white shadow-xs'
                      : 'hover:opacity-100 opacity-70'
                  }`}
                  style={{
                    backgroundColor: activeFeatureTab === tab.id ? 'var(--color-accent)' : 'transparent',
                    color: activeFeatureTab === tab.id ? '#ffffff' : 'var(--text-secondary)'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Tab Panels */}
          {activeFeatureTab === 'track' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4 font-sans">
                <h3 className="text-xl font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                  From payment screenshot to classified transaction in 3 seconds.
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Whether you pay via UPI, credit card, or bank transfer, SpendWise lets you drop the screenshot receipt or paste the debit alert SMS.
                </p>
                <ul className="space-y-2.5 text-xs font-mono" style={{ color: 'var(--text-primary)' }}>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[var(--color-accent)]" />
                    <span>Automatic merchant and amount recognition</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[var(--color-accent)]" />
                    <span>Always preview and verify before creating the record</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[var(--color-accent)]" />
                    <span>Tag as Need vs Want and Planned vs Unplanned on the fly</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-2xl border border-subtle p-5 space-y-3 font-mono" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                <span className="text-[10px] uppercase tracking-wider text-[var(--color-accent)] font-bold block">
                  Interactive Preview · Payment Hub
                </span>
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-emerald-500 font-bold block">DETECTED FROM UPI RECEIPT</span>
                    <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>Swiggy Food Delivery · {formatAppMoney(480)}</p>
                    <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Nature: Need · Planned: Yes</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded font-bold">
                    VERIFIED
                  </span>
                </div>
                <div className="text-[11px] p-3 rounded-xl border border-subtle" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>
                  Daily spending limit immediately recalibrates from {formatAppMoney(safeDaily + 22)} to {formatAppMoney(safeDaily)}.
                </div>
              </div>
            </div>
          )}

          {activeFeatureTab === 'budget' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4 font-sans">
                <h3 className="text-xl font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                  Zero guesswork. Wake up knowing your exact safe daily allowance.
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  SpendWise recalculates your safe daily limit every single day. If you spend less today, your allowance increases tomorrow. If you overspend, it gently recalibrates without shaming you.
                </p>
                <ul className="space-y-2.5 text-xs font-mono" style={{ color: 'var(--text-primary)' }}>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[var(--color-accent)]" />
                    <span>Fixed rent commitments protected from variable burn</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[var(--color-accent)]" />
                    <span>Savings target locked safely upfront</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[var(--color-accent)]" />
                    <span>Calendar-aware pacing across remaining days</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-2xl border border-subtle p-5 space-y-3 font-mono" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                <span className="text-[10px] uppercase tracking-wider text-[var(--color-accent)] font-bold block">
                  Today's Spending Allowance
                </span>
                <div className="p-4 rounded-xl border border-[var(--color-accent)] bg-[var(--color-accent-subtle)] text-center">
                  <span className="text-[10px] uppercase font-bold text-[var(--color-accent)]">Dynamic Daily Allowance</span>
                  <p className="text-4xl font-extrabold font-mono font-tabular mt-1 text-[var(--color-accent)]">
                    {formatAppMoney(safeDaily)}
                  </p>
                  <span className="text-[11px] text-[var(--color-accent)] block mt-1">
                    Safe to spend today without hurting your {formatAppMoney(savings)} savings goal
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeFeatureTab === 'split' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4 font-sans">
                <h3 className="text-xl font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                  Social expenses, completely unified with your personal budget.
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Other apps treat shared bills as isolated silos. SpendWise integrates your shared split expenses into your overall financial flow — tracking receivables as pending assets and liabilities as obligations.
                </p>
                <ul className="space-y-2.5 text-xs font-mono" style={{ color: 'var(--text-primary)' }}>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[var(--color-accent)]" />
                    <span>Equal, exact amounts, percentages, or custom shares</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[var(--color-accent)]" />
                    <span>Transitive debt simplification across groups</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[var(--color-accent)]" />
                    <span>One-click settlement tracking with payment notes</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-2xl border border-subtle p-5 space-y-3 font-mono" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                <span className="text-[10px] uppercase tracking-wider text-purple-400 font-bold block">
                  Peer Net Balances · Live Ledger
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                    <span className="text-[10px] text-emerald-500 block font-bold">PEOPLE OWE YOU</span>
                    <p className="text-xl font-bold font-mono text-emerald-500 mt-1">{formatAppMoney(3400)}</p>
                    <span className="text-[10px] text-emerald-600 block mt-0.5">2 pending settlements</span>
                  </div>
                  <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/5">
                    <span className="text-[10px] text-rose-500 block font-bold">YOU OWE OTHERS</span>
                    <p className="text-xl font-bold font-mono text-rose-500 mt-1">{formatAppMoney(0)}</p>
                    <span className="text-[10px] text-zinc-400 block mt-0.5">All liabilities settled</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ============================================================= */}
        {/* 4. CALL TO ACTION                                             */}
        {/* ============================================================= */}
        <section
          className="rounded-3xl border border-subtle p-8 md:p-14 text-center relative overflow-hidden shadow-2xl"
          style={{
            background: 'linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-elevated) 100%)'
          }}
        >
          <div className="max-w-2xl mx-auto space-y-6">
            <span
              className="inline-flex items-center gap-2 rounded-full border border-subtle px-3.5 py-1 text-xs font-mono"
              style={{ backgroundColor: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Production-Ready Money Management</span>
            </span>

            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight font-mono" style={{ color: 'var(--text-primary)' }}>
              Take Absolute Command of Your Finances.
            </h2>

            <p className="text-sm md:text-base leading-relaxed font-sans" style={{ color: 'var(--text-secondary)' }}>
              Lock in your fixed rent and monthly savings goal. SpendWise handles the pacing, transaction tracking, debt simplification, and daily allowances automatically.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/setup"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl px-8 py-3.5 text-sm font-mono font-bold uppercase tracking-wider text-white shadow-lg transition-all hover:scale-105 cursor-pointer"
                style={{ backgroundColor: 'var(--color-accent)' }}
              >
                <span>Launch Budget Setup</span>
                <ArrowRight className="h-4 w-4 stroke-[2.5]" />
              </Link>
              <Link
                to="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-subtle px-7 py-3.5 text-sm font-mono font-bold transition-all hover:border-[var(--color-accent)] cursor-pointer"
                style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}
              >
                <span>Open Dashboard</span>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
