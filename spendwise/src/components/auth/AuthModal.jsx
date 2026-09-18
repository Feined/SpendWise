import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Lock,
  Mail,
  User,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Loader2,
  CloudUpload,
} from 'lucide-react';
import { useSpendWise } from '../../context/SpendWiseContext';

export function AuthModal() {
  const {
    isAuthModalOpen,
    closeAuthModal,
    loginUser,
    registerUser,
    currentUser,
    logoutUser,
  } = useSpendWise();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [migrateLocal, setMigrateLocal] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        await loginUser({ email: email.trim(), password });
        setSuccessMessage('Successfully signed in to SpendWise Cloud!');
        setTimeout(() => {
          closeAuthModal();
        }, 800);
      } else {
        await registerUser({
          email: email.trim(),
          password,
          name: name.trim(),
          migrateLocal,
        });
        setSuccessMessage('Account created and cloud sync active!');
        setTimeout(() => {
          closeAuthModal();
        }, 800);
      }
    } catch (err) {
      console.error('[SpendWise Auth Error]', err);
      let msg = err.message || 'Authentication failed. Please try again.';
      if (err.status === 401) {
        msg = 'Invalid email or password. Please try again.';
      } else if (err.status === 409) {
        msg = 'An account with this email address already exists.';
      } else if (err.details && Array.isArray(err.details)) {
        msg = err.details.map((d) => d.message).join('; ');
      }
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeAuthModal}
          className="fixed inset-0 bg-black/70 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl border border-subtle p-6 sm:p-8 shadow-2xl font-sans"
          style={{
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-primary)',
          }}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={closeAuthModal}
            className="absolute top-5 right-5 rounded-full p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Logged in state view */}
          {currentUser ? (
            <div className="space-y-6 text-center py-4 font-mono">
              <div
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg"
                style={{ backgroundColor: 'var(--color-accent)' }}
              >
                <ShieldCheck className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Cloud Connected</h3>
                <p className="text-xs text-zinc-400 mt-1">{currentUser.email}</p>
                <p className="text-[11px] text-emerald-400 mt-0.5">
                  ● Active Session · PostgreSQL Sync Online
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    await logoutUser();
                    closeAuthModal();
                  }}
                  className="w-full rounded-2xl border border-rose-500/30 bg-rose-500/10 py-3 text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer"
                >
                  Sign Out of Account
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header */}
              <div>
                <span
                  className="text-[10px] font-mono uppercase tracking-widest font-bold block"
                  style={{ color: 'var(--color-accent)' }}
                >
                  SpendWise Cloud
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight font-mono mt-1">
                  {mode === 'login' ? 'Sign in to your account' : 'Create a cloud account'}
                </h2>
                <p className="text-xs text-zinc-400 mt-1 font-mono">
                  Sync plans, expenses, and split ledgers safely across devices.
                </p>
              </div>

              {/* Tab Switcher */}
              <div
                className="flex rounded-2xl border border-subtle p-1 font-mono text-xs"
                style={{ backgroundColor: 'var(--bg-elevated)' }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 rounded-xl py-2 font-bold transition-all cursor-pointer ${
                    mode === 'login'
                      ? 'bg-zinc-800 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 rounded-xl py-2 font-bold transition-all cursor-pointer ${
                    mode === 'register'
                      ? 'bg-zinc-800 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Register
                </button>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 flex items-start gap-2.5 text-xs text-rose-400 font-mono">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Success Message */}
              {successMessage && (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 flex items-center gap-2.5 text-xs text-emerald-400 font-mono">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
                {mode === 'register' && (
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-zinc-400 mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Alex Kumar"
                        className="w-full rounded-xl border border-subtle pl-10 pr-3.5 py-2.5 text-xs focus:outline-hidden focus:border-[var(--color-accent)] transition-colors"
                        style={{
                          backgroundColor: 'var(--bg-elevated)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-zinc-400 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex@example.com"
                      className="w-full rounded-xl border border-subtle pl-10 pr-3.5 py-2.5 text-xs focus:outline-hidden focus:border-[var(--color-accent)] transition-colors"
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-zinc-400 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-subtle pl-10 pr-3.5 py-2.5 text-xs focus:outline-hidden focus:border-[var(--color-accent)] transition-colors"
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                </div>

                {mode === 'register' && (
                  <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={migrateLocal}
                      onChange={(e) => setMigrateLocal(e.target.checked)}
                      className="mt-0.5 rounded accent-[var(--color-accent)]"
                    />
                    <span className="text-[11px] text-zinc-300 leading-tight">
                      Migrate my existing local plans, expenses, and split debts to this new account.
                    </span>
                  </label>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg cursor-pointer transition-all hover:scale-[1.02] disabled:opacity-50 disabled:pointer-events-none mt-2"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="border-t border-subtle pt-4 text-center">
                <span className="text-[11px] text-zinc-400 font-mono">
                  {mode === 'login'
                    ? "Don't have a cloud account yet? "
                    : 'Already have an account? '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode(mode === 'login' ? 'register' : 'login');
                      setErrorMessage(null);
                    }}
                    className="font-bold underline cursor-pointer hover:text-white"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    {mode === 'login' ? 'Create one now' : 'Sign in'}
                  </button>
                </span>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
