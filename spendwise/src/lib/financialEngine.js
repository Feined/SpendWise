/**
 * SpendWise Unified Financial Accounting & Relationship Engine
 * 
 * Mathematical domain engine that models:
 * 1. Cash Outflow vs True Personal Consumption (No double counting)
 * 2. Peer Receivables & Payables accounting
 * 3. Unified Financial Stream (Personal + Shared + Settlements)
 * 4. Pacing, Velocity, and Multi-Step Money Flow
 * 5. Dynamic Bilateral Friend Profiles
 */

import { toMinorUnits, toMajorUnits } from './splitEngine.js';
import { getDaysInMonth, getCurrentMonthKey } from './budget.js';

/**
 * Calculates exact accounting metrics for a single split expense relative to current user.
 * 
 * @param {object} splitExpense
 * @param {string} [currentUserId='user-self']
 * @returns {object}
 */
export function calculateSplitAccounting(splitExpense, currentUserId = 'user-self') {
  if (!splitExpense) {
    return {
      totalAmount: 0,
      paidById: '',
      isPayer: false,
      myShare: 0,
      amountPaidByMe: 0,
      amountOwedToMe: 0,
      amountIOwe: 0,
      netImpact: 0,
    };
  }

  const totalAmount = Number(splitExpense.totalAmount) || 0;
  const paidById = splitExpense.paidBy || splitExpense.paidById || '';
  const isPayer = paidById === currentUserId;
  const shares = Array.isArray(splitExpense.shares)
    ? splitExpense.shares
    : Array.isArray(splitExpense.participants)
    ? splitExpense.participants
    : [];

  const userShareObj = shares.find(
    (s) => (s.userId || s.participantId) === currentUserId
  );
  const myShare = userShareObj ? Number(userShareObj.shareAmount) || 0 : 0;

  const totalMinor = toMinorUnits(totalAmount);
  const myShareMinor = toMinorUnits(myShare);

  const amountPaidByMe = isPayer ? totalAmount : 0;
  const amountOwedToMe = isPayer ? toMajorUnits(Math.max(0, totalMinor - myShareMinor)) : 0;
  const amountIOwe = !isPayer ? myShare : 0;
  const netImpact = toMajorUnits((isPayer ? totalMinor : 0) - myShareMinor);

  return {
    totalAmount,
    paidById,
    isPayer,
    myShare,
    amountPaidByMe,
    amountOwedToMe,
    amountIOwe,
    netImpact,
  };
}

/**
 * Builds a unified, chronological financial activity timeline
 * combining personal transactions, shared split bills, and peer settlements.
 * 
 * @param {Array} transactions
 * @param {Array} splitExpenses
 * @param {Array} settlements
 * @param {string} [currentUserId='user-self']
 * @param {object} [friendMap={}]
 * @returns {Array<object>}
 */
export function buildUnifiedActivityTimeline(
  transactions = [],
  splitExpenses = [],
  settlements = [],
  currentUserId = 'user-self',
  friendMap = {}
) {
  const unifiedStream = [];

  // 1. Ingest Personal Transactions
  (Array.isArray(transactions) ? transactions : []).forEach((tx) => {
    const amt = Number(tx.amount) || 0;
    unifiedStream.push({
      id: tx.id || `tx-${Math.random()}`,
      streamType: 'personal',
      sourceType: 'personal',
      date: tx.date || new Date().toISOString().split('T')[0],
      timestamp: tx.createdAt || tx.date || new Date().toISOString(),
      title: tx.label || 'Personal Expense',
      category: tx.categoryId || 'other',
      categoryName: tx.categoryName || tx.categoryId || 'General',
      nature: tx.nature || 'need',
      planned: tx.planned !== false,
      amount: amt,
      personalCost: amt,
      cashOutflow: amt,
      moneyIn: 0,
      direction: 'out',
      status: 'settled',
      note: tx.note || '',
      notes: tx.note || '',
      raw: tx,
    });
  });

  // 2. Ingest Shared Split Expenses
  (Array.isArray(splitExpenses) ? splitExpenses : []).forEach((exp) => {
    const accounting = calculateSplitAccounting(exp, currentUserId);
    const payerName =
      friendMap[accounting.paidById]?.name ||
      exp.payerName ||
      (accounting.isPayer ? 'You' : 'Friend');

    const sharesList = Array.isArray(exp.shares)
      ? exp.shares
      : Array.isArray(exp.participants)
      ? exp.participants
      : [];

    unifiedStream.push({
      id: exp.id || `split-${Math.random()}`,
      streamType: 'split',
      sourceType: 'shared',
      date: exp.date || new Date().toISOString().split('T')[0],
      timestamp: exp.createdAt || exp.date || new Date().toISOString(),
      title: exp.title || 'Shared Expense',
      category: exp.categoryId || 'food',
      categoryName: exp.categoryName || exp.categoryId || 'Shared',
      amount: accounting.totalAmount,
      totalAmount: accounting.totalAmount,
      paidById: accounting.paidById,
      payerName,
      isPayer: accounting.isPayer,
      myShare: accounting.myShare,
      personalCost: accounting.myShare,
      cashOutflow: accounting.amountPaidByMe,
      moneyIn: 0,
      receivable: accounting.amountOwedToMe,
      payable: accounting.amountIOwe,
      direction: accounting.isPayer ? 'out' : accounting.myShare > 0 ? 'out' : 'neutral',
      status: accounting.amountOwedToMe > 0 || accounting.amountIOwe > 0 ? 'pending' : 'settled',
      participantsCount: sharesList.length,
      shares: sharesList,
      note: exp.notes || '',
      notes: exp.notes || '',
      details: {
        isPayer: accounting.isPayer,
        payerName,
        myShare: accounting.myShare,
        owedToMe: accounting.amountOwedToMe,
        iOwe: accounting.amountIOwe,
        participantsCount: sharesList.length,
        shares: sharesList,
        totalAmount: accounting.totalAmount,
      },
      raw: exp,
    });
  });

  // 3. Ingest Settlements
  (Array.isArray(settlements) ? settlements : []).forEach((s) => {
    const amt = Number(s.amount) || 0;
    const fromId = s.fromId || s.fromUserId || '';
    const toId = s.toId || s.toUserId || '';
    const isPayer = fromId === currentUserId;
    const isReceiver = toId === currentUserId;

    if (!isPayer && !isReceiver) return; // Settlement doesn't involve current user

    const direction = isReceiver ? 'in' : 'out';
    const counterpartId = isReceiver ? fromId : toId;
    const counterpartName =
      friendMap[counterpartId]?.name ||
      (isReceiver ? s.fromName : s.toName) ||
      'Friend';

    const title =
      direction === 'in'
        ? `Settlement from ${counterpartName}`
        : `Settlement to ${counterpartName}`;

    unifiedStream.push({
      id: s.id || `settle-${Math.random()}`,
      streamType: 'settlement',
      sourceType: 'settlement',
      date: s.settledAt
        ? s.settledAt.split('T')[0]
        : s.date || new Date().toISOString().split('T')[0],
      timestamp: s.settledAt || s.createdAt || new Date().toISOString(),
      title,
      category: 'transfer',
      categoryName: 'Settlement',
      amount: amt,
      totalAmount: amt,
      personalCost: 0, // Settlements settle debt assets/liabilities, zero new personal consumption
      cashOutflow: direction === 'out' ? amt : 0,
      moneyIn: direction === 'in' ? amt : 0,
      direction,
      counterpartId,
      counterpartName,
      status: 'settled',
      note: s.notes || s.note || '',
      notes: s.notes || s.note || '',
      details: {
        isReceived: isReceiver,
        isPayer,
        counterpartId,
        counterpartName,
        amount: amt,
      },
      raw: s,
    });
  });

  // Sort descending by date, then timestamp
  return unifiedStream.sort((a, b) => {
    if (b.date !== a.date) {
      return b.date.localeCompare(a.date);
    }
    return (b.timestamp || '').localeCompare(a.timestamp || '');
  });
}


/**
 * Calculates spending velocity and safe pace for a given budget and spend.
 * 
 * @param {number} spentAmount
 * @param {number} totalBudget
 * @param {string} [monthKey]
 * @returns {object}
 */
export function calculateSpendingVelocity(spentAmount, totalBudget, monthKey) {
  const targetMonth = monthKey || getCurrentMonthKey();
  const daysInMonth = getDaysInMonth(targetMonth);
  const today = new Date();
  const currentKey = getCurrentMonthKey(today);

  let daysElapsed = today.getDate();
  if (targetMonth < currentKey) {
    daysElapsed = daysInMonth;
  } else if (targetMonth > currentKey) {
    daysElapsed = 1;
  }

  const daysRemaining = Math.max(1, daysInMonth - daysElapsed + 1);
  const spent = Math.max(0, Number(spentAmount) || 0);
  const budget = Math.max(0, Number(totalBudget) || 0);
  const remainingBudget = budget - spent;

  const currentDailyPace = Math.round(spent / Math.max(1, daysElapsed));
  const safeDailyPace =
    remainingBudget > 0
      ? Math.floor((remainingBudget / daysRemaining) * 100) / 100
      : 0;

  let status = 'ON_TRACK';
  if (remainingBudget < 0 || (budget <= 0 && spent > 0)) {
    status = 'CRITICAL';
  } else if (budget > 0) {
    const expectedPace = (budget / daysInMonth) * daysElapsed;
    if (spent > expectedPace * 1.25) {
      status = 'CRITICAL';
    } else if (spent > expectedPace) {
      status = 'WATCH';
    }
  }

  return {
    daysInMonth,
    daysElapsed,
    daysRemaining,
    dayOfMonth: daysElapsed,
    currentDailyPace,
    currentPace: currentDailyPace,
    safeDailyPace,
    safeDailyLimit: safeDailyPace,
    status,
  };
}

/**
 * Computes a unified financial summary for a given monthKey.
 * Handles the separation between cash outflow and true personal consumption.
 * 
 * @param {string} monthKey 'YYYY-MM'
 * @param {Array} transactions
 * @param {Array} splitExpenses
 * @param {Array} settlements
 * @param {object|null} monthPlan
 * @param {string} [currentUserId='user-self']
 * @returns {object}
 */
export function getUnifiedFinancialSummary(
  monthKey,
  transactions = [],
  splitExpenses = [],
  settlements = [],
  monthPlan = null,
  currentUserId = 'user-self'
) {
  const targetMonth = monthKey || getCurrentMonthKey();

  // 1. Personal variable transactions in monthKey
  const monthTransactions = (Array.isArray(transactions) ? transactions : []).filter(
    (t) => (t.date && t.date.startsWith(targetMonth)) || t.monthKey === targetMonth
  );

  let personalSpendingMinor = 0;
  const categoryTotals = {};

  monthTransactions.forEach((t) => {
    const amt = Number(t.amount) || 0;
    if (amt > 0) {
      personalSpendingMinor += toMinorUnits(amt);
      const cat = t.categoryId || 'other';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
    }
  });

  // 2. Shared split expenses in monthKey
  const monthSplits = (Array.isArray(splitExpenses) ? splitExpenses : []).filter(
    (s) => s.date && s.date.startsWith(targetMonth)
  );

  let sharedCashOutflowMinor = 0;
  let mySharedCostMinor = 0;

  monthSplits.forEach((exp) => {
    const acct = calculateSplitAccounting(exp, currentUserId);
    if (acct.isPayer) {
      sharedCashOutflowMinor += toMinorUnits(acct.totalAmount);
    }
    mySharedCostMinor += toMinorUnits(acct.myShare);

    if (acct.myShare > 0) {
      const cat = exp.categoryId || 'food';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + acct.myShare;
    }
  });

  // 3. Global Peer Receivables and Payables (Across all active splits & settlements)
  const peerNetMinor = {};

  (Array.isArray(splitExpenses) ? splitExpenses : []).forEach((exp) => {
    const payer = exp.paidBy || exp.paidById;
    const shares = Array.isArray(exp.shares)
      ? exp.shares
      : Array.isArray(exp.participants)
      ? exp.participants
      : [];

    shares.forEach((s) => {
      const partId = s.userId || s.participantId;
      const sMinor = toMinorUnits(s.shareAmount);

      if (payer === currentUserId && partId !== currentUserId) {
        peerNetMinor[partId] = (peerNetMinor[partId] || 0) + sMinor;
      } else if (payer !== currentUserId && partId === currentUserId) {
        peerNetMinor[payer] = (peerNetMinor[payer] || 0) - sMinor;
      }
    });
  });

  // Account for settlements
  let settlementsReceivedInMonthMinor = 0;
  let settlementsPaidInMonthMinor = 0;

  (Array.isArray(settlements) ? settlements : []).forEach((s) => {
    const sMinor = toMinorUnits(s.amount);
    const fromId = s.fromId || s.fromUserId;
    const toId = s.toId || s.toUserId;
    const sDate = s.settledAt ? s.settledAt.split('T')[0] : s.date || '';

    if (fromId === currentUserId) {
      // User paid other user
      peerNetMinor[toId] = (peerNetMinor[toId] || 0) + sMinor;
      if (sDate.startsWith(targetMonth)) {
        settlementsPaidInMonthMinor += sMinor;
      }
    } else if (toId === currentUserId) {
      // Other user paid user
      peerNetMinor[fromId] = (peerNetMinor[fromId] || 0) - sMinor;
      if (sDate.startsWith(targetMonth)) {
        settlementsReceivedInMonthMinor += sMinor;
      }
    }
  });

  let totalReceivablesMinor = 0;
  let totalPayablesMinor = 0;

  Object.values(peerNetMinor).forEach((balMinor) => {
    if (balMinor > 0) {
      totalReceivablesMinor += balMinor;
    } else if (balMinor < 0) {
      totalPayablesMinor += Math.abs(balMinor);
    }
  });

  // 4. Budget math based on monthPlan
  const estimatedIncome = Math.max(0, Number(monthPlan?.estimatedIncome) || 0);
  const actualIncome = Math.max(0, Number(monthPlan?.actualIncome) || 0);
  const incomeForBudget = actualIncome === 0 ? estimatedIncome : actualIncome;

  const fixedList = Array.isArray(monthPlan?.fixedExpenses) ? monthPlan.fixedExpenses : [];
  const totalFixedExpenses = fixedList.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  const savingsGoal = Math.max(0, Number(monthPlan?.savingsGoal) || 0);

  const spendableBudget = incomeForBudget - totalFixedExpenses - savingsGoal;

  // True net consumption: personal spending + personal share of splits (NO double count)
  const netPersonalSpendingMinor = personalSpendingMinor + mySharedCostMinor;
  const netPersonalSpending = toMajorUnits(netPersonalSpendingMinor);

  const remainingAvailable = spendableBudget - netPersonalSpending;

  // 5. Pacing and Spending Velocity
  const velocity = calculateSpendingVelocity(netPersonalSpending, spendableBudget, targetMonth);

  return {
    monthKey: targetMonth,
    income: incomeForBudget,
    incomeForBudget,
    fixedCosts: totalFixedExpenses,
    totalFixedExpenses,
    savingsGoal,
    variableBudget: spendableBudget,
    spendableBudget,
    personalSpending: toMajorUnits(personalSpendingMinor),
    personalExpenses: netPersonalSpending,
    sharedCashOutflow: toMajorUnits(sharedCashOutflowMinor),
    sharedReceivables: toMajorUnits(totalReceivablesMinor),
    mySharedCost: toMajorUnits(mySharedCostMinor),
    netPersonalSpending,
    remainingAvailable,
    remainingVariableBudget: remainingAvailable,
    receivables: toMajorUnits(totalReceivablesMinor),
    globalReceivables: toMajorUnits(totalReceivablesMinor),
    payables: toMajorUnits(totalPayablesMinor),
    globalPayables: toMajorUnits(totalPayablesMinor),
    netReceivableBalance: toMajorUnits(totalReceivablesMinor - totalPayablesMinor),
    netPeerBalance: toMajorUnits(totalReceivablesMinor - totalPayablesMinor),
    settlementsReceivedInMonth: toMajorUnits(settlementsReceivedInMonthMinor),
    moneyReceivedFromFriends: toMajorUnits(settlementsReceivedInMonthMinor),
    settlementsPaidInMonth: toMajorUnits(settlementsPaidInMonthMinor),
    spendingVelocity: velocity,
    categoryTotals,
    moneyFlow: {
      income: incomeForBudget,
      fixedCosts: totalFixedExpenses,
      savings: savingsGoal,
      personalSpending: toMajorUnits(personalSpendingMinor),
      sharedCashOutflow: toMajorUnits(sharedCashOutflowMinor),
      receivables: toMajorUnits(totalReceivablesMinor),
      netVariableSpend: netPersonalSpending,
      remainingAvailable,
    },
    moneyFlowSteps: [
      { id: 'income', label: 'Income', amount: incomeForBudget, type: 'inflow' },
      { id: 'fixed', label: 'Fixed Costs', amount: totalFixedExpenses, type: 'outflow' },
      { id: 'savings', label: 'Savings', amount: savingsGoal, type: 'outflow' },
      { id: 'personal', label: 'Personal Spending', amount: toMajorUnits(personalSpendingMinor), type: 'outflow' },
      { id: 'shared_outflow', label: 'Shared Cash Outflow', amount: toMajorUnits(sharedCashOutflowMinor), type: 'outflow' },
      { id: 'receivables', label: 'Receivables', amount: toMajorUnits(totalReceivablesMinor), type: 'inflow' },
      { id: 'net_spend', label: 'Net Available', amount: remainingAvailable, type: 'balance' },
    ],
  };
}

/**
 * Derives comprehensive bilateral financial relationship and history with a specific friend.
 * 
 * @param {string} friendId
 * @param {Array} splitExpenses
 * @param {Array} settlements
 * @param {string} [currentUserId='user-self']
 * @returns {object}
 */
export function getFriendFinancialProfile(
  friendId,
  splitExpenses = [],
  settlements = [],
  currentUserId = 'user-self'
) {
  if (!friendId) {
    return {
      friendId: '',
      friendOwesUser: 0,
      userOwesFriend: 0,
      theyOweYou: 0,
      youOweThem: 0,
      netBalance: 0,
      status: 'settled',
      totalSharedCount: 0,
      sharedExpensesCount: 0,
      totalVolume: 0,
      sharedVolume: 0,
      sharedExpenses: [],
      activity: [],
      activityHistory: [],
    };
  }

  let theyOweYouMinor = 0;
  let youOweThemMinor = 0;
  let sharedCount = 0;
  let totalVolumeMinor = 0;
  const activity = [];

  // Filter splits involving both user and friend
  (Array.isArray(splitExpenses) ? splitExpenses : []).forEach((exp) => {
    const payer = exp.paidBy || exp.paidById;
    const shares = Array.isArray(exp.shares)
      ? exp.shares
      : Array.isArray(exp.participants)
      ? exp.participants
      : [];

    const isUserParticipant = shares.some((s) => (s.userId || s.participantId) === currentUserId);
    const isFriendParticipant = shares.some((s) => (s.userId || s.participantId) === friendId);
    const isUserPayer = payer === currentUserId;
    const isFriendPayer = payer === friendId;

    if (!((isUserParticipant || isUserPayer) && (isFriendParticipant || isFriendPayer))) {
      return;
    }

    sharedCount += 1;
    totalVolumeMinor += toMinorUnits(exp.totalAmount);

    const friendShareObj = shares.find((s) => (s.userId || s.participantId) === friendId);
    const userShareObj = shares.find((s) => (s.userId || s.participantId) === currentUserId);

    const friendShareAmt = friendShareObj ? Number(friendShareObj.shareAmount) || 0 : 0;
    const userShareAmt = userShareObj ? Number(userShareObj.shareAmount) || 0 : 0;

    let deltaMinor = 0;
    if (isUserPayer && friendShareAmt > 0) {
      // User paid, friend owes user
      const fMinor = toMinorUnits(friendShareAmt);
      deltaMinor += fMinor;
      theyOweYouMinor += fMinor;
    } else if (isFriendPayer && userShareAmt > 0) {
      // Friend paid, user owes friend
      const uMinor = toMinorUnits(userShareAmt);
      deltaMinor -= uMinor;
      youOweThemMinor += uMinor;
    }

    activity.push({
      id: exp.id,
      type: 'split',
      title: exp.title,
      totalAmount: exp.totalAmount,
      date: exp.date,
      timestamp: exp.createdAt || exp.date,
      payerName: isUserPayer ? 'You' : isFriendPayer ? 'Friend' : 'Someone',
      isUserPayer,
      isFriendPayer,
      userShareAmt,
      friendShareAmt,
      impact: toMajorUnits(deltaMinor),
    });
  });

  // Filter settlements between user and friend
  (Array.isArray(settlements) ? settlements : []).forEach((s) => {
    const fromId = s.fromId || s.fromUserId;
    const toId = s.toId || s.toUserId;
    const isFromFriendToUser = fromId === friendId && toId === currentUserId;
    const isFromUserToFriend = fromId === currentUserId && toId === friendId;

    if (!isFromFriendToUser && !isFromUserToFriend) return;

    const sMinor = toMinorUnits(s.amount);

    if (isFromFriendToUser) {
      // Friend paid user: reduces friend debt
      theyOweYouMinor -= sMinor;
      activity.push({
        id: s.id,
        type: 'settlement',
        title: 'Settlement Received',
        amount: s.amount,
        date: s.settledAt ? s.settledAt.split('T')[0] : s.date,
        timestamp: s.settledAt || s.createdAt,
        direction: 'in',
        impact: -s.amount,
      });
    } else {
      // User paid friend: reduces user debt
      youOweThemMinor -= sMinor;
      activity.push({
        id: s.id,
        type: 'settlement',
        title: 'Settlement Paid',
        amount: s.amount,
        date: s.settledAt ? s.settledAt.split('T')[0] : s.date,
        timestamp: s.settledAt || s.createdAt,
        direction: 'out',
        impact: s.amount,
      });
    }
  });

  activity.sort((a, b) => {
    if (b.date !== a.date) return (b.date || '').localeCompare(a.date || '');
    return (b.timestamp || '').localeCompare(a.timestamp || '');
  });

  const netBalanceMinor = theyOweYouMinor - youOweThemMinor;
  const netBalance = toMajorUnits(netBalanceMinor);
  const theyOweYou = toMajorUnits(Math.max(0, theyOweYouMinor));
  const youOweThem = toMajorUnits(Math.max(0, youOweThemMinor));
  const friendOwesUser = netBalance > 0 ? netBalance : 0;
  const userOwesFriend = netBalance < 0 ? Math.abs(netBalance) : 0;

  return {
    friendId,
    friendOwesUser,
    userOwesFriend,
    theyOweYou,
    youOweThem,
    netBalance,
    status: netBalance > 0 ? 'owes_you' : netBalance < 0 ? 'you_owe' : 'settled',
    totalSharedCount: sharedCount,
    sharedExpensesCount: sharedCount,
    totalVolume: toMajorUnits(totalVolumeMinor),
    sharedVolume: toMajorUnits(totalVolumeMinor),
    sharedExpenses: activity.filter((a) => a.type === 'split'),
    activity,
    activityHistory: activity,
  };
}
