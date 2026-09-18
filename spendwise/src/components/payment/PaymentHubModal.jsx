import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Camera,
  MessageSquare,
  PenTool,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Zap
} from 'lucide-react';
import { useSpendWise } from '../../context/SpendWiseContext';
import { CATEGORIES } from '../../constants/categories';
import { analyzePaymentMessage, analyzePaymentImage } from '../../lib/paymentAnalyzer';

export function PaymentHubModal() {
  const { isPaymentHubOpen, paymentHubDefaultTab } = useSpendWise();
  if (!isPaymentHubOpen) return null;

  return (
    <PaymentHubModalDialog
      key={paymentHubDefaultTab || 'manual'}
      defaultTab={paymentHubDefaultTab}
    />
  );
}

function PaymentHubModalDialog({ defaultTab }) {
  const { closePaymentHub, addTransaction, appData, formatAppMoney } = useSpendWise();
  const [activeTab, setActiveTab] = useState(defaultTab || 'manual');

  // Form State
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [categoryId, setCategoryId] = useState('food');
  const [nature, setNature] = useState('want'); // 'need' | 'want'
  const [planned, setPlanned] = useState(true); // boolean: planned in advance?
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');

  // Parser & Scan State
  const [pastedText, setPastedText] = useState('');
  const [scanFile, setScanFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectedDraft, setDetectedDraft] = useState(null);
  const [formError, setFormError] = useState(null);
  const [successToast, setSuccessToast] = useState(false);

  const symbol = appData?.settings?.currencySymbol || '₹';

  // Handle SMS Message Parsing
  const handleParseMessage = () => {
    if (!pastedText.trim()) {
      setFormError('Please paste a payment SMS or debit notification text.');
      return;
    }

    setFormError(null);
    const parsed = analyzePaymentMessage(pastedText);

    if (parsed.success && parsed.amount > 0) {
      setAmount(String(parsed.amount));
      setMerchant(parsed.merchant || 'Detected Merchant');
      setCategoryId(parsed.categoryId || 'other');
      setDate(parsed.date || new Date().toISOString().split('T')[0]);
      setNote(parsed.note || '');
      setNature(parsed.nature || 'want');
      setDetectedDraft(parsed);
    } else {
      setFormError(
        'Could not automatically detect amount. You can edit the fields below to record it.'
      );
      setMerchant(parsed.merchant || '');
      setDetectedDraft({ ...parsed, amount: 0 });
    }
  };

  // Handle Image File Upload & Analysis
  const handleImageFile = async (file) => {
    if (!file) return;
    setScanFile(file);
    setIsAnalyzing(true);
    setFormError(null);

    try {
      const parsed = await analyzePaymentImage(file);
      setAmount(parsed.amount > 0 ? String(parsed.amount) : '');
      setMerchant(parsed.merchant || '');
      setCategoryId(parsed.categoryId || 'food');
      setDate(parsed.date || new Date().toISOString().split('T')[0]);
      setNote(parsed.note || `Screenshot: ${file.name}`);
      setNature(parsed.nature || 'want');
      setDetectedDraft(parsed);
    } catch (err) {
      setFormError(err.message || 'Failed to inspect image file.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Submit Transaction
  const handleSaveTransaction = (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Please provide a valid expense amount greater than 0.');
      return;
    }

    if (!merchant.trim()) {
      setFormError('Please provide a merchant name or description.');
      return;
    }

    try {
      addTransaction({
        amount: Math.round(numAmount * 100) / 100,
        label: merchant.trim(),
        categoryId,
        nature,
        planned,
        date,
        note: note.trim()
      });

      setSuccessToast(true);
      setTimeout(() => {
        closePaymentHub();
      }, 700);
    } catch (err) {
      setFormError(err.message || 'Failed to record transaction.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-subtle shadow-2xl"
        style={{ backgroundColor: 'var(--bg-surface)' }}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-subtle px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--color-accent)]" style={{ backgroundColor: 'var(--color-accent-subtle)' }}>
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-accent)] block font-bold">
                CAPTURE EXPENSE COMMAND
              </span>
              <h2 className="text-base font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                Record Financial Event
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={closePaymentHub}
            className="rounded-xl border border-subtle p-2 hover:opacity-100 opacity-70 transition-colors cursor-pointer"
            style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 3 LARGE COMMAND CENTER MODE OPTIONS */}
        <div className="p-6 pb-2">
          <div className="grid grid-cols-3 gap-2 rounded-2xl p-1.5 border border-subtle" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            {/* 1. Manual */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('manual');
                setFormError(null);
              }}
              className={`flex flex-col sm:flex-row items-center justify-center gap-2 rounded-xl py-3 px-2 text-xs font-mono font-bold transition-all cursor-pointer ${
                activeTab === 'manual'
                  ? 'text-white shadow-md'
                  : 'hover:opacity-100 opacity-70'
              }`}
              style={{
                backgroundColor: activeTab === 'manual' ? 'var(--color-accent)' : 'transparent',
                color: activeTab === 'manual' ? '#ffffff' : 'var(--text-secondary)'
              }}
            >
              <PenTool className="h-4 w-4" />
              <span>Manual Entry</span>
            </button>

            {/* 2. Scan Payment */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('scan');
                setFormError(null);
              }}
              className={`flex flex-col sm:flex-row items-center justify-center gap-2 rounded-xl py-3 px-2 text-xs font-mono font-bold transition-all cursor-pointer ${
                activeTab === 'scan'
                  ? 'text-white shadow-md'
                  : 'hover:opacity-100 opacity-70'
              }`}
              style={{
                backgroundColor: activeTab === 'scan' ? 'var(--color-accent)' : 'transparent',
                color: activeTab === 'scan' ? '#ffffff' : 'var(--text-secondary)'
              }}
            >
              <Camera className="h-4 w-4" />
              <span>Scan Receipt</span>
            </button>

            {/* 3. Paste Message */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('paste');
                setFormError(null);
              }}
              className={`flex flex-col sm:flex-row items-center justify-center gap-2 rounded-xl py-3 px-2 text-xs font-mono font-bold transition-all cursor-pointer ${
                activeTab === 'paste'
                  ? 'text-white shadow-md'
                  : 'hover:opacity-100 opacity-70'
              }`}
              style={{
                backgroundColor: activeTab === 'paste' ? 'var(--color-accent)' : 'transparent',
                color: activeTab === 'paste' ? '#ffffff' : 'var(--text-secondary)'
              }}
            >
              <MessageSquare className="h-4 w-4" />
              <span>Paste Alert</span>
            </button>
          </div>
        </div>

        {/* Modal Body & Step-by-Step Forms */}
        <div className="p-6 pt-3 max-h-[75vh] overflow-y-auto space-y-5">
          {/* TAB 2: SCAN PAYMENT SCREENSHOT */}
          {activeTab === 'scan' && (
            <div className="space-y-4">
              <div
                className="relative rounded-2xl border-2 border-dashed border-subtle p-6 text-center overflow-hidden group hover:border-[var(--color-accent)] transition-colors"
                style={{ backgroundColor: 'var(--bg-elevated)' }}
              >
                {/* Laser beam animation when analyzing */}
                {isAnalyzing && (
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[var(--color-accent)] to-transparent animate-scanner-beam pointer-events-none shadow-[0_0_15px_rgba(16,185,129,0.8)]" />
                )}

                <input
                  type="file"
                  id="payment-screenshot-upload"
                  accept="image/*"
                  onChange={(e) => handleImageFile(e.target.files[0])}
                  className="hidden"
                />
                <label
                  htmlFor="payment-screenshot-upload"
                  className="flex flex-col items-center justify-center cursor-pointer space-y-2"
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl border border-subtle text-[var(--color-accent)] group-hover:scale-105 transition-transform"
                    style={{ backgroundColor: 'var(--bg-surface)' }}
                  >
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
                      {scanFile ? scanFile.name : 'Drop a receipt screenshot or choose a file'}
                    </p>
                    <p className="text-[11px] font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      Supports UPI, GPay, PhonePe, Paytm, or bank debit receipts
                    </p>
                  </div>
                </label>
              </div>

              {isAnalyzing && (
                <div className="rounded-2xl border border-subtle p-4 text-center space-y-1 font-mono" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                  <span className="text-xs font-bold text-[var(--color-accent)] flex items-center justify-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[var(--color-accent)] animate-status-pulse" />
                    ANALYZING RECEIPT...
                  </span>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    Extracting: Merchant · Amount · Date · Nature
                  </p>
                </div>
              )}

              {detectedDraft && !isAnalyzing && (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-500 font-bold block">
                      ✓ Extracted Receipt Draft
                    </span>
                    <p className="mt-1 text-sm font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                      {detectedDraft.merchant || 'Detected Merchant'} · {formatAppMoney(detectedDraft.amount)}
                    </p>
                    <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                      {detectedDraft.date} · {detectedDraft.provider || 'OCR Engine'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono uppercase font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                    Review Below
                  </span>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PASTE PAYMENT MESSAGE */}
          {activeTab === 'paste' && (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Paste Bank or UPI Debit SMS
                </label>
                <textarea
                  rows={3}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="e.g. INR 450 debited from A/C XX1234 to UPI Swiggy on 16-09-2026..."
                  className="w-full rounded-2xl border border-subtle p-3 text-xs font-mono focus:border-[var(--color-accent)] focus:outline-none"
                  style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                />
              </div>

              <button
                type="button"
                onClick={handleParseMessage}
                className="inline-flex items-center gap-2 rounded-xl border border-subtle px-4 py-2 text-xs font-mono font-bold hover:border-[var(--color-accent)] transition-colors cursor-pointer"
                style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
              >
                <Sparkles className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                <span>Parse Alert Text</span>
              </button>

              {detectedDraft && (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-500 font-bold block">
                      ✓ Extracted SMS Draft
                    </span>
                    <p className="mt-1 text-sm font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                      {detectedDraft.merchant || 'Detected Merchant'} · {formatAppMoney(detectedDraft.amount)}
                    </p>
                    <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                      {detectedDraft.date} · {detectedDraft.provider || 'SMS Parser'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono uppercase font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                    Review Below
                  </span>
                </div>
              )}
            </div>
          )}

          {/* DRAFT REVIEW NOTICE WHEN SCAN/PASTE COMPLETED */}
          {detectedDraft && (
            <div className="rounded-2xl border border-subtle p-3.5 flex items-center gap-2.5 text-xs font-mono" style={{ backgroundColor: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}>
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Please review and verify the extracted details below before confirming.</span>
            </div>
          )}

          {/* MAIN TRANSACTION CONFIRMATION FORM */}
          <form onSubmit={handleSaveTransaction} className="space-y-4 pt-1">
            {/* Step 1: Amount */}
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Amount ({symbol})
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold font-mono text-[var(--color-accent)]">
                  {symbol}
                </span>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-2xl border border-subtle pl-10 pr-4 py-3 text-2xl font-bold font-mono focus:border-[var(--color-accent)] focus:outline-none"
                  style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>

            {/* Step 2: Merchant / Purpose */}
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                Merchant or Description
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Swiggy, Uber, Amazon, Groceries, Chai..."
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                className="w-full rounded-2xl border border-subtle px-3.5 py-2.5 text-xs font-mono focus:border-[var(--color-accent)] focus:outline-none"
                style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
              />
            </div>

            {/* Step 3: Category Selection Chips */}
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CATEGORIES.map((cat) => {
                  const isSelected = categoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryId(cat.id)}
                      className={`flex items-center gap-2 rounded-2xl border p-2.5 text-left text-xs font-mono transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[var(--color-accent)] text-[var(--color-accent)] font-bold shadow-xs'
                          : 'border-subtle opacity-70 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: isSelected ? 'var(--color-accent-subtle)' : 'var(--bg-elevated)',
                        color: isSelected ? 'var(--color-accent)' : 'var(--text-secondary)'
                      }}
                    >
                      <span className="text-base leading-none">{cat.emoji}</span>
                      <span className="truncate">{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 4 & 5: Was it Planned? & Need vs Want */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Was it Planned? */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Was this planned in advance?
                </label>
                <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-subtle p-1" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                  <button
                    type="button"
                    onClick={() => setPlanned(true)}
                    className={`rounded-xl py-1.5 text-xs font-mono font-bold transition-all cursor-pointer ${
                      planned
                        ? 'shadow-xs font-bold text-white'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: planned ? 'var(--color-accent)' : 'transparent',
                      color: planned ? '#ffffff' : 'var(--text-secondary)'
                    }}
                  >
                    PLANNED
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlanned(false)}
                    className={`rounded-xl py-1.5 text-xs font-mono font-bold transition-all cursor-pointer ${
                      !planned
                        ? 'bg-amber-500 text-white shadow-xs font-bold'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: !planned ? '#f59e0b' : 'transparent',
                      color: !planned ? '#ffffff' : 'var(--text-secondary)'
                    }}
                  >
                    UNPLANNED
                  </button>
                </div>
              </div>

              {/* Need vs Want */}
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Need or Want?
                </label>
                <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-subtle p-1" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                  <button
                    type="button"
                    onClick={() => setNature('need')}
                    className={`rounded-xl py-1.5 text-xs font-mono font-bold transition-all cursor-pointer ${
                      nature === 'need'
                        ? 'shadow-xs font-bold text-white'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: nature === 'need' ? '#10b981' : 'transparent',
                      color: nature === 'need' ? '#ffffff' : 'var(--text-secondary)'
                    }}
                  >
                    NEED
                  </button>
                  <button
                    type="button"
                    onClick={() => setNature('want')}
                    className={`rounded-xl py-1.5 text-xs font-mono font-bold transition-all cursor-pointer ${
                      nature === 'want'
                        ? 'shadow-xs font-bold text-white'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: nature === 'want' ? '#38bdf8' : 'transparent',
                      color: nature === 'want' ? '#ffffff' : 'var(--text-secondary)'
                    }}
                  >
                    WANT
                  </button>
                </div>
              </div>
            </div>

            {/* Date & Note */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-2xl border border-subtle px-3 py-2 text-xs font-mono focus:border-[var(--color-accent)] focus:outline-none"
                  style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Optional Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. team lunch, coffee, groceries"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full rounded-2xl border border-subtle px-3 py-2 text-xs font-mono focus:border-[var(--color-accent)] focus:outline-none"
                  style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>

            {/* Error Message Display */}
            {formError && (
              <div className="flex items-center gap-2 rounded-2xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs font-mono text-rose-500">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Success Toast */}
            {successToast && (
              <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs font-mono text-emerald-500">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Payment recorded successfully! Recalibrating daily allowance...</span>
              </div>
            )}

            {/* Action CTA */}
            <div className="pt-2 flex gap-3">
              <button
                type="submit"
                className="flex-1 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-6 text-xs font-mono font-bold uppercase tracking-wider text-white shadow-md transition-all hover:scale-[1.02] cursor-pointer"
                style={{ backgroundColor: 'var(--color-accent)' }}
              >
                <span>Confirm & Record Payment</span>
                <ArrowRight className="h-4 w-4 stroke-[2.5]" />
              </button>
              <button
                type="button"
                onClick={closePaymentHub}
                className="rounded-2xl border border-subtle px-5 text-xs font-mono hover:opacity-100 opacity-70 transition-colors cursor-pointer"
                style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
