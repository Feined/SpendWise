import { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Camera,
  MessageSquare,
  ArrowUpDown,
  Edit2,
  Trash2,
  X,
  Clock,
  ChevronLeft,
  ChevronRight,
  FilterX
} from 'lucide-react';
import { useSpendWise } from '../context/SpendWiseContext';
import { CATEGORIES, getCategoryById } from '../constants/categories';
import { formatMonthDisplay, shiftMonth } from '../lib/budget';

export function TransactionsPage() {
  const {
    appData,
    selectedMonth,
    openPaymentHub,
    updateTransaction,
    deleteTransaction,
    deleteSplitExpense,
    formatAppMoney,
    currencyConfig,
    unifiedTimeline = []
  } = useSpendWise();

  // Filter & Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [streamFilter, setStreamFilter] = useState('all'); // 'all' | 'personal' | 'split' | 'settlement'
  const [directionFilter, setDirectionFilter] = useState('all'); // 'all' | 'out' | 'in'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'settled' | 'pending'
  const [monthFilter, setMonthFilter] = useState('all'); // 'all' | 'YYYY-MM'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedNature, setSelectedNature] = useState('all'); // 'all' | 'need' | 'want'
  const [selectedPlanned, setSelectedPlanned] = useState('all'); // 'all' | 'planned' | 'unplanned'
  const [sortOrder, setSortOrder] = useState('date-desc'); // 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'

  // Edit Modal state
  const [editingTx, setEditingTx] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [editLabel, setEditLabel] = useState('');
  const [editCategory, setEditCategory] = useState('food');
  const [editNature, setEditNature] = useState('want');
  const [editPlanned, setEditPlanned] = useState(true);
  const [editDate, setEditDate] = useState('');
  const [editNote, setEditNote] = useState('');

  // Delete Confirmation state
  const [deletingId, setDeletingId] = useState(null);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    streamFilter !== 'all' ||
    directionFilter !== 'all' ||
    statusFilter !== 'all' ||
    monthFilter !== 'all' ||
    selectedCategory !== 'all' ||
    selectedNature !== 'all' ||
    selectedPlanned !== 'all';

  const handleResetFilters = () => {
    setSearchQuery('');
    setStreamFilter('all');
    setDirectionFilter('all');
    setStatusFilter('all');
    setMonthFilter('all');
    setSelectedCategory('all');
    setSelectedNature('all');
    setSelectedPlanned('all');
    setSortOrder('date-desc');
  };

  // Filtered and sorted unified timeline
  const filteredTimeline = useMemo(() => {
    const list = Array.isArray(unifiedTimeline) ? unifiedTimeline : [];

    return list
      .filter((item) => {
        // Month filter
        if (monthFilter !== 'all') {
          const itemMonth = item.date ? item.date.slice(0, 7) : item.monthKey;
          if (itemMonth !== monthFilter) return false;
        }

        // Stream type filter
        if (streamFilter !== 'all' && item.streamType !== streamFilter) {
          return false;
        }

        // Direction filter
        if (directionFilter !== 'all' && item.direction !== directionFilter) {
          return false;
        }

        // Status filter
        if (statusFilter !== 'all' && item.status !== statusFilter) {
          return false;
        }

        // Search query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = item.title?.toLowerCase().includes(q);
          const matchNote = item.notes?.toLowerCase().includes(q);
          const matchCat = item.categoryName?.toLowerCase().includes(q);
          if (!matchTitle && !matchNote && !matchCat) return false;
        }

        // Category filter
        if (selectedCategory !== 'all' && item.category !== selectedCategory) {
          return false;
        }

        // Need vs Want filter (for personal)
        if (selectedNature !== 'all' && item.nature && item.nature !== selectedNature) {
          return false;
        }

        // Planned vs Unplanned filter (for personal)
        if (selectedPlanned === 'planned' && item.planned !== true) {
          return false;
        }
        if (selectedPlanned === 'unplanned' && item.planned !== false) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOrder === 'date-desc') return (b.date || '').localeCompare(a.date || '');
        if (sortOrder === 'date-asc') return (a.date || '').localeCompare(b.date || '');
        if (sortOrder === 'amount-desc') return (b.amount || 0) - (a.amount || 0);
        if (sortOrder === 'amount-asc') return (a.amount || 0) - (b.amount || 0);
        return 0;
      });
  }, [unifiedTimeline, monthFilter, streamFilter, directionFilter, statusFilter, searchQuery, selectedCategory, selectedNature, selectedPlanned, sortOrder]);

  // Edit Handlers
  const handleOpenEdit = (tx) => {
    setEditingTx(tx);
    setEditAmount(String(tx.amount));
    setEditLabel(tx.label || '');
    setEditCategory(tx.categoryId || 'food');
    setEditNature(tx.nature || 'want');
    setEditPlanned(tx.planned !== false);
    setEditDate(tx.date || '');
    setEditNote(tx.note || '');
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingTx) return;

    const num = parseFloat(editAmount);
    if (isNaN(num) || num <= 0 || !editLabel.trim()) return;

    updateTransaction(editingTx.id, {
      amount: Math.round(num * 100) / 100,
      label: editLabel.trim(),
      categoryId: editCategory,
      nature: editNature,
      planned: editPlanned,
      date: editDate,
      note: editNote.trim()
    });

    setEditingTx(null);
  };

  // Delete Handler
  const handleConfirmDelete = (id) => {
    deleteTransaction(id);
    setDeletingId(null);
  };

  const totalFilteredAmount = filteredTimeline.reduce((s, t) => s + (t.amount || 0), 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:py-10 space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-subtle pb-6">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest block font-bold text-[var(--color-accent)]">
            Financial Stream
          </span>
          <h1 className="mt-1 text-2xl md:text-3xl font-extrabold font-mono tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Transaction Activity Feed
          </h1>
          <p className="mt-0.5 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
            {filteredTimeline.length} recorded events · Total volume: {formatAppMoney(totalFilteredAmount)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openPaymentHub('manual')}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-2xl px-4 text-xs font-mono font-bold uppercase tracking-wider text-white shadow-md cursor-pointer transition-transform hover:scale-105"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Add Expense</span>
          </button>
          <button
            type="button"
            onClick={() => openPaymentHub('scan')}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-2xl border border-subtle px-3 text-xs font-mono cursor-pointer hover:border-[var(--color-accent)] transition-colors"
            style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
          >
            <Camera className="h-4 w-4 text-[var(--color-accent)]" />
            <span className="hidden sm:inline">Scan</span>
          </button>
          <button
            type="button"
            onClick={() => openPaymentHub('paste')}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-2xl border border-subtle px-3 text-xs font-mono cursor-pointer hover:border-[var(--color-accent)] transition-colors"
            style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
          >
            <MessageSquare className="h-4 w-4 text-[var(--color-accent)]" />
            <span className="hidden sm:inline">Paste SMS</span>
          </button>
        </div>
      </div>

      {/* Multi-Dimensional Filter Bar (Req 17, 20) */}
      <div className="rounded-3xl border border-subtle p-4 space-y-3.5 shadow-sm" style={{ backgroundColor: 'var(--bg-surface)' }}>
        {/* Month & Date Filter Stepper Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-subtle">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] mr-1">
              Time Horizon:
            </span>
            <button
              type="button"
              onClick={() => setMonthFilter('all')}
              className={`rounded-xl px-3 py-1 text-xs font-mono font-bold cursor-pointer transition-all border ${
                monthFilter === 'all'
                  ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent-subtle)] shadow-xs'
                  : 'border-subtle opacity-70 hover:opacity-100 text-[var(--text-secondary)]'
              }`}
            >
              All Time
            </button>
            <button
              type="button"
              onClick={() => setMonthFilter(selectedMonth)}
              className={`rounded-xl px-3 py-1 text-xs font-mono font-bold cursor-pointer transition-all border ${
                monthFilter === selectedMonth
                  ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent-subtle)] shadow-xs'
                  : 'border-subtle opacity-70 hover:opacity-100 text-[var(--text-secondary)]'
              }`}
            >
              This Month ({formatMonthDisplay(selectedMonth)})
            </button>

            {monthFilter !== 'all' && (
              <div className="flex items-center rounded-xl border border-subtle p-0.5" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                <button
                  type="button"
                  onClick={() => setMonthFilter(shiftMonth(monthFilter, -1))}
                  className="flex h-6 w-6 items-center justify-center rounded-lg hover:bg-[var(--border-subtle)] cursor-pointer transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="text-[11px] font-mono font-bold px-2" style={{ color: 'var(--text-primary)' }}>
                  {formatMonthDisplay(monthFilter)}
                </span>
                <button
                  type="button"
                  onClick={() => setMonthFilter(shiftMonth(monthFilter, 1))}
                  className="flex h-6 w-6 items-center justify-center rounded-lg hover:bg-[var(--border-subtle)] cursor-pointer transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-rose-500 hover:underline cursor-pointer"
            >
              <FilterX className="h-3.5 w-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Stream Type Pills (Req 17) */}
        <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-subtle">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] mr-1">
            Stream:
          </span>
          {[
            { id: 'all', label: 'All Streams' },
            { id: 'personal', label: 'Personal' },
            { id: 'split', label: 'Shared Splits' },
            { id: 'settlement', label: 'Settlements' }
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setStreamFilter(st.id)}
              className={`rounded-xl px-3 py-1 text-xs font-mono font-bold cursor-pointer transition-all border ${
                streamFilter === st.id
                  ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent-subtle)] shadow-xs'
                  : 'border-subtle opacity-70 hover:opacity-100 text-[var(--text-secondary)]'
              }`}
            >
              {st.label}
            </button>
          ))}

          <span className="opacity-30 mx-1">|</span>

          {/* Money Direction Pills (Req 20) */}
          <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] mr-1">
            Flow:
          </span>
          {[
            { id: 'all', label: 'All Flows' },
            { id: 'out', label: 'Money Out' },
            { id: 'in', label: 'Money In' }
          ].map((df) => (
            <button
              key={df.id}
              type="button"
              onClick={() => setDirectionFilter(df.id)}
              className={`rounded-xl px-2.5 py-1 text-xs font-mono font-bold cursor-pointer transition-all border ${
                directionFilter === df.id
                  ? df.id === 'in'
                    ? 'border-emerald-500/40 text-emerald-500 bg-emerald-500/10'
                    : 'border-rose-500/40 text-rose-500 bg-rose-500/10'
                  : 'border-subtle opacity-70 hover:opacity-100 text-[var(--text-secondary)]'
              }`}
            >
              {df.label}
            </button>
          ))}

          <span className="opacity-30 mx-1">|</span>

          {/* Status Pills */}
          {[
            { id: 'all', label: 'All Status' },
            { id: 'pending', label: 'Pending' },
            { id: 'settled', label: 'Settled' }
          ].map((sf) => (
            <button
              key={sf.id}
              type="button"
              onClick={() => setStatusFilter(sf.id)}
              className={`rounded-xl px-2.5 py-1 text-xs font-mono font-bold cursor-pointer transition-all border ${
                statusFilter === sf.id
                  ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent-subtle)]'
                  : 'border-subtle opacity-70 hover:opacity-100 text-[var(--text-secondary)]'
              }`}
            >
              {sf.label}
            </button>
          ))}
        </div>

        {/* Search & Categories row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by title, note, or peer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-subtle pl-10 pr-4 py-2 text-xs font-mono focus:outline-none focus:border-[var(--color-accent)]"
              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-2xl border border-subtle px-3 py-2 text-xs font-mono focus:outline-none focus:border-[var(--color-accent)]"
            style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.emoji} {cat.name}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1.5 rounded-2xl border border-subtle px-3 py-2 text-xs font-mono" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
            <ArrowUpDown className="h-3.5 w-3.5 text-zinc-400" />
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer"
              style={{ color: 'var(--text-primary)' }}
            >
              <option value="date-desc">Newest Date</option>
              <option value="date-asc">Oldest Date</option>
              <option value="amount-desc">Highest Amount</option>
              <option value="amount-asc">Lowest Amount</option>
            </select>
          </div>
        </div>

        {/* Need/Want & Planned filter tags */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-[11px] font-mono">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedNature('all')}
              className={`rounded-xl px-2.5 py-0.5 border ${
                selectedNature === 'all'
                  ? 'border-[var(--color-accent)] text-[var(--color-accent)] font-bold'
                  : 'border-subtle opacity-60'
              }`}
            >
              All Types
            </button>
            <button
              type="button"
              onClick={() => setSelectedNature('need')}
              className={`rounded-xl px-2.5 py-0.5 border ${
                selectedNature === 'need'
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 font-bold'
                  : 'border-subtle opacity-60'
              }`}
            >
              Needs
            </button>
            <button
              type="button"
              onClick={() => setSelectedNature('want')}
              className={`rounded-xl px-2.5 py-0.5 border ${
                selectedNature === 'want'
                  ? 'bg-sky-500/10 text-sky-500 border-sky-500/30 font-bold'
                  : 'border-subtle opacity-60'
              }`}
            >
              Wants
            </button>
          </div>

          <span style={{ color: 'var(--text-muted)' }}>
            Showing {filteredTimeline.length} of {unifiedTimeline.length} events
          </span>
        </div>
      </div>

      {/* Unified Transaction List Feed (Req 18, 19, 31) */}
      <div className="space-y-3">
        {filteredTimeline.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-subtle p-12 text-center space-y-4" style={{ backgroundColor: 'var(--bg-surface)' }}>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl text-[var(--color-accent)]" style={{ backgroundColor: 'var(--color-accent-subtle)' }}>
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
                {hasActiveFilters ? 'No transactions match your active filters.' : 'No transactions recorded yet.'}
              </p>
              <p className="mt-1 text-xs font-mono max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
                {hasActiveFilters
                  ? 'Try clearing the search query or adjusting your stream and date parameters.'
                  : 'Start by capturing an expense manually, uploading a receipt, or pasting an alert.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-subtle px-4 py-2 text-xs font-mono font-bold cursor-pointer hover:border-[var(--color-accent)] transition-colors"
                  style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                >
                  <FilterX className="h-3.5 w-3.5 text-rose-500" />
                  <span>Clear All Filters</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => openPaymentHub('manual')}
                className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-mono font-bold text-white shadow-xs cursor-pointer hover:scale-105 transition-transform"
                style={{ backgroundColor: 'var(--color-accent)' }}
              >
                <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                <span>+ Add Expense</span>
              </button>
            </div>
          </div>
        ) : (
          filteredTimeline.map((item) => {
            const isMoneyIn = item.direction === 'in';

            // 1. SHARED SPLIT EXPENSE (Req 18, 31)
            if (item.streamType === 'split') {
              const details = item.details || {};
              const isPayer = details.isPayer;
              return (
                <div
                  key={item.id}
                  className="rounded-3xl border border-subtle p-5 shadow-xs hover:border-[var(--color-accent)] transition-all space-y-3"
                  style={{ backgroundColor: 'var(--bg-surface)' }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xl">
                        👥
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                            {item.title}
                          </h3>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase">
                            Shared Expense · {details.participantsCount || 2} People
                          </span>
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border ${
                            item.status === 'settled'
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          }`}>
                            {item.status === 'settled' ? 'Settled' : 'Pending'}
                          </span>
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-2.5 text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {item.date} {item.time ? `· ${item.time}` : ''}
                          </span>
                          <span>•</span>
                          <span>{isPayer ? 'You paid the bill' : 'Friend paid the bill'}</span>
                          {item.notes && (
                            <>
                              <span>•</span>
                              <span className="italic" style={{ color: 'var(--text-secondary)' }}>"{item.notes}"</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right sm:self-center">
                      <span className="text-lg font-extrabold font-mono font-tabular" style={{ color: 'var(--text-primary)' }}>
                        {formatAppMoney(item.amount)}
                      </span>
                      <span className="text-[10px] font-mono block" style={{ color: 'var(--text-muted)' }}>
                        Total Bill
                      </span>
                    </div>
                  </div>

                  {/* Financial Breakdown Grid (Req 18) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-subtle text-xs font-mono">
                    <div className="p-2.5 rounded-xl border border-subtle" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                      <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] block font-bold">
                        Paid By
                      </span>
                      <span className="font-bold mt-0.5 block" style={{ color: 'var(--text-primary)' }}>
                        {isPayer ? 'You' : 'Peer'} ({formatAppMoney(item.amount)})
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl border border-subtle" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                      <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] block font-bold">
                        Your Personal Share
                      </span>
                      <span className="font-bold text-[var(--color-accent)] mt-0.5 block">
                        {formatAppMoney(details.myShare || 0)}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl border border-subtle" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                      <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] block font-bold">
                        {isPayer ? 'To Receive' : 'You Owe'}
                      </span>
                      <span className={`font-bold mt-0.5 block ${isPayer ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {isPayer ? formatAppMoney(details.owedToMe || 0) : formatAppMoney(details.iOwe || 0)}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl border border-subtle" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                      <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] block font-bold">
                        Settlement Status
                      </span>
                      <span className="font-bold text-zinc-300 mt-0.5 block capitalize">
                        {item.status || 'Active'}
                      </span>
                    </div>
                  </div>

                  {/* Participant Chips breakdown */}
                  {Array.isArray(details.shares) && details.shares.length > 0 && (
                    <div className="pt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                      <span className="text-[var(--text-muted)]">Participants:</span>
                      {details.shares.map((s, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md border border-subtle" style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                          {s.userId === 'user-self' ? 'You' : 'Friend'}: {formatAppMoney(s.shareAmount)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            // 2. SETTLEMENT TRANSACTION (Req 20, 31)
            if (item.streamType === 'settlement') {
              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-subtle p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs hover:border-[var(--color-accent)] transition-all"
                  style={{ backgroundColor: 'var(--bg-surface)' }}
                >
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-lg">
                      🤝
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold font-mono leading-tight" style={{ color: 'var(--text-primary)' }}>
                          {item.title}
                        </span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase">
                          Settlement
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2.5 text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {item.date} {item.time ? `· ${item.time}` : ''}
                        </span>
                        <span>•</span>
                        <span>{isMoneyIn ? 'Peer debt cleared' : 'Settlement payment made'}</span>
                        {item.notes && (
                          <>
                            <span>•</span>
                            <span className="italic" style={{ color: 'var(--text-secondary)' }}>"{item.notes}"</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right sm:self-center">
                    <span className={`text-base font-extrabold font-mono font-tabular ${
                      isMoneyIn ? 'text-emerald-500' : 'text-rose-500'
                    }`}>
                      {isMoneyIn ? `+${formatAppMoney(item.amount)}` : `-${formatAppMoney(item.amount)}`}
                    </span>
                    <span className="text-[10px] font-mono block" style={{ color: 'var(--text-muted)' }}>
                      {isMoneyIn ? 'Money Received' : 'Settlement Paid'}
                    </span>
                  </div>
                </div>
              );
            }

            // 3. PERSONAL TRANSACTION
            const cat = getCategoryById(item.category);
            return (
              <div
                key={item.id}
                className="group rounded-2xl border border-subtle p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs hover:border-[var(--color-accent)] transition-all"
                style={{ backgroundColor: 'var(--bg-surface)' }}
              >
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-subtle text-lg" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                    {cat.emoji || '💳'}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold font-mono leading-tight" style={{ color: 'var(--text-primary)' }}>
                        {item.title || 'Expense'}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg border border-subtle" style={{ color: 'var(--text-secondary)' }}>
                        {cat.name}
                      </span>
                      {item.nature && (
                        <span
                          className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-lg border ${
                            item.nature === 'need'
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                              : 'bg-sky-500/10 text-sky-500 border-sky-500/20'
                          }`}
                        >
                          {item.nature}
                        </span>
                      )}
                      {item.planned !== undefined && (
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border ${
                            item.planned
                              ? 'border-subtle text-zinc-400'
                              : 'bg-amber-500/10 text-amber-500 border-amber-500/20 font-bold'
                          }`}
                        >
                          {item.planned ? 'Planned' : 'Unplanned'}
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-2.5 text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {item.date} {item.time ? `· ${item.time}` : ''}
                      </span>
                      {item.notes && (
                        <>
                          <span>•</span>
                          <span className="italic" style={{ color: 'var(--text-secondary)' }}>"{item.notes}"</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-subtle">
                  <span className="text-lg font-extrabold font-mono font-tabular" style={{ color: 'var(--text-primary)' }}>
                    -{formatAppMoney(item.amount)}
                  </span>

                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(item.details?.originalTx || { id: item.id, label: item.title, amount: item.amount, date: item.date, categoryId: item.category, nature: item.nature, planned: item.planned, note: item.notes })}
                      title="Edit Transaction"
                      className="rounded-xl border border-subtle p-2 text-zinc-400 hover:text-[var(--text-primary)] hover:border-[var(--color-accent)] transition-colors cursor-pointer"
                      style={{ backgroundColor: 'var(--bg-elevated)' }}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingId(item.id)}
                      title="Delete Transaction"
                      className="rounded-xl border border-subtle p-2 text-zinc-400 hover:text-rose-500 hover:border-rose-500/30 transition-colors cursor-pointer"
                      style={{ backgroundColor: 'var(--bg-elevated)' }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* EDIT TRANSACTION MODAL */}
      {editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-subtle p-6 shadow-2xl" style={{ backgroundColor: 'var(--bg-surface)' }}>
            <div className="flex items-center justify-between border-b border-subtle pb-4 mb-5">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-accent)] block font-bold">
                  Event Modification
                </span>
                <h2 className="text-lg font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                  Edit Transaction
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingTx(null)}
                className="rounded-xl border border-subtle p-2 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 font-mono text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Merchant / Label
                  </label>
                  <input
                    type="text"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="w-full rounded-xl border border-subtle px-3 py-2 text-xs"
                    style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Amount ({currencyConfig.symbol})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full rounded-xl border border-subtle px-3 py-2 text-xs font-bold"
                    style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Category
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
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
                    Date
                  </label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full rounded-xl border border-subtle px-3 py-2 text-xs"
                    style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Note / Memo
                </label>
                <input
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  className="w-full rounded-xl border border-subtle px-3 py-2 text-xs"
                  style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-subtle">
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="rounded-xl border border-subtle px-4 py-2 text-xs cursor-pointer"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl px-4 py-2 text-xs font-bold text-white cursor-pointer shadow-md"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl border border-subtle p-6 shadow-2xl space-y-4 font-mono text-xs" style={{ backgroundColor: 'var(--bg-surface)' }}>
            <h3 className="text-sm font-bold text-rose-500">
              Delete Transaction?
            </h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              This will remove this record and automatically recalibrate your monthly budget remaining balance.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="rounded-xl border border-subtle px-3 py-1.5 cursor-pointer"
                style={{ color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDelete(deletingId)}
                className="rounded-xl bg-rose-500 text-white font-bold px-3 py-1.5 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
