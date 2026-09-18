import { NavLink, Outlet, Link } from 'react-router-dom';
import {
  Home,
  LayoutDashboard,
  SlidersHorizontal,
  ReceiptText,
  Users,
  Calculator,
  Settings,
  Plus,
  Zap,
  HardDrive,
  Target,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';
import { useSpendWise } from '../../context/SpendWiseContext';
import { LoadingState } from '../common/LoadingState';
import { ErrorState } from '../common/ErrorState';
import { PaymentHubModal } from '../payment/PaymentHubModal';
import { AuthModal } from '../auth/AuthModal';
import { calculateBudget } from '../../lib/budget';
import { THEME_MODES } from '../../constants/theme';
import {
  Cloud,
  CheckCircle,
  LogIn,
  LogOut,
  UserCheck
} from 'lucide-react';


const NAV_ITEMS = [
  {
    to: '/',
    label: 'Home',
    end: true,
    icon: Home
  },
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard
  },
  {
    to: '/transactions',
    label: 'Transactions',
    icon: ReceiptText
  },
  {
    to: '/split',
    label: 'Friends Split',
    icon: Users,
    badge: 'Social'
  },
  {
    to: '/setup',
    label: 'Setup Plan',
    icon: SlidersHorizontal
  },
  {
    to: '/tools',
    label: 'Calculators',
    icon: Calculator
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: Settings
  }
];

export function AppLayout() {
  const {
    isLoading,
    error,
    retryLoading,
    resetData,
    currentMonthPlan,
    appData,
    openPaymentHub,
    formatAppMoney,
    updateSettings,
    openAuthModal,
    currentUser,
    isCloudSynced,
  } = useSpendWise();


  const currentTheme = appData?.settings?.theme || THEME_MODES.SYSTEM;

  const cycleTheme = () => {
    const sequence = [THEME_MODES.DAY, THEME_MODES.NIGHT, THEME_MODES.SYSTEM];
    const nextIdx = (sequence.indexOf(currentTheme) + 1) % sequence.length;
    updateSettings({ theme: sequence[nextIdx] });
  };

  // Compute live real-time telemetry
  const budgetSnapshot = calculateBudget(currentMonthPlan, appData?.transactions || []);
  
  // Real Financial Status
  let financialStatus = 'CALIBRATING';
  let statusColor = 'text-amber-500';
  let dotColor = 'bg-amber-500';

  if (budgetSnapshot.hasPlan) {
    if (budgetSnapshot.isNegative || budgetSnapshot.remainingAmount < 0) {
      financialStatus = 'OVERSPENT';
      statusColor = 'text-rose-500';
      dotColor = 'bg-rose-500';
    } else if (!budgetSnapshot.isAheadOfPace) {
      financialStatus = 'TIGHT';
      statusColor = 'text-amber-500';
      dotColor = 'bg-amber-500';
    } else {
      financialStatus = 'ON TRACK';
      statusColor = 'text-emerald-500';
      dotColor = 'bg-emerald-500';
    }
  }

  // Savings status
  const savingsPct = budgetSnapshot.hasPlan && budgetSnapshot.savingsGoal > 0
    ? (budgetSnapshot.remainingAmount >= 0
        ? '100%'
        : `${Math.max(0, Math.round(((budgetSnapshot.savingsGoal - Math.abs(budgetSnapshot.remainingAmount)) / budgetSnapshot.savingsGoal) * 100))}%`)
    : 'N/A';

  return (
    <div
      className="flex min-h-dvh flex-col md:flex-row font-sans"
      style={{
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-primary)'
      }}
    >
      {/* Mobile Top Sticky Header */}
      <header
        className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-subtle px-4 backdrop-blur-md md:hidden"
        style={{ backgroundColor: 'var(--bg-surface)' }}
      >
        <Link to="/" className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-xl font-mono font-black text-xs text-white shadow-xs"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            SW
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight font-mono" style={{ color: 'var(--text-primary)' }}>
              SPENDWISE
            </span>
          </div>
        </Link>

        {/* Mobile Quick Status & Action */}
        <div className="flex items-center gap-2">
          {/* Cloud Account Status / Login */}
          <button
            type="button"
            onClick={openAuthModal}
            className="rounded-xl border border-subtle p-1.5 cursor-pointer hover:bg-[var(--border-subtle)] transition-colors flex items-center gap-1 text-[11px] font-mono"
            style={{ color: currentUser ? 'var(--color-accent)' : 'var(--text-secondary)' }}
            title={currentUser ? `Signed in as ${currentUser.email}` : 'Sign in / Connect Cloud'}
          >
            <Cloud className="h-4 w-4" />
            {currentUser && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
          </button>

          {/* Theme Quick Toggle */}
          <button
            type="button"
            onClick={cycleTheme}
            className="rounded-xl border border-subtle p-1.5 cursor-pointer hover:bg-[var(--border-subtle)] transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            title={`Current theme: ${currentTheme}. Click to cycle.`}
          >
            {currentTheme === THEME_MODES.DAY ? (
              <Sun className="h-4 w-4" />
            ) : currentTheme === THEME_MODES.NIGHT ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Monitor className="h-4 w-4" />
            )}
          </button>

          <div
            className="flex items-center gap-1.5 rounded-full border border-subtle px-2.5 py-1 text-[10px] font-mono"
            style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${dotColor} animate-status-pulse`} />
            <span className={statusColor}>{financialStatus}</span>
          </div>

          <button
            type="button"
            onClick={() => openPaymentHub('manual')}
            className="flex h-8 items-center gap-1 rounded-xl px-3 text-xs font-bold text-white shadow-xs cursor-pointer transition-transform hover:scale-105"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Add</span>
          </button>
        </div>
      </header>

      {/* Desktop Navigation Sidebar */}
      <aside
        className="hidden md:flex md:w-64 md:flex-col md:border-r border-subtle"
        style={{ backgroundColor: 'var(--bg-surface)' }}
      >
        {/* Brand Terminal Header */}
        <div className="flex h-20 items-center justify-between border-b border-subtle px-6">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl font-mono font-bold text-sm text-white shadow-md"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              SW
            </div>
            <div>
              <Link to="/" className="text-sm font-bold tracking-wider font-mono uppercase block leading-none" style={{ color: 'var(--text-primary)' }}>
                SpendWise
              </Link>
              <span className="text-[10px] font-mono uppercase tracking-widest block mt-1" style={{ color: 'var(--text-muted)' }}>
                OS v2.0 · {appData.settings?.currencyCode || 'INR'}
              </span>
            </div>
          </div>
          <span className={`h-2 w-2 rounded-full ${dotColor} animate-status-pulse`} title={`Status: ${financialStatus}`} />
        </div>

        {/* Quick Capture Primary CTA */}
        <div className="p-4 pb-2">
          <button
            type="button"
            onClick={() => openPaymentHub('manual')}
            className="group relative flex w-full items-center justify-between overflow-hidden rounded-2xl border px-4 py-3 text-xs font-mono font-bold uppercase tracking-wider cursor-pointer transition-all hover:scale-[1.02] shadow-xs"
            style={{
              borderColor: 'var(--color-accent)',
              backgroundColor: 'var(--color-accent-subtle)',
              color: 'var(--color-accent)'
            }}
          >
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Capture Expense</span>
            </div>
            <span className="text-[10px] opacity-80 font-normal tracking-normal">
              + New
            </span>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 p-4 pt-2">
          <div className="px-3 pb-2 pt-1 text-[10px] font-mono font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            System Modules
          </div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all ${
                    isActive
                      ? 'border font-semibold shadow-xs'
                      : 'hover:bg-[var(--border-subtle)] border border-transparent'
                  }`
                }
                style={({ isActive }) => ({
                  backgroundColor: isActive ? 'var(--bg-elevated)' : 'transparent',
                  borderColor: isActive ? 'var(--border-medium)' : 'transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)'
                })}
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Icon
                        className="h-4 w-4 transition-colors"
                        style={{ color: isActive ? 'var(--color-accent)' : 'var(--text-muted)' }}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && !isActive && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[9px] font-mono font-bold uppercase"
                        style={{ backgroundColor: 'var(--color-accent-badge-bg)', color: 'var(--color-accent)' }}
                      >
                        {item.badge}
                      </span>
                    )}
                    {isActive && (
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: 'var(--color-accent)' }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Technical Operational Telemetry Footer */}
        <div className="border-t border-subtle p-4" style={{ backgroundColor: 'var(--bg-elevated)' }}>
          <div className="rounded-2xl border border-subtle p-3 space-y-2.5 font-mono text-[11px]" style={{ backgroundColor: 'var(--bg-surface)' }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Telemetry</span>
              <button
                type="button"
                onClick={cycleTheme}
                className="flex items-center gap-1 text-[10px] cursor-pointer hover:underline"
                style={{ color: 'var(--text-secondary)' }}
                title="Click to cycle theme"
              >
                {currentTheme === THEME_MODES.DAY ? (
                  <>
                    <Sun className="h-3 w-3" />
                    <span>Day</span>
                  </>
                ) : currentTheme === THEME_MODES.NIGHT ? (
                  <>
                    <Moon className="h-3 w-3" />
                    <span>Night</span>
                  </>
                ) : (
                  <>
                    <Monitor className="h-3 w-3" />
                    <span>System</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-1.5 pt-1 border-t border-subtle">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                  <Zap className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
                  Status
                </span>
                <span className={`font-bold ${statusColor} flex items-center gap-1`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
                  {financialStatus}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                  <HardDrive className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
                  Storage
                </span>
                <span className="font-medium" style={{ color: isCloudSynced ? 'var(--color-accent)' : 'var(--text-primary)' }}>
                  {isCloudSynced ? 'v2.0 CLOUD' : 'v2.0 LOCAL'}
                </span>
              </div>

              {/* Cloud Account Status */}
              <div className="pt-1.5 border-t border-subtle">
                <button
                  type="button"
                  onClick={openAuthModal}
                  className="w-full flex items-center justify-between rounded-xl px-2 py-1.5 text-[10px] font-mono border border-subtle hover:bg-[var(--border-subtle)] transition-colors cursor-pointer"
                  style={{ backgroundColor: 'var(--bg-elevated)' }}
                >
                  <span className="flex items-center gap-1.5 truncate max-w-[130px]">
                    <Cloud className={`h-3 w-3 ${isCloudSynced ? 'text-emerald-400' : 'text-amber-500'}`} />
                    <span className="truncate">{currentUser ? (currentUser.name || currentUser.email) : 'Connect Account'}</span>
                  </span>
                  <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${isCloudSynced ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-500'}`}>
                    {isCloudSynced ? 'Online' : 'Sync'}
                  </span>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                  <Target className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
                  Savings
                </span>
                <span className="font-bold text-emerald-500">
                  {savingsPct}
                </span>
              </div>
            </div>

            {budgetSnapshot.hasPlan && (
              <div className="pt-2 border-t border-subtle text-[10px] flex justify-between" style={{ color: 'var(--text-secondary)' }}>
                <span>Safe Today:</span>
                <span className="font-bold font-tabular" style={{ color: 'var(--text-primary)' }}>
                  {formatAppMoney(budgetSnapshot.safeDailyLimit)}
                </span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-x-hidden">
        <main className="flex-1 px-4 pb-24 pt-4 md:px-8 md:pb-8 md:pt-6">
          {isLoading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState error={error} onRetry={retryLoading} onReset={resetData} />
          ) : (
            <Outlet />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (5 Core Touch Targets) */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-subtle backdrop-blur-md md:hidden shadow-2xl"
        style={{
          backgroundColor: 'var(--bg-surface)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)'
        }}
      >
        <div className="flex h-16 items-center justify-around px-1">
          {/* 1. Dashboard */}
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex min-h-12 min-w-[48px] flex-1 flex-col items-center justify-center rounded-xl py-1 transition-colors ${
                isActive ? 'font-bold text-[var(--color-accent)]' : 'hover:opacity-100 opacity-70'
              }`
            }
            style={{ color: 'var(--text-primary)' }}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span className="mt-1 text-[10px] tracking-tight">Dashboard</span>
          </NavLink>

          {/* 2. Transactions */}
          <NavLink
            to="/transactions"
            className={({ isActive }) =>
              `flex min-h-12 min-w-[48px] flex-1 flex-col items-center justify-center rounded-xl py-1 transition-colors ${
                isActive ? 'font-bold text-[var(--color-accent)]' : 'hover:opacity-100 opacity-70'
              }`
            }
            style={{ color: 'var(--text-primary)' }}
          >
            <ReceiptText className="h-4 w-4" />
            <span className="mt-1 text-[10px] tracking-tight">Expenses</span>
          </NavLink>

          {/* 3. Elevated Center Capture Button */}
          <button
            type="button"
            onClick={() => openPaymentHub('manual')}
            aria-label="Capture Expense"
            className="-mt-5 flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg border border-white/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            <Plus className="h-6 w-6 stroke-[3]" />
          </button>

          {/* 4. Friends Split */}
          <NavLink
            to="/split"
            className={({ isActive }) =>
              `flex min-h-12 min-w-[48px] flex-1 flex-col items-center justify-center rounded-xl py-1 transition-colors ${
                isActive ? 'font-bold text-[var(--color-accent)]' : 'hover:opacity-100 opacity-70'
              }`
            }
            style={{ color: 'var(--text-primary)' }}
          >
            <Users className="h-4 w-4" />
            <span className="mt-1 text-[10px] tracking-tight">Split</span>
          </NavLink>

          {/* 5. Settings */}
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex min-h-12 min-w-[48px] flex-1 flex-col items-center justify-center rounded-xl py-1 transition-colors ${
                isActive ? 'font-bold text-[var(--color-accent)]' : 'hover:opacity-100 opacity-70'
              }`
            }
            style={{ color: 'var(--text-primary)' }}
          >
            <Settings className="h-4 w-4" />
            <span className="mt-1 text-[10px] tracking-tight">Settings</span>
          </NavLink>
        </div>
      </nav>

      {/* Global Payment Hub Modal */}
      <PaymentHubModal />

      {/* Global Cloud Auth Modal */}
      <AuthModal />
    </div>
  );
}
