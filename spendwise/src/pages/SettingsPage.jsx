import { useState } from 'react';
import {
  ShieldCheck,
  HardDrive,
  CheckCircle2,
  Download,
  Upload,
  RotateCcw,
  Sun,
  Moon,
  Monitor,
  Palette,
  Coins,
  User,
  Sliders,
  Cloud,
  Check,
  AlertTriangle,
  LogIn,
  LogOut,
  CloudUpload,
  Loader2
} from 'lucide-react';
import { useSpendWise } from '../context/SpendWiseContext';
import { THEME_MODES, ACCENT_COLORS } from '../constants/theme';
import { SUPPORTED_CURRENCIES } from '../lib/currency';
import { CATEGORIES } from '../constants/categories';

export function SettingsPage() {
  const {
    appData,
    updateSettings,
    resetData,
    currencyConfig,
    currentUser,
    isCloudSynced,
    openAuthModal,
    logoutUser,
    migrateLocalDataToCloud
  } = useSpendWise();

  const [saveStatus, setSaveStatus] = useState(null);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [activeTab, setActiveTab] = useState('appearance'); // 'appearance' | 'money' | 'profile' | 'preferences' | 'data'

  const settings = appData.settings || {};
  const currentTheme = settings.theme || THEME_MODES.SYSTEM;
  const currentAccent = settings.accentColor || 'emerald';

  const triggerToast = (msg) => {
    setSaveStatus(msg);
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleThemeChange = (mode) => {
    updateSettings({ theme: mode });
    triggerToast(`Theme set to ${mode.toUpperCase()}`);
  };

  const handleAccentChange = (accentId) => {
    updateSettings({ accentColor: accentId });
    triggerToast(`Accent updated to ${accentId.toUpperCase()}`);
  };

  const handleCurrencyChange = (currencyCode) => {
    const found = SUPPORTED_CURRENCIES.find((c) => c.code === currencyCode);
    if (found) {
      updateSettings({
        currencyCode: found.code,
        currencySymbol: found.symbol
      });
      triggerToast(`Display currency changed to ${found.code} (${found.symbol})`);
    }
  };

  // Export JSON backup
  const handleExportData = () => {
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(appData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `spendwise-backup-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      triggerToast('Backup JSON exported successfully.');
    } catch {
      triggerToast('Failed to export backup.');
    }
  };

  // Import JSON backup
  const handleImportData = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Invalid JSON format.');
        }
        // Update state with imported data
        window.localStorage.setItem('spendwise.v2', JSON.stringify(parsed));
        window.location.reload();
      } catch (err) {
        alert(`Failed to import backup: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:py-10 space-y-8 font-sans">
      {/* Header */}
      <div className="border-b border-subtle pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest block font-bold" style={{ color: 'var(--color-accent)' }}>
            System Configuration
          </span>
          <h1 className="mt-1 text-2xl md:text-3xl font-extrabold font-mono tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Settings & Control Center
          </h1>
          <p className="mt-1 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
            Calibrate appearance, currency formatting, social profiles, and cloud sovereignty.
          </p>
        </div>

        {saveStatus && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-mono text-emerald-500 flex items-center gap-2 self-start sm:self-auto">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{saveStatus}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-subtle gap-2 overflow-x-auto pb-px">
        {[
          { id: 'appearance', label: 'Appearance & Theme', icon: Palette },
          { id: 'money', label: 'Money & Currency', icon: Coins },
          { id: 'profile', label: 'Profile & Social', icon: User },
          { id: 'preferences', label: 'Preferences', icon: Sliders },
          { id: 'data', label: 'Data & Storage', icon: HardDrive }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                  : 'border-transparent hover:text-[var(--text-primary)]'
              }`}
              style={{ color: isActive ? 'var(--color-accent)' : 'var(--text-secondary)' }}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ==================================================== */}
      {/* TAB 1: APPEARANCE & THEME                            */}
      {/* ==================================================== */}
      {activeTab === 'appearance' && (
        <div className="space-y-6">
          {/* Theme Mode Selection */}
          <div className="rounded-3xl border border-subtle p-6 shadow-sm space-y-4" style={{ backgroundColor: 'var(--bg-surface)' }}>
            <div>
              <h3 className="text-sm font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                Theme Mode
              </h3>
              <p className="text-[11px] font-mono mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Choose between warm daylight, low-glare graphite night, or automatic system tracking.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
              {/* Day Mode */}
              <button
                type="button"
                onClick={() => handleThemeChange(THEME_MODES.DAY)}
                className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                  currentTheme === THEME_MODES.DAY
                    ? 'border-[var(--color-accent)] ring-1 ring-[var(--color-accent-ring)] bg-[var(--color-accent-subtle)]'
                    : 'border-subtle hover:border-[var(--border-medium)]'
                }`}
                style={{ backgroundColor: currentTheme === THEME_MODES.DAY ? undefined : 'var(--bg-elevated)' }}
              >
                <div className="flex items-center justify-between">
                  <Sun className="h-5 w-5 text-amber-500" />
                  {currentTheme === THEME_MODES.DAY && <Check className="h-4 w-4 text-[var(--color-accent)]" />}
                </div>
                <h4 className="mt-3 font-bold" style={{ color: 'var(--text-primary)' }}>Day Mode</h4>
                <p className="mt-1 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                  Warm off-white background (#F6F7F4) with soft neutral surfaces and high legibility.
                </p>
              </button>

              {/* Night Mode */}
              <button
                type="button"
                onClick={() => handleThemeChange(THEME_MODES.NIGHT)}
                className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                  currentTheme === THEME_MODES.NIGHT
                    ? 'border-[var(--color-accent)] ring-1 ring-[var(--color-accent-ring)] bg-[var(--color-accent-subtle)]'
                    : 'border-subtle hover:border-[var(--border-medium)]'
                }`}
                style={{ backgroundColor: currentTheme === THEME_MODES.NIGHT ? undefined : 'var(--bg-elevated)' }}
              >
                <div className="flex items-center justify-between">
                  <Moon className="h-5 w-5 text-indigo-400" />
                  {currentTheme === THEME_MODES.NIGHT && <Check className="h-4 w-4 text-[var(--color-accent)]" />}
                </div>
                <h4 className="mt-3 font-bold" style={{ color: 'var(--text-primary)' }}>Night Mode</h4>
                <p className="mt-1 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                  Graphite & slate environment (#17191C / #202328). Comfortable, non-OLED black.
                </p>
              </button>

              {/* System Mode */}
              <button
                type="button"
                onClick={() => handleThemeChange(THEME_MODES.SYSTEM)}
                className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                  currentTheme === THEME_MODES.SYSTEM
                    ? 'border-[var(--color-accent)] ring-1 ring-[var(--color-accent-ring)] bg-[var(--color-accent-subtle)]'
                    : 'border-subtle hover:border-[var(--border-medium)]'
                }`}
                style={{ backgroundColor: currentTheme === THEME_MODES.SYSTEM ? undefined : 'var(--bg-elevated)' }}
              >
                <div className="flex items-center justify-between">
                  <Monitor className="h-5 w-5 text-zinc-400" />
                  {currentTheme === THEME_MODES.SYSTEM && <Check className="h-4 w-4 text-[var(--color-accent)]" />}
                </div>
                <h4 className="mt-3 font-bold" style={{ color: 'var(--text-primary)' }}>System Auto</h4>
                <p className="mt-1 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                  Automatically harmonizes with your OS / device color preference.
                </p>
              </button>
            </div>
          </div>

          {/* Curated Accent Color Selection */}
          <div className="rounded-3xl border border-subtle p-6 shadow-sm space-y-4" style={{ backgroundColor: 'var(--bg-surface)' }}>
            <div>
              <h3 className="text-sm font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                Curated Accent Color
              </h3>
              <p className="text-[11px] font-mono mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Select an accent hue. Semantic indicators (success, warning, danger) remain semantically strict.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono text-xs">
              {Object.values(ACCENT_COLORS).map((accent) => {
                const isSelected = currentAccent === accent.id;
                return (
                  <button
                    key={accent.id}
                    type="button"
                    onClick={() => handleAccentChange(accent.id)}
                    className={`p-3 rounded-2xl border flex flex-col items-center gap-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[var(--color-accent)] ring-2 ring-[var(--color-accent-ring)]'
                        : 'border-subtle hover:border-[var(--border-medium)]'
                    }`}
                    style={{ backgroundColor: 'var(--bg-elevated)' }}
                  >
                    <div
                      className="h-8 w-8 rounded-full flex items-center justify-center text-white shadow-xs"
                      style={{ backgroundColor: accent.primary }}
                    >
                      {isSelected && <Check className="h-4 w-4 stroke-[3]" />}
                    </div>
                    <span className="font-bold text-[11px]" style={{ color: 'var(--text-primary)' }}>
                      {accent.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 2: MONEY & CURRENCY                              */}
      {/* ==================================================== */}
      {activeTab === 'money' && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-subtle p-6 shadow-sm space-y-4" style={{ backgroundColor: 'var(--bg-surface)' }}>
            <div>
              <h3 className="text-sm font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                Display Currency
              </h3>
              <p className="text-[11px] font-mono mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Choose the standard currency used for all budgeting, analytics, and splits.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
              {SUPPORTED_CURRENCIES.map((curr) => {
                const isSelected = currencyConfig.code === curr.code;
                return (
                  <button
                    key={curr.code}
                    type="button"
                    onClick={() => handleCurrencyChange(curr.code)}
                    className={`p-3.5 rounded-2xl border text-left flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[var(--color-accent)] ring-1 ring-[var(--color-accent-ring)] bg-[var(--color-accent-subtle)]'
                        : 'border-subtle hover:border-[var(--border-medium)]'
                    }`}
                    style={{ backgroundColor: isSelected ? undefined : 'var(--bg-elevated)' }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold font-mono text-[var(--color-accent)]">
                        {curr.symbol}
                      </span>
                      <div>
                        <span className="font-bold block" style={{ color: 'var(--text-primary)' }}>{curr.code}</span>
                        <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{curr.name}</span>
                      </div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-[var(--color-accent)]" />}
                  </button>
                );
              })}
            </div>

            {/* Crucial Spec Notice */}
            <div className="rounded-2xl border border-subtle p-4 font-mono text-xs space-y-1" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
              <div className="flex items-center gap-1.5 font-bold" style={{ color: 'var(--text-primary)' }}>
                <ShieldCheck className="h-4 w-4 text-[var(--color-accent)]" />
                <span>Financial Data Integrity Policy</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Changing your display currency adjusts formatting notation across the entire interface. It does <strong>not</strong> silently convert stored historical transaction amounts or fabricate exchange rates.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 3: PROFILE & SOCIAL                              */}
      {/* ==================================================== */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Cloud Account Status Card */}
          <div className="rounded-3xl border border-subtle p-6 shadow-sm space-y-4 font-mono text-xs" style={{ backgroundColor: 'var(--bg-surface)' }}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Cloud className="h-4 w-4 text-[var(--color-accent)]" />
                  <span>SpendWise Cloud Account</span>
                </h3>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {currentUser
                    ? 'Connected to SpendWise backend. Transactions and settings are synchronized.'
                    : 'Currently in local storage mode. Connect or create an account for seamless multi-device sync.'}
                </p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 ${
                currentUser ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${currentUser ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                {currentUser ? 'AUTHENTICATED' : 'LOCAL MODE'}
              </span>
            </div>

            {currentUser ? (
              <div className="rounded-2xl border border-subtle p-4 space-y-3" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {currentUser.name || 'Account User'}
                    </div>
                    <div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                      {currentUser.email}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await logoutUser();
                      triggerToast('Signed out of SpendWise Cloud.');
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 px-3.5 py-2 text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer text-[11px]"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-subtle p-4 flex flex-col sm:flex-row items-center justify-between gap-3" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                  Ready to link your financial ledger to the backend?
                </span>
                <button
                  type="button"
                  onClick={openAuthModal}
                  className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-xs cursor-pointer hover:scale-[1.02] transition-transform"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Sign In / Connect Cloud</span>
                </button>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-subtle p-6 shadow-sm space-y-4 font-mono text-xs" style={{ backgroundColor: 'var(--bg-surface)' }}>
            <div>
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                Peer Profile Display
              </h3>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Used in Friends Split and peer expense activities.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Display Name
                </label>
                <input
                  type="text"
                  value={settings.profile?.name || ''}
                  onChange={(e) =>
                    updateSettings({
                      profile: { ...(settings.profile || {}), name: e.target.value }
                    })
                  }
                  className="w-full sm:w-80 rounded-xl border border-subtle px-3 py-2 text-xs"
                  style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={settings.profile?.email || ''}
                  onChange={(e) =>
                    updateSettings({
                      profile: { ...(settings.profile || {}), email: e.target.value }
                    })
                  }
                  className="w-full sm:w-80 rounded-xl border border-subtle px-3 py-2 text-xs"
                  style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 4: PREFERENCES & DEFAULTS                        */}
      {/* ==================================================== */}
      {activeTab === 'preferences' && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-subtle p-6 shadow-sm space-y-4 font-mono text-xs" style={{ backgroundColor: 'var(--bg-surface)' }}>
            <div>
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                Spending & Logging Defaults
              </h3>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Accelerates fast expense capture by pre-selecting preferred defaults.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Default Category
                </label>
                <select
                  value={settings.spendingDefaults?.defaultCategoryId || 'food'}
                  onChange={(e) =>
                    updateSettings({
                      spendingDefaults: { ...(settings.spendingDefaults || {}), defaultCategoryId: e.target.value }
                    })
                  }
                  className="w-full rounded-xl border border-subtle px-3 py-2 text-xs"
                  style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.emoji} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Default Nature
                </label>
                <select
                  value={settings.spendingDefaults?.defaultNature || 'need'}
                  onChange={(e) =>
                    updateSettings({
                      spendingDefaults: { ...(settings.spendingDefaults || {}), defaultNature: e.target.value }
                    })
                  }
                  className="w-full rounded-xl border border-subtle px-3 py-2 text-xs"
                  style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                >
                  <option value="need">Need (Essential)</option>
                  <option value="want">Want (Discretionary)</option>
                </select>
              </div>
            </div>

            <div className="border-t border-subtle pt-4 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Notification Preference Toggles
              </h4>

              {[
                { key: 'dailySpendingReminder', label: 'Daily Spending Check-in Reminder' },
                { key: 'budgetWarning', label: 'Budget Burning Velocity Warning' },
                { key: 'splitSettlementReminder', label: 'Friends Settlement Reminders' }
              ].map((notif) => (
                <label key={notif.key} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.notifications?.[notif.key])}
                    onChange={(e) =>
                      updateSettings({
                        notifications: { ...(settings.notifications || {}), [notif.key]: e.target.checked }
                      })
                    }
                    className="rounded accent-[var(--color-accent)]"
                  />
                  <span style={{ color: 'var(--text-primary)' }}>{notif.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* TAB 5: DATA SOVEREIGNTY & STORAGE                    */}
      {/* ==================================================== */}
      {activeTab === 'data' && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-subtle p-6 shadow-sm space-y-4 font-mono text-xs" style={{ backgroundColor: 'var(--bg-surface)' }}>
            <div>
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                Data Sovereignty & Local Storage
              </h3>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                All your records reside locally on your device with schema v2.0 validation.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleExportData}
                className="flex items-center justify-center gap-2 rounded-2xl border border-subtle p-3.5 cursor-pointer hover:border-[var(--color-accent)] transition-colors"
                style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
              >
                <Download className="h-4 w-4 text-[var(--color-accent)]" />
                <span className="font-bold">Export Backup (JSON)</span>
              </button>

              <label
                className="flex items-center justify-center gap-2 rounded-2xl border border-subtle p-3.5 cursor-pointer hover:border-[var(--color-accent)] transition-colors"
                style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
              >
                <Upload className="h-4 w-4 text-[var(--color-accent)]" />
                <span className="font-bold">Import Backup (JSON)</span>
                <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
              </label>
            </div>

            {/* Cloud Migration */}
            <div className="rounded-2xl border border-subtle p-4 mt-4 space-y-3" style={{ backgroundColor: 'var(--bg-elevated)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cloud className="h-4 w-4 text-[var(--color-accent)]" />
                  <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
                    SpendWise Cloud Sync & Migration
                  </span>
                </div>
                {currentUser && (
                  <span className="text-[10px] text-emerald-400 font-bold">
                    Connected: {currentUser.email}
                  </span>
                )}
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Migrate all your local transactions, monthly plans, friends, groups, and settlements directly into your PostgreSQL cloud database.
              </p>
              {currentUser ? (
                <button
                  type="button"
                  disabled={isMigrating}
                  onClick={async () => {
                    try {
                      setIsMigrating(true);
                      const res = await migrateLocalDataToCloud();
                      triggerToast(res?.message || 'Data migrated to SpendWise Cloud successfully!');
                    } catch (err) {
                      triggerToast(`Migration failed: ${err.message}`);
                    } finally {
                      setIsMigrating(false);
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2 font-bold text-xs text-white shadow-xs cursor-pointer disabled:opacity-50 hover:scale-[1.02] transition-transform"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                >
                  {isMigrating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Migrating Data...</span>
                    </>
                  ) : (
                    <>
                      <CloudUpload className="h-3.5 w-3.5" />
                      <span>Push Local Data to Cloud</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openAuthModal}
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2 font-bold text-xs text-white shadow-xs cursor-pointer hover:scale-[1.02] transition-transform"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Sign In to Enable Cloud Sync</span>
                </button>
              )}
            </div>

            {/* Reset Data */}
            <div className="border-t border-subtle pt-4">
              <span className="text-xs font-bold text-rose-500 block uppercase tracking-wider mb-2">
                Danger Zone
              </span>

              {showConfirmReset ? (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-rose-500 font-bold">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Confirm Complete Data Reset?</span>
                  </div>
                  <p className="text-[11px] text-rose-400">
                    This will permanently clear all month plans, variable expenses, friends, and split ledgers from browser storage.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowConfirmReset(false)}
                      className="rounded-xl border border-subtle px-3 py-1.5 cursor-pointer text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        resetData();
                        setShowConfirmReset(false);
                        triggerToast('Data reset to defaults.');
                      }}
                      className="rounded-xl bg-rose-500 text-white font-bold px-3 py-1.5 cursor-pointer"
                    >
                      Yes, Wipe All Data
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowConfirmReset(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-500/40 px-4 py-2 text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset All Application Data</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
