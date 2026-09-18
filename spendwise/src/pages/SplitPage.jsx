import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
  UserPlus,
  FolderPlus,
  X,
  Trash2,
  MoreVertical,
  Edit2,
  Archive,
  RotateCcw,
  Search,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  ChevronRight,
  Share2,
  Copy,
  Check,
  LogIn,
  FileText,
  Send
} from 'lucide-react';
import { useSpendWise } from '../context/SpendWiseContext';
import {
  splitEqually,
  splitByExactAmounts,
  splitByPercentage,
  splitByShares,
  calculateNetBalances,
  simplifyDebts
} from '../lib/splitEngine';

export function SplitPage() {
  const {
    friends,
    activeFriends = [],
    archivedFriends = [],
    groups,
    splitExpenses,
    settlements,
    currentUser,
    friendRequests = { incoming: [], outgoing: [] },
    searchUsers,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    addFriend,
    editFriend,
    archiveFriend,
    restoreFriend,
    removeFriend,
    getFriendProfile,
    createGroup,
    joinGroup,
    addSplitExpense,
    deleteSplitExpense,
    recordSettlement,
    formatAppMoney,
    currencyConfig
  } = useSpendWise();

  const [activeTab, setActiveTab] = useState('balances'); // 'balances' | 'activity' | 'groups' | 'friends'
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [isJoinGroupModalOpen, setIsJoinGroupModalOpen] = useState(false);
  const [selectedGroupLedger, setSelectedGroupLedger] = useState(null);
  const [shareGroupTarget, setShareGroupTarget] = useState(null);
  const [settleTarget, setSettleTarget] = useState(null); // { friend, amount, direction: 'they_owe_you' | 'you_owe_them', expenseId }
  const [copiedReminderId, setCopiedReminderId] = useState(null);

  // Friend CRUD modals & filtering
  const [selectedFriendDetail, setSelectedFriendDetail] = useState(null);
  const [friendToEdit, setFriendToEdit] = useState(null);
  const [friendToRemove, setFriendToRemove] = useState(null);
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const [friendsSubTab, setFriendsSubTab] = useState('active'); // 'active' | 'archived'
  const [menuOpenFriendId, setMenuOpenFriendId] = useState(null);

  const currentUserId = currentUser?.id || 'user-self';

  // Calculate Net Balances
  const balances = useMemo(() => {
    return calculateNetBalances(currentUserId, splitExpenses, settlements);
  }, [currentUserId, splitExpenses, settlements]);

  const whoOwesYouList = balances?.whoOwesYou || [];
  const youOweList = balances?.whoYouOwe || balances?.youOweList || (Array.isArray(balances?.youOwe) ? balances.youOwe : []);
  const totalYouAreOwed = typeof balances?.youAreOwed === 'number' ? balances.youAreOwed : (typeof balances?.totalOwedToYou === 'number' ? balances.totalOwedToYou : 0);
  const totalYouOwe = typeof balances?.totalYouOwe === 'number' ? balances.totalYouOwe : (typeof balances?.youOwe === 'number' ? balances.youOwe : 0);
  const netBalance = typeof balances?.netBalance === 'number' ? balances.netBalance : 0;

  // Map friend lookup
  const friendMap = useMemo(() => {
    const map = {
      'user-self': { id: 'user-self', name: 'You', avatar: 'YOU', color: 'var(--color-accent)' }
    };
    if (currentUser?.id) {
      map[currentUser.id] = {
        id: currentUser.id,
        name: currentUser.name || 'You',
        avatar: currentUser.name?.[0]?.toUpperCase() || 'YOU',
        color: 'var(--color-accent)'
      };
    }
    friends.forEach((f) => {
      map[f.id] = f;
      if (f.friendUserId) {
        map[f.friendUserId] = f;
      }
    });
    return map;
  }, [friends, currentUser]);

  // Debt Simplification metrics
  const rawDebts = useMemo(() => {
    const debts = [];
    splitExpenses.forEach((exp) => {
      const payer = exp.paidById || exp.paidBy;
      const parts = exp.participants || exp.shares || [];
      parts.forEach((s) => {
        const pId = s.participantId || s.userId;
        if (pId !== payer && s.shareAmount > 0) {
          debts.push({
            from: pId,
            fromId: pId,
            fromName: s.participantName || s.name || 'Friend',
            to: payer,
            toId: payer,
            toName: exp.payerName || 'Friend',
            amount: s.shareAmount
          });
        }
      });
    });
    return debts;
  }, [splitExpenses]);

  const simplifiedDebtsCount = useMemo(() => {
    if (rawDebts.length <= 1) return rawDebts.length;
    return simplifyDebts(rawDebts).length;
  }, [rawDebts]);

  const debtsReduced = Math.max(0, rawDebts.length - simplifiedDebtsCount);

  // Handle Settlement confirmation
  const handleConfirmSettlement = (amount, notes) => {
    if (!settleTarget || amount <= 0) return;

    // Find any related active split expense between the parties
    const relatedSplit = splitExpenses.find((exp) => {
      const isUserPayer = (exp.paidById || exp.paidBy) === currentUserId;
      const isFriendPayer = (exp.paidById || exp.paidBy) === settleTarget.friend.id;
      const parts = exp.participants || exp.shares || [];
      const hasUser = parts.some((p) => (p.participantId || p.userId) === currentUserId);
      const hasFriend = parts.some((p) => (p.participantId || p.userId) === settleTarget.friend.id);
      return ((isUserPayer && hasFriend) || (isFriendPayer && hasUser)) && exp.status !== 'SETTLED';
    });

    if (settleTarget.direction === 'they_owe_you') {
      recordSettlement({
        expenseId: relatedSplit?.id || settleTarget.expenseId || null,
        fromId: settleTarget.friend.id,
        fromUserId: settleTarget.friend.id,
        fromName: settleTarget.friend.name,
        toId: currentUserId,
        toUserId: currentUserId,
        toName: currentUser?.name || 'You',
        amount: Number(amount),
        currency: currencyConfig.code,
        notes: notes || 'Settled peer balance',
        note: notes || 'Settled peer balance'
      });
    } else {
      recordSettlement({
        expenseId: relatedSplit?.id || settleTarget.expenseId || null,
        fromId: currentUserId,
        fromUserId: currentUserId,
        fromName: currentUser?.name || 'You',
        toId: settleTarget.friend.id,
        toUserId: settleTarget.friend.id,
        toName: settleTarget.friend.name,
        amount: Number(amount),
        currency: currencyConfig.code,
        notes: notes || 'Settled peer balance',
        note: notes || 'Settled peer balance'
      });
    }
    setSettleTarget(null);
  };

  const handleCopyReminder = (friend, amount) => {
    const text = `Hey ${friend.name}! Friendly reminder from SpendWise: you have an outstanding balance of ${formatAppMoney(amount)}. Whenever you get a chance!`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedReminderId(friend.id);
      setTimeout(() => setCopiedReminderId(null), 2500);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:py-10 space-y-8 font-sans">
      {/* Header with Title & Quick Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-subtle pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-subtle px-3 py-1 text-[11px] font-mono" style={{ backgroundColor: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}>
            <Users className="h-3.5 w-3.5" />
            <span className="uppercase tracking-widest font-bold">Social Money Network</span>
            <span className="opacity-50">|</span>
            <span>Deterministic Debt Engine</span>
          </div>
          <h1 className="mt-2 text-2xl md:text-3xl font-extrabold font-mono tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Friends Split
          </h1>
          <p className="mt-1 text-xs md:text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
            Track shared meals, travel, and group bills with automatic peer debt balancing.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setIsSplitModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-mono font-bold shadow-md cursor-pointer transition-all hover:scale-[1.02]"
            style={{ backgroundColor: 'var(--color-accent)', color: '#ffffff' }}
          >
            <Plus className="h-4 w-4" />
            <span>Split an Expense</span>
          </button>
        </div>
      </div>

      {/* Axiom-Style Top Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Net Balance Card */}
        <div className="rounded-3xl border border-subtle p-5 shadow-lg relative overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)' }}>
          <span className="text-[10px] font-mono uppercase tracking-widest block font-bold" style={{ color: 'var(--text-muted)' }}>
            Total Net Balance
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-3xl md:text-4xl font-extrabold font-mono font-tabular ${
                netBalance > 0
                  ? 'text-emerald-500'
                  : netBalance < 0
                  ? 'text-rose-500'
                  : ''
              }`}
              style={{ color: netBalance === 0 ? 'var(--text-primary)' : undefined }}
            >
              {netBalance > 0 ? `+${formatAppMoney(netBalance)}` : formatAppMoney(netBalance)}
            </span>
          </div>
          <p className="mt-1 text-[11px] font-mono" style={{ color: 'var(--text-secondary)' }}>
            {netBalance > 0
              ? 'Overall, friends owe you money'
              : netBalance < 0
              ? 'Overall, you have outstanding debts'
              : 'All peer debts settled'}
          </p>
        </div>

        {/* You Are Owed */}
        <div className="rounded-3xl border border-subtle p-5 shadow-lg relative overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)' }}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest block font-bold" style={{ color: 'var(--text-muted)' }}>
              You Are Owed
            </span>
            <span className="rounded-full p-1 bg-emerald-500/15 text-emerald-500">
              <ArrowDownLeft className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-2 text-3xl font-extrabold font-mono font-tabular text-emerald-500">
            {formatAppMoney(totalYouAreOwed)}
          </p>
          <p className="mt-1 text-[11px] font-mono" style={{ color: 'var(--text-secondary)' }}>
            {whoOwesYouList.length} friend{whoOwesYouList.length === 1 ? '' : 's'} owe you
          </p>
        </div>

        {/* You Owe */}
        <div className="rounded-3xl border border-subtle p-5 shadow-lg relative overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)' }}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest block font-bold" style={{ color: 'var(--text-muted)' }}>
              You Owe
            </span>
            <span className="rounded-full p-1 bg-rose-500/15 text-rose-500">
              <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-2 text-3xl font-extrabold font-mono font-tabular text-rose-500">
            {formatAppMoney(totalYouOwe)}
          </p>
          <p className="mt-1 text-[11px] font-mono" style={{ color: 'var(--text-secondary)' }}>
            To {youOweList.length} friend{youOweList.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      {/* Visual Balance Diagram: People who owe you & People you owe (Requirement 32) */}
      {(whoOwesYouList.length > 0 || youOweList.length > 0) && (
        <div className="rounded-3xl border border-subtle p-5 shadow-sm space-y-4" style={{ backgroundColor: 'var(--bg-surface)' }}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest font-bold" style={{ color: 'var(--text-secondary)' }}>
              Visual Balance Overview
            </span>
            <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
              Deterministic Peer Graph
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* People who owe you */}
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono font-bold text-emerald-500 uppercase tracking-wider">
                <span>People who owe you ({whoOwesYouList.length})</span>
                <span>Receivable</span>
              </div>
              {whoOwesYouList.length === 0 ? (
                <p className="text-xs font-mono text-emerald-600/70 italic py-1">No pending receivables</p>
              ) : (
                <div className="space-y-1.5">
                  {whoOwesYouList.map((item) => {
                    const friend = friendMap[item.userId] || { id: item.userId, name: 'Friend', avatar: 'F', color: '#10b981' };
                    return (
                      <div
                        key={item.userId}
                        onClick={() => setSelectedFriendDetail(friend)}
                        className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg-surface)] border border-emerald-500/10 cursor-pointer hover:border-emerald-500/30 transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                            style={{ backgroundColor: friend.color || '#10b981' }}
                          >
                            {friend.avatar || friend.name[0]}
                          </div>
                          <span className="text-xs font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
                            {friend.name}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-emerald-500 font-tabular">
                          +{formatAppMoney(item.amount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* People you owe */}
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-3.5 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono font-bold text-rose-500 uppercase tracking-wider">
                <span>People you owe ({youOweList.length})</span>
                <span>Payable</span>
              </div>
              {youOweList.length === 0 ? (
                <p className="text-xs font-mono text-rose-600/70 italic py-1">No debts payable</p>
              ) : (
                <div className="space-y-1.5">
                  {youOweList.map((item) => {
                    const friend = friendMap[item.userId] || { id: item.userId, name: 'Friend', avatar: 'F', color: '#f43f5e' };
                    return (
                      <div
                        key={item.userId}
                        onClick={() => setSelectedFriendDetail(friend)}
                        className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg-surface)] border border-rose-500/10 cursor-pointer hover:border-rose-500/30 transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                            style={{ backgroundColor: friend.color || '#f43f5e' }}
                          >
                            {friend.avatar || friend.name[0]}
                          </div>
                          <span className="text-xs font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
                            {friend.name}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-rose-500 font-tabular">
                          -{formatAppMoney(item.amount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Debt Simplification Telemetry Banner */}
      {debtsReduced > 0 && (
        <div className="rounded-2xl border border-subtle p-3.5 flex items-center justify-between text-xs font-mono" style={{ backgroundColor: 'var(--color-accent-subtle)', color: 'var(--color-accent)' }}>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>
              <strong>Smart Debt Simplification Active:</strong> Minimized peer cash flow by eliminating {debtsReduced} redundant cross-payments.
            </span>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex border-b border-subtle gap-2 overflow-x-auto pb-px">
        {[
          { id: 'balances', label: 'Balances & Debts', count: whoOwesYouList.length + youOweList.length },
          { id: 'activity', label: 'Split Activity', count: splitExpenses.length },
          { id: 'groups', label: 'Groups', count: groups.length },
          { id: 'friends', label: 'Friends Directory', count: friends.length }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                : 'border-transparent hover:text-[var(--text-primary)]'
            }`}
            style={{ color: activeTab === tab.id ? 'var(--color-accent)' : 'var(--text-secondary)' }}
          >
            <span>{tab.label}</span>
            <span
              className="rounded-full px-2 py-0.5 text-[10px]"
              style={{
                backgroundColor: activeTab === tab.id ? 'var(--color-accent-badge-bg)' : 'var(--border-subtle)',
                color: activeTab === tab.id ? 'var(--color-accent)' : 'var(--text-muted)'
              }}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* TAB CONTENT: 1. Balances & Debts */}
      {activeTab === 'balances' && (
        <div className="space-y-6">
          {whoOwesYouList.length === 0 && youOweList.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-subtle p-12 text-center" style={{ backgroundColor: 'var(--bg-surface)' }}>
              <Users className="h-10 w-10 mx-auto opacity-30" style={{ color: 'var(--text-primary)' }} />
              <h3 className="mt-4 text-base font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                Zero Pending Peer Balances
              </h3>
              <p className="mt-1 text-xs font-mono max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
                You are all squared away! Split a restaurant bill, cab ride, or trip expense to get started.
              </p>
              <button
                type="button"
                onClick={() => setIsSplitModalOpen(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-mono font-bold cursor-pointer"
                style={{ backgroundColor: 'var(--color-accent)', color: '#ffffff' }}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Split Your First Expense</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Column: Who Owes You */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
                    Who Owes You ({whoOwesYouList.length})
                  </h3>
                </div>

                {whoOwesYouList.length === 0 ? (
                  <p className="text-xs font-mono italic p-4 rounded-2xl border border-subtle" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-muted)' }}>
                    No one owes you money right now.
                  </p>
                ) : (
                  whoOwesYouList.map((item) => {
                    const friend = friendMap[item.userId] || { name: 'Friend', avatar: 'F', color: '#10b981' };
                    return (
                      <div
                        key={item.userId}
                        className="rounded-2xl border border-subtle p-4 flex items-center justify-between shadow-sm hover:border-[var(--color-accent)] transition-all"
                        style={{ backgroundColor: 'var(--bg-surface)' }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-2xl font-mono font-bold text-xs text-white"
                            style={{ backgroundColor: friend.color || '#10b981' }}
                          >
                            {friend.avatar || friend.name[0]}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                              {friend.name}
                            </h4>
                            <span className="text-[11px] font-mono text-emerald-500 font-bold block">
                              owes you {formatAppMoney(item.amount)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyReminder(friend, item.amount)}
                            className="rounded-xl border border-subtle px-2.5 py-1.5 text-[11px] font-mono cursor-pointer hover:bg-[var(--border-subtle)] transition-colors"
                            style={{ color: 'var(--text-secondary)' }}
                            title="Copy reminder message"
                          >
                            {copiedReminderId === friend.id ? 'Copied!' : 'Remind'}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setSettleTarget({
                                friend,
                                amount: item.amount,
                                direction: 'they_owe_you'
                              })
                            }
                            className="rounded-xl px-3 py-1.5 text-xs font-mono font-bold cursor-pointer transition-transform hover:scale-105"
                            style={{ backgroundColor: 'var(--color-accent)', color: '#ffffff' }}
                          >
                            Settle
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Column: You Owe */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
                    You Owe ({youOweList.length})
                  </h3>
                </div>

                {youOweList.length === 0 ? (
                  <p className="text-xs font-mono italic p-4 rounded-2xl border border-subtle" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-muted)' }}>
                    You don't owe anyone money right now!
                  </p>
                ) : (
                  youOweList.map((item) => {
                    const friend = friendMap[item.userId] || { name: 'Friend', avatar: 'F', color: '#f43f5e' };
                    return (
                      <div
                        key={item.userId}
                        className="rounded-2xl border border-subtle p-4 flex items-center justify-between shadow-sm hover:border-rose-400 transition-all"
                        style={{ backgroundColor: 'var(--bg-surface)' }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-2xl font-mono font-bold text-xs text-white"
                            style={{ backgroundColor: friend.color || '#f43f5e' }}
                          >
                            {friend.avatar || friend.name[0]}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                              {friend.name}
                            </h4>
                            <span className="text-[11px] font-mono text-rose-500 font-bold block">
                              you owe {formatAppMoney(item.amount)}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setSettleTarget({
                              friend,
                              amount: item.amount,
                              direction: 'you_owe_them'
                            })
                          }
                          className="rounded-xl px-3 py-1.5 text-xs font-mono font-bold cursor-pointer transition-transform hover:scale-105 bg-rose-500 text-white shadow-sm"
                        >
                          Settle Up
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: 2. Activity Feed */}
      {activeTab === 'activity' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
              Split Expenses History ({splitExpenses.length})
            </h3>
          </div>

          {splitExpenses.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-subtle p-8 text-center" style={{ backgroundColor: 'var(--bg-surface)' }}>
              <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                No split expenses recorded yet. Click "Split an Expense" above.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {splitExpenses.map((exp) => {
                const payer = friendMap[exp.paidBy] || { name: 'Someone' };
                const isUserPayer = exp.paidBy === currentUserId;

                return (
                  <div
                    key={exp.id}
                    className="rounded-2xl border border-subtle p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs"
                    style={{ backgroundColor: 'var(--bg-surface)' }}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
                          {exp.title}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md border border-subtle uppercase" style={{ color: 'var(--text-muted)' }}>
                          {exp.splitMethod}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        Paid by <strong style={{ color: isUserPayer ? 'var(--color-accent)' : 'var(--text-primary)' }}>{payer.name}</strong> on {exp.date} · {exp.shares?.length || 0} people
                      </p>
                      {exp.notes && (
                        <p className="text-[11px] font-mono italic mt-1" style={{ color: 'var(--text-muted)' }}>
                          "{exp.notes}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-subtle">
                      <div className="text-right">
                        <span className="text-base font-extrabold font-mono font-tabular" style={{ color: 'var(--text-primary)' }}>
                          {formatAppMoney(exp.totalAmount)}
                        </span>
                        <span className="text-[10px] font-mono block" style={{ color: 'var(--text-muted)' }}>
                          Total Bill
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => deleteSplitExpense(exp.id)}
                        className="rounded-xl border border-subtle p-2 text-zinc-400 hover:text-rose-500 cursor-pointer transition-colors"
                        title="Delete split expense"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: 3. Groups */}
      {activeTab === 'groups' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
                Shared Groups ({groups.length})
              </h3>
              <p className="text-[11px] font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Collaborate on shared trips, flat expenses, and events with real-time sync.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsJoinGroupModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-subtle px-3 py-1.5 text-xs font-mono font-semibold cursor-pointer hover:border-[var(--color-accent)] transition-colors"
                style={{ color: 'var(--text-primary)' }}
              >
                <LogIn className="h-3.5 w-3.5 text-emerald-500" />
                <span>Join via Code</span>
              </button>
              <button
                type="button"
                onClick={() => setIsCreateGroupModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-subtle px-3 py-1.5 text-xs font-mono font-semibold cursor-pointer hover:border-[var(--color-accent)] transition-colors"
                style={{ color: 'var(--text-primary)' }}
              >
                <FolderPlus className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                <span>Create Group</span>
              </button>
            </div>
          </div>

          {groups.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-subtle p-12 text-center" style={{ backgroundColor: 'var(--bg-surface)' }}>
              <Users className="h-10 w-10 mx-auto opacity-30" style={{ color: 'var(--text-primary)' }} />
              <h4 className="mt-3 text-sm font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                No Shared Groups Yet
              </h4>
              <p className="mt-1 text-xs font-mono max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
                Create a group for a trip, flatmates, or project, or join an existing group with an invite code.
              </p>
              <div className="mt-5 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsJoinGroupModalOpen(true)}
                  className="rounded-xl border border-subtle px-3.5 py-2 text-xs font-mono font-semibold cursor-pointer hover:border-[var(--color-accent)] transition-colors"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <LogIn className="h-3.5 w-3.5 inline mr-1 text-emerald-500" />
                  Join Group
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateGroupModalOpen(true)}
                  className="rounded-xl px-4 py-2 text-xs font-mono font-bold text-white shadow-sm cursor-pointer"
                  style={{ backgroundColor: 'var(--color-accent)' }}
                >
                  <FolderPlus className="h-3.5 w-3.5 inline mr-1" />
                  Create Group
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {groups.map((grp) => {
                const membersList = Array.isArray(grp.members) && grp.members.length > 0
                  ? grp.members
                  : (grp.memberIds || []).map((mId) => ({ userId: mId, user: friendMap[mId] || { name: 'Member' } }));
                const memberCount = membersList.length;

                return (
                  <div
                    key={grp.id}
                    className="rounded-3xl border border-subtle p-5 shadow-sm space-y-4 flex flex-col justify-between"
                    style={{ backgroundColor: 'var(--bg-surface)' }}
                  >
                    <div>
                      {/* Top Bar: Icon, Name, Members count, Share & Code */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl p-2 rounded-2xl bg-zinc-900/10 border border-subtle">
                            {grp.emoji || '👥'}
                          </span>
                          <div>
                            <h4 className="text-sm font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                              {grp.name}
                            </h4>
                            <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                              {memberCount} member{memberCount === 1 ? '' : 's'}
                            </span>
                          </div>
                        </div>

                        {grp.inviteCode && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                if (navigator.clipboard) {
                                  navigator.clipboard.writeText(grp.inviteCode);
                                }
                              }}
                              className="rounded-lg border border-subtle px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)] hover:text-emerald-500 cursor-pointer transition-colors"
                              title="Click to copy invite code"
                            >
                              Code: <strong className="text-emerald-500">{grp.inviteCode}</strong>
                            </button>
                            <button
                              type="button"
                              onClick={() => setShareGroupTarget(grp)}
                              className="rounded-lg border border-subtle p-1 text-[var(--text-secondary)] hover:text-[var(--color-accent)] cursor-pointer transition-colors"
                              title="Share group link"
                            >
                              <Share2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Member Avatars */}
                      <div className="mt-4 flex items-center gap-2">
                        <div className="flex -space-x-1.5">
                          {membersList.slice(0, 5).map((m, idx) => {
                            const name = m.user?.name || m.name || friendMap[m.userId]?.name || 'Member';
                            const initial = name[0]?.toUpperCase() || 'M';
                            const color = friendMap[m.userId]?.color || '#10b981';
                            return (
                              <div
                                key={m.userId || idx}
                                className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-[var(--bg-surface)] shadow-xs"
                                style={{ backgroundColor: color }}
                                title={name}
                              >
                                {initial}
                              </div>
                            );
                          })}
                        </div>
                        {memberCount > 5 && (
                          <span className="text-[10px] font-mono text-[var(--text-muted)]">
                            +{memberCount - 5} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="border-t border-subtle pt-3 flex items-center justify-between text-xs font-mono">
                      <button
                        type="button"
                        onClick={() => setSelectedGroupLedger(grp)}
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--text-primary)] hover:text-[var(--color-accent)] cursor-pointer transition-colors"
                      >
                        <FileText className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                        <span>Ledger & Balances</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsSplitModalOpen(true)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--color-accent)] hover:underline cursor-pointer"
                      >
                        <span>+ Add Group Bill</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: 4. Friends Directory (CRUD, Active/Archived, Search, Rich Cards) */}
      {activeTab === 'friends' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Active vs Archived sub-tabs (Req 8) */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl border border-subtle bg-[var(--bg-elevated)] w-fit">
              <button
                type="button"
                onClick={() => setFriendsSubTab('active')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold cursor-pointer transition-all ${
                  friendsSubTab === 'active'
                    ? 'bg-[var(--bg-surface)] text-[var(--color-accent)] shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Active Friends ({activeFriends.length})
              </button>
              <button
                type="button"
                onClick={() => setFriendsSubTab('archived')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold cursor-pointer transition-all ${
                  friendsSubTab === 'archived'
                    ? 'bg-[var(--bg-surface)] text-[var(--color-accent)] shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Archived ({archivedFriends.length})
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsAddFriendModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-subtle px-3 py-2 text-xs font-mono font-semibold cursor-pointer hover:border-[var(--color-accent)] transition-colors self-start sm:self-auto"
              style={{ color: 'var(--text-primary)' }}
            >
              <UserPlus className="h-3.5 w-3.5 text-[var(--color-accent)]" />
              <span>Add Friend</span>
            </button>
          </div>

          {/* Incoming Friend Requests (Cloud Multi-User Networking) */}
          {friendRequests?.incoming?.length > 0 && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                  <UserPlus className="h-4 w-4" />
                  <span>Incoming Friend Requests ({friendRequests.incoming.length})</span>
                </span>
              </div>
              <div className="space-y-2">
                {friendRequests.incoming.map((req) => (
                  <div
                    key={req.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-xl border border-subtle gap-2"
                    style={{ backgroundColor: 'var(--bg-surface)' }}
                  >
                    <div>
                      <h4 className="text-xs font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
                        {req.user?.name || req.sender?.name || 'SpendWise User'}
                      </h4>
                      <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                        {req.user?.email || req.sender?.email || 'Registered User'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => acceptFriendRequest(req.id)}
                        className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-emerald-500 text-white cursor-pointer hover:bg-emerald-600 transition-colors shadow-xs"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => declineFriendRequest(req.id)}
                        className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold border border-subtle text-rose-500 cursor-pointer hover:bg-rose-500/10 transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Friend Search Bar (Req 6) */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search friends by name or identifier..."
              value={friendSearchQuery}
              onChange={(e) => setFriendSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-subtle pl-10 pr-10 py-2.5 text-xs font-mono focus:outline-none focus:border-[var(--color-accent)]"
              style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}
            />
            {friendSearchQuery && (
              <button
                type="button"
                onClick={() => setFriendSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Friend Cards Grid (Req 7) */}
          {(() => {
            const listToFilter = friendsSubTab === 'active' ? activeFriends : archivedFriends;
            const filteredList = listToFilter.filter((f) => {
              const q = friendSearchQuery.trim().toLowerCase();
              if (!q) return true;
              return (
                (f.name && f.name.toLowerCase().includes(q)) ||
                (f.email && f.email.toLowerCase().includes(q))
              );
            });

            if (filteredList.length === 0) {
              if (friendSearchQuery.trim()) {
                return (
                  <div className="rounded-3xl border border-dashed border-subtle p-8 text-center" style={{ backgroundColor: 'var(--bg-surface)' }}>
                    <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                      No friends found matching "{friendSearchQuery}".
                    </p>
                  </div>
                );
              }
              if (friendsSubTab === 'archived') {
                return (
                  <div className="rounded-3xl border border-dashed border-subtle p-8 text-center" style={{ backgroundColor: 'var(--bg-surface)' }}>
                    <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                      No archived friends. Historical records are safely retained here when friends are removed.
                    </p>
                  </div>
                );
              }
              return (
                <div className="rounded-3xl border border-dashed border-subtle p-10 text-center" style={{ backgroundColor: 'var(--bg-surface)' }}>
                  <Users className="h-9 w-9 mx-auto opacity-30" style={{ color: 'var(--text-primary)' }} />
                  <h4 className="mt-3 text-sm font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                    No friends yet.
                  </h4>
                  <p className="mt-1 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                    Add people you regularly share expenses with.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsAddFriendModalOpen(true)}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-white shadow-sm cursor-pointer"
                    style={{ backgroundColor: 'var(--color-accent)' }}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>Add Friend</span>
                  </button>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredList.map((friend) => {
                  const profile = getFriendProfile(friend.id);
                  const isMenuOpen = menuOpenFriendId === friend.id;

                  return (
                    <div
                      key={friend.id}
                      className="rounded-3xl border border-subtle p-5 shadow-sm hover:border-[var(--color-accent)] transition-all flex flex-col justify-between relative group cursor-pointer"
                      style={{ backgroundColor: 'var(--bg-surface)' }}
                      onClick={() => setSelectedFriendDetail(friend)}
                    >
                      <div>
                        {/* Top: Avatar, Name, Email, Menu */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-mono font-bold text-sm text-white shadow-xs"
                              style={{ backgroundColor: friend.color || '#10b981' }}
                            >
                              {friend.avatar || (friend.name ? friend.name[0].toUpperCase() : 'F')}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold font-mono truncate" style={{ color: 'var(--text-primary)' }}>
                                {friend.name}
                              </h4>
                              <p className="text-[10px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>
                                {friend.email || 'Local Peer Contact'}
                              </p>
                            </div>
                          </div>

                          {/* Action menu trigger (Req 2) */}
                          <div className="relative" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setMenuOpenFriendId(isMenuOpen ? null : friend.id)}
                              className="rounded-lg p-1.5 text-zinc-400 hover:text-white cursor-pointer"
                              title="Actions"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>

                            {isMenuOpen && (
                              <div
                                className="absolute right-0 mt-1 w-44 rounded-2xl border border-subtle shadow-2xl py-1 z-30 font-mono text-xs"
                                style={{ backgroundColor: 'var(--bg-elevated)' }}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMenuOpenFriendId(null);
                                    setFriendToEdit(friend);
                                  }}
                                  className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-[var(--bg-surface)] cursor-pointer"
                                  style={{ color: 'var(--text-primary)' }}
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                  <span>Edit Friend</span>
                                </button>
                                {friend.isArchived ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMenuOpenFriendId(null);
                                      restoreFriend(friend.id);
                                    }}
                                    className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-[var(--bg-surface)] text-emerald-500 cursor-pointer"
                                  >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    <span>Restore Friend</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMenuOpenFriendId(null);
                                      setFriendToRemove(friend);
                                    }}
                                    className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-[var(--bg-surface)] text-rose-500 cursor-pointer"
                                  >
                                    <Archive className="h-3.5 w-3.5" />
                                    <span>Remove / Archive</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Balance Badge (Req 7: financial balance is most visually prominent) */}
                        <div className="mt-4 pt-3 border-t border-subtle">
                          <span className="text-[10px] font-mono uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                            Relationship Balance
                          </span>
                          <div className="mt-1 flex items-baseline justify-between">
                            {profile.netBalance > 0 ? (
                              <span className="text-base font-extrabold font-mono font-tabular text-emerald-500">
                                Owes you {formatAppMoney(profile.netBalance)}
                              </span>
                            ) : profile.netBalance < 0 ? (
                              <span className="text-base font-extrabold font-mono font-tabular text-rose-500">
                                You owe {formatAppMoney(profile.youOweThem)}
                              </span>
                            ) : (
                              <span className="text-sm font-semibold font-mono text-zinc-400">
                                Settled up
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card Footer: Shared count & Status */}
                      <div className="mt-4 pt-2.5 border-t border-subtle flex items-center justify-between text-[10px] font-mono">
                        <span style={{ color: 'var(--text-muted)' }}>
                          {profile.sharedExpensesCount} shared expense{profile.sharedExpensesCount === 1 ? '' : 's'}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 font-bold ${
                            friend.isArchived ? 'text-zinc-400' : 'text-emerald-500'
                          }`}
                        >
                          ● {friend.isArchived ? 'ARCHIVED' : 'ACTIVE'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: Split an Expense Flow                         */}
      {/* ==================================================== */}
      <AnimatePresence>
        {isSplitModalOpen && (
          <SplitExpenseModal
            friends={activeFriends}
            currentUserId={currentUserId}
            currencyConfig={currencyConfig}
            onClose={() => setIsSplitModalOpen(false)}
            onSave={(splitData) => {
              addSplitExpense(splitData);
              setIsSplitModalOpen(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* ==================================================== */}
      {/* MODAL: Settle Debt (Full or Partial)                 */}
      {/* ==================================================== */}
      <AnimatePresence>
        {settleTarget && (
          <SettleDebtModal
            target={settleTarget}
            currencyConfig={currencyConfig}
            formatAppMoney={formatAppMoney}
            onClose={() => setSettleTarget(null)}
            onConfirm={handleConfirmSettlement}
          />
        )}
      </AnimatePresence>

      {/* ==================================================== */}
      {/* MODAL: Add Friend                                    */}
      {/* ==================================================== */}
      <AnimatePresence>
        {isAddFriendModalOpen && (
          <AddFriendModal
            onClose={() => setIsAddFriendModalOpen(false)}
            onAdd={(newFriend) => {
              addFriend(newFriend);
              setIsAddFriendModalOpen(false);
            }}
            onSearchUsers={searchUsers}
            onSendRequest={async (targetId) => {
              await sendFriendRequest(targetId);
            }}
          />
        )}
      </AnimatePresence>

      {/* ==================================================== */}
      {/* MODAL: Create Group                                  */}
      {/* ==================================================== */}
      <AnimatePresence>
        {isCreateGroupModalOpen && (
          <CreateGroupModal
            friends={activeFriends}
            currentUserId={currentUserId}
            currentUser={currentUser}
            onClose={() => setIsCreateGroupModalOpen(false)}
            onCreate={(group) => {
              createGroup(group);
              setIsCreateGroupModalOpen(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* ==================================================== */}
      {/* MODAL: Join Group via Code                           */}
      {/* ==================================================== */}
      <AnimatePresence>
        {isJoinGroupModalOpen && (
          <JoinGroupModal
            onClose={() => setIsJoinGroupModalOpen(false)}
            onJoin={async (code) => {
              await joinGroup(code);
              setIsJoinGroupModalOpen(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* ==================================================== */}
      {/* MODAL: Share Group                                   */}
      {/* ==================================================== */}
      <AnimatePresence>
        {shareGroupTarget && (
          <ShareGroupModal
            group={shareGroupTarget}
            onClose={() => setShareGroupTarget(null)}
          />
        )}
      </AnimatePresence>

      {/* ==================================================== */}
      {/* MODAL: Group Ledger & Debts                          */}
      {/* ==================================================== */}
      <AnimatePresence>
        {selectedGroupLedger && (
          <GroupLedgerModal
            group={selectedGroupLedger}
            splitExpenses={splitExpenses}
            settlements={settlements}
            friends={friends}
            currentUserId={currentUserId}
            currentUser={currentUser}
            formatAppMoney={formatAppMoney}
            currencyConfig={currencyConfig}
            onClose={() => setSelectedGroupLedger(null)}
            onShare={() => {
              const grp = selectedGroupLedger;
              setSelectedGroupLedger(null);
              setShareGroupTarget(grp);
            }}
            onAddExpense={() => {
              setSelectedGroupLedger(null);
              setIsSplitModalOpen(true);
            }}
            onSettle={(target) => {
              setSelectedGroupLedger(null);
              setSettleTarget(target);
            }}
          />
        )}
      </AnimatePresence>

      {/* ==================================================== */}
      {/* MODAL: Friend Details Profile & Activity (Req 4, 9)   */}
      {/* ==================================================== */}
      <AnimatePresence>
        {selectedFriendDetail && (
          <FriendDetailModal
            friend={selectedFriendDetail}
            currentUserId={currentUserId}
            profile={getFriendProfile(selectedFriendDetail.id)}
            formatAppMoney={formatAppMoney}
            currencyConfig={currencyConfig}
            onClose={() => setSelectedFriendDetail(null)}
            onEdit={(f) => {
              setSelectedFriendDetail(null);
              setFriendToEdit(f);
            }}
            onRemove={(f) => {
              setSelectedFriendDetail(null);
              setFriendToRemove(f);
            }}
            onRestore={(fId) => {
              restoreFriend(fId);
              setSelectedFriendDetail(null);
            }}
            onSettle={(target) => {
              setSelectedFriendDetail(null);
              setSettleTarget(target);
            }}
          />
        )}
      </AnimatePresence>

      {/* ==================================================== */}
      {/* MODAL: Edit Friend (Req 1, 2)                         */}
      {/* ==================================================== */}
      <AnimatePresence>
        {friendToEdit && (
          <EditFriendModal
            friend={friendToEdit}
            onClose={() => setFriendToEdit(null)}
            onSave={(updates) => {
              editFriend(friendToEdit.id, updates);
              setFriendToEdit(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* ==================================================== */}
      {/* MODAL: Remove/Archive Friend Confirmation (Req 2, 36) */}
      {/* ==================================================== */}
      <AnimatePresence>
        {friendToRemove && (
          <RemoveFriendConfirmModal
            friend={friendToRemove}
            profile={getFriendProfile(friendToRemove.id)}
            formatAppMoney={formatAppMoney}
            onClose={() => setFriendToRemove(null)}
            onConfirm={() => {
              removeFriend(friendToRemove.id);
              setFriendToRemove(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------- */
/* SUBCOMPONENT: Split Expense Modal Form                        */
/* ------------------------------------------------------------- */
function SplitExpenseModal({ friends, currentUserId, currencyConfig, onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paidBy, setPaidBy] = useState(currentUserId);
  const [selectedMembers, setSelectedMembers] = useState([currentUserId, ...((friends || []).slice(0, 2).map((f) => f.id))]);
  const [splitMethod, setSplitMethod] = useState('equally'); // 'equally' | 'exact' | 'percentage' | 'shares'
  const [exactShares, setExactShares] = useState({});
  const [percentages, setPercentages] = useState({});
  const [sharesWeights, setSharesWeights] = useState({});
  const [notes, setNotes] = useState('');
  const [error, setError] = useState(null);

  const toggleMember = (id) => {
    if (selectedMembers.includes(id)) {
      if (selectedMembers.length <= 1) {
        setError('A split must include at least one participant.');
        return;
      }
      setSelectedMembers(selectedMembers.filter((m) => m !== id));
    } else {
      setSelectedMembers([...selectedMembers, id]);
    }
    setError(null);
  };

  // Preview generated shares
  const calculatedShares = useMemo(() => {
    const amt = parseFloat(totalAmount);
    if (isNaN(amt) || amt <= 0 || selectedMembers.length === 0) return [];

    try {
      if (splitMethod === 'equally') {
        return splitEqually(amt, selectedMembers, paidBy).shares;
      }
      if (splitMethod === 'exact') {
        const list = selectedMembers.map((m) => ({ userId: m, amount: Number(exactShares[m] || 0) }));
        return splitByExactAmounts(amt, list, paidBy).shares;
      }
      if (splitMethod === 'percentage') {
        const list = selectedMembers.map((m) => ({ userId: m, percentage: Number(percentages[m] || 0) }));
        return splitByPercentage(amt, list, paidBy).shares;
      }
      if (splitMethod === 'shares') {
        const list = selectedMembers.map((m) => ({ userId: m, shares: Number(sharesWeights[m] || 1) }));
        return splitByShares(amt, list, paidBy).shares;
      }
    } catch {
      return [];
    }
    return [];
  }, [totalAmount, selectedMembers, paidBy, splitMethod, exactShares, percentages, sharesWeights]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const amt = parseFloat(totalAmount);

    if (!title.trim()) {
      setError('Please provide a title for the shared expense (e.g. Dinner, Taxi).');
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      setError('Please provide a valid total amount.');
      return;
    }
    if (selectedMembers.length === 0) {
      setError('Please select at least one participant.');
      return;
    }

    try {
      let finalSplitResult;
      if (splitMethod === 'equally') {
        finalSplitResult = splitEqually(amt, selectedMembers, paidBy);
      } else if (splitMethod === 'exact') {
        const list = selectedMembers.map((m) => ({ userId: m, amount: Number(exactShares[m] || 0) }));
        finalSplitResult = splitByExactAmounts(amt, list, paidBy);
      } else if (splitMethod === 'percentage') {
        const list = selectedMembers.map((m) => ({ userId: m, percentage: Number(percentages[m] || 0) }));
        finalSplitResult = splitByPercentage(amt, list, paidBy);
      } else if (splitMethod === 'shares') {
        const list = selectedMembers.map((m) => ({ userId: m, shares: Number(sharesWeights[m] || 1) }));
        finalSplitResult = splitByShares(amt, list, paidBy);
      }

      onSave({
        title: title.trim(),
        totalAmount: amt,
        currency: currencyConfig.code,
        paidBy,
        splitMethod,
        date,
        notes: notes.trim(),
        shares: finalSplitResult.shares
      });
    } catch (err) {
      setError(err.message || 'Failed to split expense.');
    }
  };

  const allParticipantOptions = [
    { id: currentUserId, name: 'You' },
    ...(friends || [])
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg rounded-3xl border border-subtle p-6 shadow-2xl overflow-y-auto max-h-[90vh]"
        style={{ backgroundColor: 'var(--bg-surface)' }}
      >
        <div className="flex items-center justify-between border-b border-subtle pb-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[var(--color-accent)]" />
            <h3 className="text-base font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
              Split An Expense
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-subtle p-1.5 text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-mono text-rose-500">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 font-mono text-xs">
          {/* Title & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                Description
              </label>
              <input
                type="text"
                placeholder="e.g. Dinner, Uber, Groceries"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-subtle px-3 py-2.5 font-mono text-xs focus:outline-none focus:border-[var(--color-accent)]"
                style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                required
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                Total Amount ({currencyConfig.symbol})
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                className="w-full rounded-xl border border-subtle px-3 py-2.5 font-mono text-xs font-bold focus:outline-none focus:border-[var(--color-accent)]"
                style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                required
              />
            </div>
          </div>

          {/* Date & Who Paid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-subtle px-3 py-2 text-xs"
                style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                Paid By
              </label>
              <select
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                className="w-full rounded-xl border border-subtle px-3 py-2 text-xs"
                style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
              >
                {allParticipantOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Select Participants */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Split With ({selectedMembers.length} selected)
            </label>
            <div className="flex flex-wrap gap-2">
              {allParticipantOptions.map((opt) => {
                const isSelected = selectedMembers.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleMember(opt.id)}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-mono transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent-subtle)] text-[var(--color-accent)] font-bold'
                        : 'border-subtle hover:border-[var(--text-secondary)] opacity-60'
                    }`}
                  >
                    {opt.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Split Method Picker */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Split Method
            </label>
            <div className="grid grid-cols-4 gap-1.5 rounded-xl border border-subtle p-1" style={{ backgroundColor: 'var(--bg-elevated)' }}>
              {['equally', 'exact', 'percentage', 'shares'].map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setSplitMethod(method)}
                  className={`rounded-lg py-1.5 text-[10px] uppercase font-bold cursor-pointer transition-all ${
                    splitMethod === method
                      ? 'bg-[var(--color-accent)] text-white shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          {/* Method-specific breakdown fields */}
          {splitMethod === 'exact' && (
            <div className="space-y-2 p-3 rounded-2xl border border-subtle" style={{ backgroundColor: 'var(--bg-elevated)' }}>
              <span className="text-[10px] uppercase tracking-wider block font-bold" style={{ color: 'var(--text-secondary)' }}>
                Specify Exact Amounts
              </span>
              {selectedMembers.map((mId) => {
                const name = mId === currentUserId ? 'You' : friends.find((f) => f.id === mId)?.name || 'Friend';
                return (
                  <div key={mId} className="flex items-center justify-between gap-2">
                    <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{name}</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={exactShares[mId] || ''}
                      onChange={(e) => setExactShares({ ...exactShares, [mId]: e.target.value })}
                      className="w-24 rounded-lg border border-subtle px-2 py-1 text-right text-xs font-bold"
                      style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {splitMethod === 'percentage' && (
            <div className="space-y-2 p-3 rounded-2xl border border-subtle" style={{ backgroundColor: 'var(--bg-elevated)' }}>
              <span className="text-[10px] uppercase tracking-wider block font-bold" style={{ color: 'var(--text-secondary)' }}>
                Specify Percentages (Must sum to 100%)
              </span>
              {selectedMembers.map((mId) => {
                const name = mId === currentUserId ? 'You' : friends.find((f) => f.id === mId)?.name || 'Friend';
                return (
                  <div key={mId} className="flex items-center justify-between gap-2">
                    <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{name}</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="1"
                        placeholder="0"
                        value={percentages[mId] || ''}
                        onChange={(e) => setPercentages({ ...percentages, [mId]: e.target.value })}
                        className="w-16 rounded-lg border border-subtle px-2 py-1 text-right text-xs font-bold"
                        style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                      />
                      <span style={{ color: 'var(--text-muted)' }}>%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {splitMethod === 'shares' && (
            <div className="space-y-2 p-3 rounded-2xl border border-subtle" style={{ backgroundColor: 'var(--bg-elevated)' }}>
              <span className="text-[10px] uppercase tracking-wider block font-bold" style={{ color: 'var(--text-secondary)' }}>
                Specify Proportional Shares (e.g. 1 share, 2 shares)
              </span>
              {selectedMembers.map((mId) => {
                const name = mId === currentUserId ? 'You' : friends.find((f) => f.id === mId)?.name || 'Friend';
                return (
                  <div key={mId} className="flex items-center justify-between gap-2">
                    <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{name}</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="1"
                        value={sharesWeights[mId] || ''}
                        onChange={(e) => setSharesWeights({ ...sharesWeights, [mId]: e.target.value })}
                        className="w-16 rounded-lg border border-subtle px-2 py-1 text-right text-xs font-bold"
                        style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                      />
                      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>share(s)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Animated Money Distribution Preview */}
          {calculatedShares.length > 0 && (
            <div className="rounded-2xl border border-subtle p-3 space-y-1.5" style={{ backgroundColor: 'var(--bg-elevated)' }}>
              <span className="text-[10px] uppercase tracking-widest text-[var(--color-accent)] font-bold block">
                Calculated Distribution
              </span>
              <div className="space-y-1">
                {calculatedShares.map((share) => {
                  const name = share.userId === currentUserId ? 'You' : friends.find((f) => f.id === share.userId)?.name || 'Friend';
                  return (
                    <div key={share.userId} className="flex items-center justify-between text-[11px]">
                      <span style={{ color: 'var(--text-primary)' }}>{name} {share.isPayer && '(Payer)'}</span>
                      <span className="font-bold font-tabular text-[var(--color-accent)]">
                        {currencyConfig.symbol}{share.shareAmount}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <input
              type="text"
              placeholder="Optional notes or receipt memo"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-subtle px-3 py-2 text-xs"
              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-subtle px-4 py-2 text-xs font-mono cursor-pointer"
              style={{ color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl px-5 py-2 text-xs font-mono font-bold cursor-pointer text-white shadow-md transition-transform hover:scale-105"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              Save Split Expense
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------- */
/* SUBCOMPONENT: Settle Debt Modal (Full & Partial)              */
/* ------------------------------------------------------------- */
function SettleDebtModal({ target, currencyConfig, formatAppMoney, onClose, onConfirm }) {
  const [settleAmount, setSettleAmount] = useState(String(target.amount));
  const [notes, setNotes] = useState('');

  const numSettle = parseFloat(settleAmount);
  const remaining = Math.max(0, target.amount - (isNaN(numSettle) ? 0 : numSettle));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-sm rounded-3xl border border-subtle p-6 shadow-2xl"
        style={{ backgroundColor: 'var(--bg-surface)' }}
      >
        <div className="flex items-center justify-between border-b border-subtle pb-3">
          <h3 className="text-sm font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
            Record Settlement
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-subtle p-1 text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4 font-mono text-xs">
          <div className="p-3.5 rounded-2xl border border-subtle text-center" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <span className="text-[10px] uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
              Outstanding Balance with {target.friend.name}
            </span>
            <span className="text-2xl font-extrabold font-tabular mt-1 block" style={{ color: 'var(--text-primary)' }}>
              {formatAppMoney(target.amount)}
            </span>
            <span className="text-[10px] block mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {target.direction === 'they_owe_you' ? 'Owed to you' : 'You owe them'}
            </span>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
              Settlement Amount ({currencyConfig.symbol})
            </label>
            <input
              type="number"
              step="0.01"
              max={target.amount}
              min="0.01"
              value={settleAmount}
              onChange={(e) => setSettleAmount(e.target.value)}
              className="w-full rounded-xl border border-subtle px-3 py-2 text-sm font-bold font-tabular"
              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
            />
            {remaining > 0 && (
              <span className="text-[11px] text-amber-500 mt-1 block">
                Partial Settlement: {formatAppMoney(remaining)} will remain outstanding.
              </span>
            )}
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
              Payment Method / Note
            </label>
            <input
              type="text"
              placeholder="e.g. Paid via UPI, Cash at dinner"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-subtle px-3 py-2 text-xs"
              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-subtle px-3 py-2 text-xs font-mono cursor-pointer"
              style={{ color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(numSettle, notes)}
              className="rounded-xl px-4 py-2 text-xs font-mono font-bold cursor-pointer text-white shadow-md transition-transform hover:scale-105"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              Confirm Settlement
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------- */
/* SUBCOMPONENT: Add Friend Modal (Multi-User Search & Manual)   */
/* ------------------------------------------------------------- */
function AddFriendModal({ onClose, onAdd, onSearchUsers, onSendRequest }) {
  const [tab, setTab] = useState(onSearchUsers ? 'search' : 'manual'); // 'search' | 'manual'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [sentUserIds, setSentUserIds] = useState(new Set());

  // Manual Contact state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [color, setColor] = useState('#10b981');
  const colorOptions = ['#10b981', '#0284c7', '#6366f1', '#f43f5e', '#f59e0b', '#8b5cf6'];

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    const q = searchQuery.trim();
    if (!q || !onSearchUsers) return;
    setIsSearching(true);
    setSearchError(null);
    try {
      const res = await onSearchUsers(q);
      if (res?.users) {
        setSearchResults(res.users);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      setSearchError(err.message || 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequest = async (targetUserId) => {
    if (!onSendRequest) return;
    try {
      await onSendRequest(targetUserId);
      setSentUserIds((prev) => new Set([...prev, targetUserId]));
    } catch (err) {
      setSearchError(err.message || 'Failed to send friend request');
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({
      name: name.trim(),
      email: email.trim(),
      color,
      avatar: name.trim()[0].toUpperCase()
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md rounded-3xl border border-subtle p-6 shadow-2xl space-y-4"
        style={{ backgroundColor: 'var(--bg-surface)' }}
      >
        <div className="flex items-center justify-between border-b border-subtle pb-3">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-[var(--color-accent)]" />
            <h3 className="text-sm font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
              Add Friend
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-subtle p-1 text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl border border-subtle bg-[var(--bg-elevated)]">
          <button
            type="button"
            onClick={() => setTab('search')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-mono font-bold cursor-pointer transition-all ${
              tab === 'search'
                ? 'bg-[var(--bg-surface)] text-[var(--color-accent)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Find SpendWise User
          </button>
          <button
            type="button"
            onClick={() => setTab('manual')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-mono font-bold cursor-pointer transition-all ${
              tab === 'manual'
                ? 'bg-[var(--bg-surface)] text-[var(--color-accent)] shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Manual Contact
          </button>
        </div>

        {/* TAB 1: Search Registered Cloud Users */}
        {tab === 'search' && (
          <div className="space-y-4 font-mono text-xs">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-subtle pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-[var(--color-accent)]"
                  style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                />
              </div>
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-white cursor-pointer disabled:opacity-50 transition-colors"
                style={{ backgroundColor: 'var(--color-accent)' }}
              >
                {isSearching ? '...' : 'Search'}
              </button>
            </form>

            {searchError && (
              <p className="text-[11px] text-rose-500">{searchError}</p>
            )}

            {/* Results list */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {searchResults.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-subtle rounded-2xl">
                  <p className="text-[11px] text-zinc-400">
                    {searchQuery.trim()
                      ? 'No registered users found matching that name or email.'
                      : 'Search for other registered SpendWise users to send a real friendship request.'}
                  </p>
                </div>
              ) : (
                searchResults.map((u) => {
                  const isSent = sentUserIds.has(u.id);
                  return (
                    <div
                      key={u.id}
                      className="flex items-center justify-between p-3 rounded-2xl border border-subtle"
                      style={{ backgroundColor: 'var(--bg-elevated)' }}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-bold text-xs">
                          {u.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <h4 className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>
                            {u.name}
                          </h4>
                          <span className="text-[10px] text-zinc-400 block">{u.email}</span>
                        </div>
                      </div>

                      {isSent ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-500">
                          <Check className="h-3.5 w-3.5" /> Sent
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSendRequest(u.id)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-xs cursor-pointer hover:scale-105 transition-transform"
                          style={{ backgroundColor: 'var(--color-accent)' }}
                        >
                          <Send className="h-3 w-3 inline mr-1" />
                          Connect
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Manual Local Contact */}
        {tab === 'manual' && (
          <form onSubmit={handleManualSubmit} className="space-y-4 font-mono text-xs">
            <div>
              <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                Friend Name
              </label>
              <input
                type="text"
                placeholder="e.g. Rahul, Tanya"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-subtle px-3 py-2 text-xs"
                style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
                required
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                Email / Identifier (Optional)
              </label>
              <input
                type="email"
                placeholder="rahul@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-subtle px-3 py-2 text-xs"
                style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
                Avatar Color Tag
              </label>
              <div className="flex gap-2">
                {colorOptions.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`h-7 w-7 rounded-full cursor-pointer transition-transform ${
                      color === c ? 'ring-2 ring-white scale-110' : 'opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-subtle px-3 py-2 text-xs font-mono cursor-pointer"
                style={{ color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl px-4 py-2 text-xs font-mono font-bold cursor-pointer text-white shadow-md transition-transform hover:scale-105"
                style={{ backgroundColor: 'var(--color-accent)' }}
              >
                Add Friend
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------- */
/* SUBCOMPONENT: Create Group Modal (Account-Aware Multi-User)   */
/* ------------------------------------------------------------- */
function CreateGroupModal({ friends, currentUserId, currentUser, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🏖️');
  const [selectedFriends, setSelectedFriends] = useState(friends.slice(0, 3).map((f) => f.id));

  const emojiOptions = ['🏖️', '✈️', '🍕', '🏠', '🎬', '☕', '⚽', '🚗'];

  const toggleFriend = (id) => {
    if (selectedFriends.includes(id)) {
      setSelectedFriends(selectedFriends.filter((f) => f !== id));
    } else {
      setSelectedFriends([...selectedFriends, id]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const selfId = currentUserId || 'user-self';
    const members = [
      {
        userId: selfId,
        name: currentUser?.name || 'You',
        email: currentUser?.email || null,
        role: 'ADMIN'
      },
      ...selectedFriends.map((fId) => {
        const f = friends.find((x) => x.id === fId);
        return {
          userId: f?.friendUserId || f?.id || fId,
          name: f?.name || 'Friend',
          email: f?.email || null,
          role: 'MEMBER'
        };
      })
    ];

    onCreate({
      name: name.trim(),
      emoji,
      members,
      memberIds: [selfId, ...selectedFriends]
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-sm rounded-3xl border border-subtle p-6 shadow-2xl"
        style={{ backgroundColor: 'var(--bg-surface)' }}
      >
        <div className="flex items-center justify-between border-b border-subtle pb-3">
          <div className="flex items-center gap-2">
            <FolderPlus className="h-4 w-4 text-[var(--color-accent)]" />
            <h3 className="text-sm font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
              Create Shared Group
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-subtle p-1 text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 font-mono text-xs">
          <div>
            <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
              Group Name
            </label>
            <input
              type="text"
              placeholder="e.g. Goa Trip, Flatmates"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-subtle px-3 py-2 text-xs"
              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
              required
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
              Group Icon
            </label>
            <div className="flex gap-2">
              {emojiOptions.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setEmoji(em)}
                  className={`h-8 w-8 rounded-xl border text-base flex items-center justify-center cursor-pointer transition-transform ${
                    emoji === em ? 'border-[var(--color-accent)] bg-[var(--color-accent-subtle)] scale-110' : 'border-subtle'
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
              Add Members ({selectedFriends.length + 1})
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
              <span className="rounded-lg border border-[var(--color-accent)] bg-[var(--color-accent-subtle)] text-[var(--color-accent)] px-2 py-1 text-[11px] font-bold">
                You (Admin)
              </span>
              {friends.map((f) => {
                const isSelected = selectedFriends.includes(f.id);
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => toggleFriend(f.id)}
                    className={`rounded-lg border px-2 py-1 text-[11px] cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-[var(--color-accent)] text-[var(--color-accent)] font-bold'
                        : 'border-subtle opacity-60'
                    }`}
                  >
                    {f.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-subtle px-3 py-2 text-xs font-mono cursor-pointer"
              style={{ color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl px-4 py-2 text-xs font-mono font-bold cursor-pointer text-white shadow-md transition-transform hover:scale-105"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              Create Group
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------- */
/* SUBCOMPONENT: Join Group via Code Modal                       */
/* ------------------------------------------------------------- */
function JoinGroupModal({ onClose, onJoin }) {
  const [code, setCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (!clean) return;
    setIsJoining(true);
    setError(null);
    try {
      await onJoin(clean);
    } catch (err) {
      setError(err.message || 'Failed to join group. Please verify the invite code.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-sm rounded-3xl border border-subtle p-6 shadow-2xl space-y-4"
        style={{ backgroundColor: 'var(--bg-surface)' }}
      >
        <div className="flex items-center justify-between border-b border-subtle pb-3">
          <div className="flex items-center gap-2">
            <LogIn className="h-4 w-4 text-emerald-500" />
            <h3 className="text-sm font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
              Join Group via Code
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-subtle p-1 text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
          <div>
            <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
              8-Character Group Invite Code
            </label>
            <input
              type="text"
              maxLength={12}
              placeholder="e.g. A9B2C8D1"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full rounded-xl border border-subtle px-3 py-2.5 text-center text-sm font-bold tracking-widest focus:outline-none focus:border-emerald-500 uppercase"
              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
              required
              autoFocus
            />
            <p className="text-[10px] text-zinc-400 mt-1">
              Ask your group creator or friend for the group's invite code.
            </p>
          </div>

          {error && (
            <p className="text-[11px] text-rose-500">{error}</p>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-subtle px-3 py-2 text-xs font-mono cursor-pointer"
              style={{ color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isJoining || code.trim().length < 4}
              className="rounded-xl px-4 py-2 text-xs font-mono font-bold cursor-pointer text-white shadow-md bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 transition-transform hover:scale-105"
            >
              {isJoining ? 'Joining...' : 'Join Group'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------- */
/* SUBCOMPONENT: Share Group Modal (Invite Code, Link, Social)   */
/* ------------------------------------------------------------- */
function ShareGroupModal({ group, onClose }) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const inviteCode = group.inviteCode || 'SPENDWISE';
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/splits?join=${inviteCode}`
    : `https://spendwise.app/splits?join=${inviteCode}`;

  const shareText = `Join my SpendWise shared group "${group.name}"! Use code ${inviteCode} or open: ${shareUrl}`;

  const handleCopyCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${group.name} on SpendWise`,
          text: shareText,
          url: shareUrl,
        });
      } catch {
        // User cancelled or share failed
      }
    }
  };

  const handleWhatsApp = () => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-sm rounded-3xl border border-subtle p-6 shadow-2xl space-y-5 font-mono text-xs"
        style={{ backgroundColor: 'var(--bg-surface)' }}
      >
        <div className="flex items-center justify-between border-b border-subtle pb-3">
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-[var(--color-accent)]" />
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              Share Group
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-subtle p-1 text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Group info header */}
        <div className="flex items-center gap-3 p-3 rounded-2xl border border-subtle" style={{ backgroundColor: 'var(--bg-elevated)' }}>
          <span className="text-2xl">{group.emoji || '👥'}</span>
          <div>
            <h4 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
              {group.name}
            </h4>
            <span className="text-[10px] text-zinc-400">Collaborative shared ledger</span>
          </div>
        </div>

        {/* Invite Code Box */}
        <div className="space-y-1.5">
          <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-bold">
            Group Invite Code
          </label>
          <div className="flex items-center justify-between p-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5">
            <span className="text-lg font-extrabold tracking-widest text-emerald-500">
              {inviteCode}
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 text-white cursor-pointer hover:bg-emerald-600 transition-colors"
            >
              {copiedCode ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
            </button>
          </div>
        </div>

        {/* Invite URL Box */}
        <div className="space-y-1.5">
          <label className="block text-[10px] uppercase tracking-wider text-zinc-400 font-bold">
            Direct Share Link
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 rounded-xl border border-subtle px-3 py-2 text-[11px] truncate text-zinc-400"
              style={{ backgroundColor: 'var(--bg-elevated)' }}
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-2 rounded-xl text-xs font-bold border border-subtle hover:border-[var(--color-accent)] cursor-pointer transition-colors shrink-0"
              style={{ color: 'var(--text-primary)' }}
            >
              {copiedLink ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>

        {/* Social Share Buttons */}
        <div className="pt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={handleWhatsApp}
            className="flex-1 py-2.5 rounded-2xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer transition-colors text-center"
          >
            Share on WhatsApp
          </button>
          {typeof navigator !== 'undefined' && navigator.share && (
            <button
              type="button"
              onClick={handleWebShare}
              className="px-3.5 py-2.5 rounded-2xl font-bold text-xs border border-subtle hover:border-[var(--color-accent)] cursor-pointer transition-colors"
              style={{ color: 'var(--text-primary)' }}
            >
              <Share2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------- */
/* SUBCOMPONENT: Group Ledger Modal (Shared Balances & Debts)    */
/* ------------------------------------------------------------- */
function GroupLedgerModal({
  group,
  splitExpenses,
  settlements,
  friends,
  currentUserId,
  currentUser,
  formatAppMoney,
  currencyConfig,
  onClose,
  onShare,
  onAddExpense,
  onSettle
}) {
  const groupExpenses = useMemo(() => {
    return splitExpenses.filter((s) => s.groupId === group.id);
  }, [splitExpenses, group.id]);

  const groupSettlements = useMemo(() => {
    return settlements.filter(
      (st) => st.groupId === group.id || (st.expenseId && groupExpenses.some((ge) => ge.id === st.expenseId))
    );
  }, [settlements, group.id, groupExpenses]);

  const totalSpending = useMemo(() => {
    return groupExpenses.reduce((sum, e) => sum + (Number(e.totalAmount) || 0), 0);
  }, [groupExpenses]);

  // Extract all members
  const membersList = useMemo(() => {
    if (Array.isArray(group.members) && group.members.length > 0) {
      return group.members.map((m) => ({
        id: m.userId || m.id,
        userId: m.userId || m.id,
        name: m.user?.name || m.name || (m.userId === currentUserId ? 'You' : 'Member'),
        email: m.user?.email || m.email || null,
        role: m.role || 'MEMBER',
      }));
    }
    return (group.memberIds || []).map((mId) => {
      const f = friends.find((x) => x.id === mId || x.friendUserId === mId);
      return {
        id: mId,
        userId: mId,
        name: mId === currentUserId ? 'You' : f?.name || 'Member',
        email: f?.email || null,
        role: 'MEMBER'
      };
    });
  }, [group, currentUserId, friends]);

  // Compute per-member paid and share
  const memberBalances = useMemo(() => {
    const stats = {};
    membersList.forEach((m) => {
      stats[m.userId] = { ...m, paid: 0, share: 0, net: 0 };
    });

    groupExpenses.forEach((exp) => {
      const payerId = exp.paidById || exp.paidBy;
      if (stats[payerId]) {
        stats[payerId].paid += Number(exp.totalAmount) || 0;
      }
      const parts = exp.participants || exp.shares || [];
      parts.forEach((p) => {
        const pId = p.participantId || p.userId;
        if (stats[pId]) {
          stats[pId].share += Number(p.shareAmount || p.amount) || 0;
        }
      });
    });

    // Factor in settlements
    groupSettlements.forEach((st) => {
      if (stats[st.fromId]) {
        stats[st.fromId].paid += Number(st.amount) || 0;
      }
      if (stats[st.toId]) {
        stats[st.toId].share += Number(st.amount) || 0;
      }
    });

    Object.values(stats).forEach((s) => {
      s.net = s.paid - s.share;
    });

    return Object.values(stats);
  }, [membersList, groupExpenses, groupSettlements]);

  // Compute pairwise simplified debts for this group
  const groupDebts = useMemo(() => {
    const raw = [];
    groupExpenses.forEach((exp) => {
      const payer = exp.paidById || exp.paidBy;
      const parts = exp.participants || exp.shares || [];
      parts.forEach((p) => {
        const pId = p.participantId || p.userId;
        const amt = Number(p.shareAmount || p.amount) || 0;
        if (pId !== payer && amt > 0) {
          raw.push({
            from: pId,
            fromId: pId,
            fromName: p.participantName || p.name || 'Member',
            to: payer,
            toId: payer,
            toName: exp.payerName || 'Member',
            amount: amt
          });
        }
      });
    });

    if (raw.length === 0) return [];
    return simplifyDebts(raw);
  }, [groupExpenses]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl rounded-3xl border border-subtle p-6 shadow-2xl overflow-y-auto max-h-[90vh] space-y-6 font-mono text-xs"
        style={{ backgroundColor: 'var(--bg-surface)' }}
      >
        {/* Header with Group info & Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-subtle pb-4 gap-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2.5 rounded-2xl bg-zinc-900/10 border border-subtle">
              {group.emoji || '👥'}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold" style={{ color: 'var(--text-primary)' }}>
                  {group.name}
                </h3>
                {group.inviteCode && (
                  <span className="px-2 py-0.5 rounded-md border border-subtle text-[10px] text-emerald-500 font-bold uppercase">
                    {group.inviteCode}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {membersList.length} members · {groupExpenses.length} shared bill{groupExpenses.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onShare}
              className="inline-flex items-center gap-1.5 rounded-xl border border-subtle px-3 py-2 text-xs font-bold hover:border-[var(--color-accent)] transition-colors cursor-pointer"
              style={{ color: 'var(--text-primary)' }}
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>Share</span>
            </button>
            <button
              type="button"
              onClick={onAddExpense}
              className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold text-white shadow-xs cursor-pointer hover:scale-105 transition-transform"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Bill</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-subtle p-2 text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Top Spending Summary Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl border border-subtle" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <span className="text-[10px] uppercase tracking-wider block text-zinc-400 font-bold">
              Total Group Spending
            </span>
            <span className="text-2xl font-extrabold font-tabular text-[var(--color-accent)] mt-1 block">
              {formatAppMoney(totalSpending)}
            </span>
            <span className="text-[10px] text-zinc-400 mt-0.5 block">
              Across {groupExpenses.length} recorded expense{groupExpenses.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="p-4 rounded-2xl border border-subtle" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <span className="text-[10px] uppercase tracking-wider block text-zinc-400 font-bold">
              Active Debt Minimization
            </span>
            <span className="text-2xl font-extrabold font-tabular text-emerald-500 mt-1 block">
              {groupDebts.length} Peer Transfer{groupDebts.length === 1 ? '' : 's'}
            </span>
            <span className="text-[10px] text-zinc-400 mt-0.5 block">
              Deterministic pairwise balance simplification
            </span>
          </div>
        </div>

        {/* Group Member Balances Table */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Member Financial Positions
          </h4>
          <div className="rounded-2xl border border-subtle overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <div className="divide-y divide-subtle">
              {memberBalances.map((m) => {
                const isSelf = m.userId === currentUserId;
                return (
                  <div key={m.userId} className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-xl bg-zinc-800 border border-subtle flex items-center justify-center font-bold text-xs text-white">
                        {m.name?.[0]?.toUpperCase() || 'M'}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs" style={{ color: isSelf ? 'var(--color-accent)' : 'var(--text-primary)' }}>
                            {m.name} {isSelf && '(You)'}
                          </span>
                          {m.role === 'ADMIN' && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-900/40 text-amber-400 font-bold border border-amber-500/20">
                              ADMIN
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-400">
                          Paid {formatAppMoney(m.paid)} · Share {formatAppMoney(m.share)}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      {m.net > 0 ? (
                        <span className="text-xs font-extrabold font-tabular text-emerald-500 block">
                          +{formatAppMoney(m.net)}
                        </span>
                      ) : m.net < 0 ? (
                        <span className="text-xs font-extrabold font-tabular text-rose-500 block">
                          -{formatAppMoney(Math.abs(m.net))}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-zinc-400 block">
                          Settled
                        </span>
                      )}
                      <span className="text-[9px] text-zinc-500 uppercase">
                        {m.net > 0 ? 'Gets back' : m.net < 0 ? 'Owes' : 'Clean'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* WHO OWES WHOM (Pairwise simplified transfers) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Who Owes Whom (Simplified Transfers)
            </h4>
          </div>

          {groupDebts.length === 0 ? (
            <p className="p-4 rounded-2xl border border-subtle text-center text-xs text-zinc-400 italic" style={{ backgroundColor: 'var(--bg-elevated)' }}>
              All group balances are settled! No transfers needed.
            </p>
          ) : (
            <div className="space-y-2">
              {groupDebts.map((d, idx) => {
                const isUserDebtor = d.fromId === currentUserId;
                const isUserCreditor = d.toId === currentUserId;

                return (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl border border-subtle flex items-center justify-between"
                    style={{ backgroundColor: 'var(--bg-elevated)' }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs" style={{ color: isUserDebtor ? 'var(--color-accent)' : 'var(--text-primary)' }}>
                        {d.fromName} {isUserDebtor && '(You)'}
                      </span>
                      <span className="text-zinc-500">→</span>
                      <span className="font-bold text-xs" style={{ color: isUserCreditor ? 'var(--color-accent)' : 'var(--text-primary)' }}>
                        {d.toName} {isUserCreditor && '(You)'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-extrabold font-tabular text-[var(--color-accent)]">
                        {formatAppMoney(d.amount)}
                      </span>
                      {isUserDebtor && (
                        <button
                          type="button"
                          onClick={() => {
                            const friendObj = friends.find((f) => f.id === d.toId || f.friendUserId === d.toId) || {
                              id: d.toId,
                              name: d.toName
                            };
                            onSettle({
                              friend: friendObj,
                              amount: d.amount,
                              direction: 'you_owe_them'
                            });
                          }}
                          className="px-2.5 py-1 rounded-xl text-[11px] font-bold text-white bg-rose-500 hover:bg-rose-600 cursor-pointer shadow-xs"
                        >
                          Settle Now
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Group Split Expenses List */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Group Expenses History ({groupExpenses.length})
          </h4>
          {groupExpenses.length === 0 ? (
            <p className="p-3 rounded-xl border border-subtle text-center text-[11px] text-zinc-400 italic">
              No bills recorded for this group yet. Click "Add Bill" above.
            </p>
          ) : (
            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {groupExpenses.map((exp) => {
                const payer = membersList.find((m) => m.userId === (exp.paidById || exp.paidBy));
                return (
                  <div
                    key={exp.id}
                    className="p-3 rounded-xl border border-subtle flex items-center justify-between"
                    style={{ backgroundColor: 'var(--bg-elevated)' }}
                  >
                    <div>
                      <span className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>
                        {exp.title}
                      </span>
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        Paid by {payer?.name || exp.payerName || 'Someone'} · {exp.date}
                      </p>
                    </div>
                    <span className="text-xs font-bold font-tabular" style={{ color: 'var(--text-primary)' }}>
                      {formatAppMoney(exp.totalAmount)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------- */
/* SUBCOMPONENT: Friend Details Profile & Activity Modal (Req 4) */
/* ------------------------------------------------------------- */
function FriendDetailModal({
  friend,
  profile,
  formatAppMoney,
  onClose,
  onEdit,
  onRemove,
  onRestore,
  onSettle
}) {
  const net = profile?.netBalance || 0;
  const friendSinceDate = friend.createdAt
    ? new Date(friend.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Active member';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-xl rounded-3xl border border-subtle p-6 shadow-2xl overflow-y-auto max-h-[90vh] space-y-6 font-mono text-xs"
        style={{ backgroundColor: 'var(--bg-surface)' }}
      >
        {/* Header with Friend Avatar, Name & Status */}
        <div className="flex items-start justify-between border-b border-subtle pb-4">
          <div className="flex items-center gap-3.5">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl font-bold text-lg text-white shadow-md"
              style={{ backgroundColor: friend.color || '#10b981' }}
            >
              {friend.avatar || (friend.name ? friend.name[0].toUpperCase() : 'F')}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold" style={{ color: 'var(--text-primary)' }}>
                  {friend.name}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    friend.isArchived ? 'bg-zinc-500/10 text-zinc-400' : 'bg-emerald-500/10 text-emerald-500'
                  }`}
                >
                  ● {friend.isArchived ? 'ARCHIVED' : 'ACTIVE'}
                </span>
              </div>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {friend.email || 'Local Peer Contact'} · Friend since {friendSinceDate}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-subtle p-1.5 text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Bilateral Balance Graph (Req 33) */}
        <div className="rounded-2xl border border-subtle p-4 space-y-2 text-center" style={{ backgroundColor: 'var(--bg-elevated)' }}>
          <span className="text-[10px] uppercase tracking-wider block font-bold" style={{ color: 'var(--text-muted)' }}>
            Bilateral Balance Flow
          </span>
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex flex-col items-center gap-1">
              <div className="h-9 w-9 rounded-full bg-[var(--color-accent)] text-white font-bold flex items-center justify-center text-xs">
                YOU
              </div>
              <span className="text-[10px] text-zinc-400">You</span>
            </div>

            {/* Connecting directional indicator */}
            <div className="flex-1 mx-4 flex flex-col items-center">
              <span
                className={`text-sm font-extrabold font-tabular px-3 py-1 rounded-full border ${
                  net > 0
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
                    : net < 0
                    ? 'border-rose-500/30 bg-rose-500/10 text-rose-500'
                    : 'border-subtle text-zinc-400'
                }`}
              >
                {net > 0 ? `← ${friend.name} owes you ${formatAppMoney(net)}` : net < 0 ? `→ You owe ${friend.name} ${formatAppMoney(profile.youOweThem)}` : '✓ All settled up'}
              </span>
              <div className="w-full border-t border-dashed border-subtle mt-2" />
            </div>

            <div className="flex flex-col items-center gap-1">
              <div
                className="h-9 w-9 rounded-full text-white font-bold flex items-center justify-center text-xs"
                style={{ backgroundColor: friend.color || '#10b981' }}
              >
                {friend.avatar || friend.name[0]}
              </div>
              <span className="text-[10px] text-zinc-400">{friend.name}</span>
            </div>
          </div>
        </div>

        {/* 3 Metric Cards: You Owe, They Owe, Net (Req 4) */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-subtle p-3 text-center" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <span className="text-[9px] uppercase tracking-wider block font-bold" style={{ color: 'var(--text-muted)' }}>
              You Owe
            </span>
            <span className="text-base font-extrabold font-tabular text-rose-500 mt-1 block">
              {formatAppMoney(profile?.youOweThem || 0)}
            </span>
          </div>

          <div className="rounded-2xl border border-subtle p-3 text-center" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <span className="text-[9px] uppercase tracking-wider block font-bold" style={{ color: 'var(--text-muted)' }}>
              Owes You
            </span>
            <span className="text-base font-extrabold font-tabular text-emerald-500 mt-1 block">
              {formatAppMoney(profile?.theyOweYou || 0)}
            </span>
          </div>

          <div className="rounded-2xl border border-subtle p-3 text-center" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <span className="text-[9px] uppercase tracking-wider block font-bold" style={{ color: 'var(--text-muted)' }}>
              Net Position
            </span>
            <span
              className={`text-base font-extrabold font-tabular mt-1 block ${
                net > 0 ? 'text-emerald-500' : net < 0 ? 'text-rose-500' : 'text-zinc-400'
              }`}
            >
              {net > 0 ? `+${formatAppMoney(net)}` : formatAppMoney(net)}
            </span>
          </div>
        </div>

        {/* RECENT SHARED EXPENSES (Req 4) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Recent Shared Expenses ({profile?.sharedExpenses?.length || 0})
            </h4>
          </div>

          {(!profile?.sharedExpenses || profile.sharedExpenses.length === 0) ? (
            <p className="p-4 rounded-xl border border-subtle text-center text-[11px] text-zinc-400 italic">
              No shared expenses recorded with {friend.name} yet.
            </p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {profile.sharedExpenses.slice(0, 5).map((se) => (
                <div
                  key={se.expense.id}
                  className="rounded-xl border border-subtle p-3 flex items-center justify-between"
                  style={{ backgroundColor: 'var(--bg-elevated)' }}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
                        {se.expense.title}
                      </span>
                      <span className="text-[10px] text-zinc-400">· {se.date}</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      {se.isPayer ? 'You paid' : `${friend.name} paid`} · Total {formatAppMoney(se.totalAmount)}
                    </p>
                  </div>
                  <div className="text-right">
                    {se.isPayer ? (
                      <span className="text-xs font-bold font-tabular text-emerald-500 block">
                        {friend.name} owes {formatAppMoney(se.friendShare)}
                      </span>
                    ) : (
                      <span className="text-xs font-bold font-tabular text-rose-500 block">
                        You owe {formatAppMoney(se.userShare)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* BILATERAL ACTIVITY TIMELINE (Req 9) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Activity Timeline
            </h4>
          </div>

          {(!profile?.activityHistory || profile.activityHistory.length === 0) ? (
            <p className="p-3 rounded-xl border border-subtle text-center text-[11px] text-zinc-400 italic">
              No recorded activity.
            </p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {profile.activityHistory.slice(0, 5).map((act, i) => (
                <div key={i} className="flex items-start gap-2.5 text-[11px] py-1 border-b border-subtle last:border-0">
                  <Clock className="h-3.5 w-3.5 mt-0.5 text-zinc-400 shrink-0" />
                  <div className="flex-1">
                    <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
                      {act.title}
                    </span>
                    <p className="text-[10px] text-zinc-400">{act.description} · {act.date}</p>
                  </div>
                  {act.amount > 0 && (
                    <span className="font-bold font-tabular" style={{ color: 'var(--text-primary)' }}>
                      {formatAppMoney(act.amount)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons Footer (Req 4) */}
        <div className="pt-2 border-t border-subtle flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onEdit(friend)}
              className="rounded-xl border border-subtle px-3 py-2 text-xs font-mono font-semibold cursor-pointer hover:border-[var(--color-accent)] transition-colors"
              style={{ color: 'var(--text-primary)' }}
            >
              <Edit2 className="h-3.5 w-3.5 inline mr-1" />
              <span>Edit Friend</span>
            </button>

            {friend.isArchived ? (
              <button
                type="button"
                onClick={() => onRestore(friend.id)}
                className="rounded-xl border border-emerald-500/30 px-3 py-2 text-xs font-mono font-semibold text-emerald-500 hover:bg-emerald-500/10 cursor-pointer transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5 inline mr-1" />
                <span>Restore Friend</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onRemove(friend)}
                className="rounded-xl border border-rose-500/30 px-3 py-2 text-xs font-mono font-semibold text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors"
              >
                <Archive className="h-3.5 w-3.5 inline mr-1" />
                <span>Remove Friend</span>
              </button>
            )}
          </div>

          {net !== 0 && (
            <button
              type="button"
              onClick={() =>
                onSettle({
                  friend,
                  amount: Math.abs(net),
                  direction: net > 0 ? 'they_owe_you' : 'you_owe_them'
                })
              }
              className="rounded-xl px-4 py-2 text-xs font-mono font-bold text-white shadow-md cursor-pointer transition-transform hover:scale-105"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              <span>Settle Balance ({formatAppMoney(Math.abs(net))})</span>
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------- */
/* SUBCOMPONENT: Edit Friend Modal (Req 1, 2)                    */
/* ------------------------------------------------------------- */
function EditFriendModal({ friend, onClose, onSave }) {
  const [name, setName] = useState(friend.name || '');
  const [email, setEmail] = useState(friend.email || '');
  const [color, setColor] = useState(friend.color || '#10b981');

  const colorOptions = ['#10b981', '#0284c7', '#6366f1', '#f43f5e', '#f59e0b', '#8b5cf6'];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      email: email.trim(),
      color,
      avatar: name.trim()[0].toUpperCase()
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-sm rounded-3xl border border-subtle p-6 shadow-2xl"
        style={{ backgroundColor: 'var(--bg-surface)' }}
      >
        <div className="flex items-center justify-between border-b border-subtle pb-3">
          <h3 className="text-sm font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
            Edit Friend
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-subtle p-1 text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 font-mono text-xs">
          <div>
            <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
              Friend Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-subtle px-3 py-2 text-xs"
              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
              required
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
              Email / Identifier
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-subtle px-3 py-2 text-xs"
              style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-secondary)' }}>
              Avatar Color Tag
            </label>
            <div className="flex gap-2">
              {colorOptions.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full cursor-pointer transition-transform ${
                    color === c ? 'ring-2 ring-white scale-110' : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-subtle px-3 py-2 text-xs font-mono cursor-pointer"
              style={{ color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl px-4 py-2 text-xs font-mono font-bold cursor-pointer text-white shadow-md transition-transform hover:scale-105"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              Save Changes
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------- */
/* SUBCOMPONENT: Remove/Archive Friend Confirm Modal (Req 2, 36) */
/* ------------------------------------------------------------- */
function RemoveFriendConfirmModal({ friend, profile, formatAppMoney, onClose, onConfirm }) {
  const net = profile?.netBalance || 0;
  const hasHistory = (profile?.sharedExpensesCount || 0) > 0 || net !== 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-sm rounded-3xl border border-subtle p-6 shadow-2xl space-y-4 font-mono text-xs"
        style={{ backgroundColor: 'var(--bg-surface)' }}
      >
        <div className="flex items-center justify-between border-b border-subtle pb-3">
          <div className="flex items-center gap-2 text-rose-500">
            <AlertCircle className="h-5 w-5" />
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              Remove {friend.name}?
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-subtle p-1 text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Warning if unsettled balance exists (Req 36) */}
        {net !== 0 && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-1 text-amber-400">
            <span className="font-bold block uppercase text-[10px]">Unsettled Balance Warning</span>
            <p className="text-[11px]">
              {net > 0
                ? `${friend.name} still owes you ${formatAppMoney(net)}.`
                : `You still owe ${friend.name} ${formatAppMoney(profile.youOweThem)}.`}
            </p>
          </div>
        )}

        <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {hasHistory
            ? `Removing ${friend.name} will archive them from your active friends list. Their participation in historical split expenses and balance records will remain completely intact.`
            : `Are you sure you want to remove ${friend.name}? This friend has no historical expenses and will be removed.`}
        </p>

        <div className="pt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-subtle px-3 py-2 text-xs font-mono cursor-pointer"
            style={{ color: 'var(--text-secondary)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl px-4 py-2 text-xs font-mono font-bold cursor-pointer text-white shadow-md bg-rose-500 hover:bg-rose-600 transition-colors"
          >
            {hasHistory ? 'Archive Friend' : 'Remove Friend'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
