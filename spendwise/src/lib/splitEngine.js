/**
 * SpendWise Friends Split Engine (Pure Utility)
 * 
 * Implements exact integer minor-unit arithmetic (paise/cents)
 * to eliminate floating-point penny leaks and rounding errors.
 * 
 * Includes:
 * 1. Minor/Major unit conversion
 * 2. Equal, Exact, Percentage, and Shares splitting
 * 3. Min-Cash-Flow Debt Simplification Algorithm
 * 4. Net Balances & Multi-Party Settlement Tracking
 */

/**
 * Converts a major currency unit (e.g. 10.50) into an integer minor unit (1050 paise).
 */
export function toMinorUnits(amount) {
  const num = Number(amount);
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Converts an integer minor unit (e.g. 1050 paise) into major currency unit (10.50).
 */
export function toMajorUnits(minorUnits) {
  return (minorUnits || 0) / 100;
}

function parseParticipants(input) {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map((p) => {
      if (typeof p === 'string') return { id: p, name: p };
      return { id: p.id || p.userId || p.participantId, name: p.name || p.participantName || p.id };
    });
  }
  return [];
}

/**
 * Splits an expense EQUALLY among participants with exact penny/paise remainder balancing.
 */
export function splitEqually(arg1, arg2 = [], arg3) {
  let totalAmount, participantsList, paidById;

  if (typeof arg1 === 'object' && arg1 !== null && !Array.isArray(arg1)) {
    totalAmount = arg1.totalAmount;
    participantsList = parseParticipants(arg1.participants || arg1.participantIds);
    paidById = arg1.paidById || arg1.paidBy;
  } else {
    totalAmount = arg1;
    participantsList = parseParticipants(arg2);
    paidById = arg3;
  }

  if (!participantsList || participantsList.length === 0) {
    throw new Error('At least one participant is required for splitting.');
  }

  const totalMinor = toMinorUnits(totalAmount);
  if (totalMinor <= 0) {
    throw new Error('Expense amount must be greater than zero.');
  }

  const n = participantsList.length;
  const baseMinor = Math.floor(totalMinor / n);
  const remainderMinor = totalMinor % n;

  const shares = participantsList.map((p, index) => {
    const shareMinor = baseMinor + (index < remainderMinor ? 1 : 0);
    const shareAmount = toMajorUnits(shareMinor);
    const isPayer = p.id === paidById;
    const amountPaid = isPayer ? toMajorUnits(totalMinor) : 0;
    const balance = amountPaid - shareAmount;

    return {
      userId: p.id,
      participantId: p.id,
      participantName: p.name,
      shareAmount,
      shareMinor,
      amountPaid,
      balance,
      isPayer,
    };
  });

  const res = [...shares];
  Object.assign(res, {
    method: 'EQUALLY',
    totalAmount: toMajorUnits(totalMinor),
    totalMinor,
    shares,
  });

  return res;
}

/**
 * Splits an expense by EXACT AMOUNTS specified for each participant.
 */
export function splitByExactAmounts(arg1, arg2 = [], arg3) {
  let totalAmount, participantShares, paidById;

  if (typeof arg1 === 'object' && arg1 !== null && !Array.isArray(arg1)) {
    totalAmount = arg1.totalAmount;
    paidById = arg1.paidById || arg1.paidBy;
    if (arg1.exactAmounts && typeof arg1.exactAmounts === 'object') {
      const parts = parseParticipants(arg1.participants || Object.keys(arg1.exactAmounts));
      participantShares = parts.map((p) => ({
        userId: p.id,
        name: p.name,
        amount: arg1.exactAmounts[p.id] !== undefined ? arg1.exactAmounts[p.id] : 0,
      }));
    } else {
      participantShares = arg1.participantShares || arg1.participants || [];
    }
  } else {
    totalAmount = arg1;
    participantShares = arg2;
    paidById = arg3;
  }

  const totalMinor = toMinorUnits(totalAmount);
  if (totalMinor <= 0) {
    throw new Error('Expense amount must be greater than zero.');
  }

  let sumMinor = 0;
  const shares = participantShares.map((p) => {
    const pId = p.userId || p.id || p.participantId;
    const pName = p.name || p.participantName || pId;
    const sMinor = toMinorUnits(p.amount || p.shareAmount || 0);
    sumMinor += sMinor;
    const shareAmount = toMajorUnits(sMinor);
    const isPayer = pId === paidById;
    const amountPaid = isPayer ? toMajorUnits(totalMinor) : 0;
    const balance = amountPaid - shareAmount;

    return {
      userId: pId,
      participantId: pId,
      participantName: pName,
      shareAmount,
      shareMinor: sMinor,
      amountPaid,
      balance,
      isPayer,
    };
  });

  const diffMinor = totalMinor - sumMinor;
  if (diffMinor !== 0) {
    const diffMajor = Math.abs(toMajorUnits(diffMinor));
    throw new Error(`Your split does not match total by ${diffMajor}. Shares sum to ${toMajorUnits(sumMinor)} but total is ${toMajorUnits(totalMinor)}.`);
  }

  const res = [...shares];
  Object.assign(res, {
    method: 'EXACT',
    totalAmount: toMajorUnits(totalMinor),
    totalMinor,
    shares,
  });

  return res;
}

/**
 * Splits an expense by PERCENTAGES specified for each participant (must sum to 100%).
 */
export function splitByPercentage(arg1, arg2 = [], arg3) {
  let totalAmount, participantPercentages, paidById;

  if (typeof arg1 === 'object' && arg1 !== null && !Array.isArray(arg1)) {
    totalAmount = arg1.totalAmount;
    paidById = arg1.paidById || arg1.paidBy;
    if (arg1.percentages && typeof arg1.percentages === 'object') {
      const parts = parseParticipants(arg1.participants || Object.keys(arg1.percentages));
      participantPercentages = parts.map((p) => ({
        userId: p.id,
        name: p.name,
        percentage: arg1.percentages[p.id] !== undefined ? arg1.percentages[p.id] : 0,
      }));
    } else {
      participantPercentages = arg1.participantPercentages || arg1.participants || [];
    }
  } else {
    totalAmount = arg1;
    participantPercentages = arg2;
    paidById = arg3;
  }

  const totalMinor = toMinorUnits(totalAmount);
  if (totalMinor <= 0) {
    throw new Error('Expense amount must be greater than zero.');
  }

  const totalPct = participantPercentages.reduce((sum, p) => sum + (Number(p.percentage) || 0), 0);
  if (Math.abs(totalPct - 100) > 0.01) {
    throw new Error(`Percentages must equal 100%. Currently: ${totalPct}%.`);
  }

  let allocatedMinor = 0;
  const shares = participantPercentages.map((p, idx) => {
    const pId = p.userId || p.id || p.participantId;
    const pName = p.name || p.participantName || pId;
    let sMinor = Math.round((totalMinor * p.percentage) / 100);
    if (idx === participantPercentages.length - 1) {
      sMinor = totalMinor - allocatedMinor;
    }
    allocatedMinor += sMinor;

    const shareAmount = toMajorUnits(sMinor);
    const isPayer = pId === paidById;
    const amountPaid = isPayer ? toMajorUnits(totalMinor) : 0;
    const balance = amountPaid - shareAmount;

    return {
      userId: pId,
      participantId: pId,
      participantName: pName,
      percentage: p.percentage,
      shareAmount,
      shareMinor: sMinor,
      amountPaid,
      balance,
      isPayer,
    };
  });

  const res = [...shares];
  Object.assign(res, {
    method: 'PERCENTAGE',
    totalAmount: toMajorUnits(totalMinor),
    totalMinor,
    shares,
  });

  return res;
}

/**
 * Splits an expense by PROPORTIONAL SHARES/WEIGHTS (e.g. 1 share, 2 shares).
 */
export function splitByShares(arg1, arg2 = [], arg3) {
  let totalAmount, participantWeights, paidById;

  if (typeof arg1 === 'object' && arg1 !== null && !Array.isArray(arg1)) {
    totalAmount = arg1.totalAmount;
    paidById = arg1.paidById || arg1.paidBy;
    if (arg1.shares && typeof arg1.shares === 'object' && !Array.isArray(arg1.shares)) {
      const parts = parseParticipants(arg1.participants || Object.keys(arg1.shares));
      participantWeights = parts.map((p) => ({
        userId: p.id,
        name: p.name,
        shares: arg1.shares[p.id] !== undefined ? arg1.shares[p.id] : 1,
      }));
    } else {
      participantWeights = arg1.participantWeights || arg1.participants || [];
    }
  } else {
    totalAmount = arg1;
    participantWeights = arg2;
    paidById = arg3;
  }

  const totalMinor = toMinorUnits(totalAmount);
  if (totalMinor <= 0) {
    throw new Error('Expense amount must be greater than zero.');
  }

  const totalUnits = participantWeights.reduce((sum, p) => sum + (Number(p.shares) || 0), 0);
  if (totalUnits <= 0) {
    throw new Error('Total shares count must be greater than 0.');
  }

  let allocatedMinor = 0;
  const shares = participantWeights.map((p, idx) => {
    const pId = p.userId || p.id || p.participantId;
    const pName = p.name || p.participantName || pId;
    let sMinor = Math.floor((totalMinor * p.shares) / totalUnits);
    if (idx === participantWeights.length - 1) {
      sMinor = totalMinor - allocatedMinor;
    }
    allocatedMinor += sMinor;

    const shareAmount = toMajorUnits(sMinor);
    const isPayer = pId === paidById;
    const amountPaid = isPayer ? toMajorUnits(totalMinor) : 0;
    const balance = amountPaid - shareAmount;

    return {
      userId: pId,
      participantId: pId,
      participantName: pName,
      sharesCount: p.shares,
      shareAmount,
      shareMinor: sMinor,
      amountPaid,
      balance,
      isPayer,
    };
  });

  const res = [...shares];
  Object.assign(res, {
    method: 'SHARES',
    totalAmount: toMajorUnits(totalMinor),
    totalMinor,
    shares,
  });

  return res;
}

/**
 * DEBT SIMPLIFICATION ENGINE (Min-Cash-Flow Algorithm)
 * 
 * Given raw pairwise debts, simplifies them to the minimum number
 * of bilateral payment transfers needed to fully settle everyone.
 */
export function simplifyDebts(rawDebts = []) {
  const netBalances = {};
  const names = {};

  rawDebts.forEach((debt) => {
    const from = debt.from || debt.fromId;
    const to = debt.to || debt.toId;
    if (!from || !to || from === to) return;
    if (debt.fromName) names[from] = debt.fromName;
    if (debt.toName) names[to] = debt.toName;

    const minor = toMinorUnits(debt.amount);
    if (minor <= 0) return;

    netBalances[from] = (netBalances[from] || 0) - minor;
    netBalances[to] = (netBalances[to] || 0) + minor;
  });

  const creditors = [];
  const debtors = [];

  Object.entries(netBalances).forEach(([userId, balanceMinor]) => {
    if (balanceMinor > 0) {
      creditors.push({ userId, name: names[userId] || userId, balance: balanceMinor });
    } else if (balanceMinor < 0) {
      debtors.push({ userId, name: names[userId] || userId, balance: -balanceMinor });
    }
  });

  creditors.sort((a, b) => b.balance - a.balance);
  debtors.sort((a, b) => b.balance - a.balance);

  const simplified = [];
  let cIdx = 0;
  let dIdx = 0;

  while (cIdx < creditors.length && dIdx < debtors.length) {
    const creditor = creditors[cIdx];
    const debtor = debtors[dIdx];

    const settleMinor = Math.min(creditor.balance, debtor.balance);
    if (settleMinor > 0) {
      simplified.push({
        from: debtor.userId,
        fromId: debtor.userId,
        fromName: debtor.name,
        to: creditor.userId,
        toId: creditor.userId,
        toName: creditor.name,
        amount: toMajorUnits(settleMinor),
      });
    }

    creditor.balance -= settleMinor;
    debtor.balance -= settleMinor;

    if (creditor.balance === 0) cIdx++;
    if (debtor.balance === 0) dIdx++;
  }

  return simplified;
}

/**
 * Calculates net balances for the user and friends across all split expenses and settlements.
 */
export function calculateNetBalances(arg1, arg2 = [], arg3 = []) {
  let currentUserId, splitExpenses, settlements;

  if (Array.isArray(arg1)) {
    splitExpenses = arg1;
    settlements = arg2;
    currentUserId = (typeof arg3 === 'string' && arg3) ? arg3 : 'you';
  } else {
    currentUserId = (typeof arg1 === 'string' && arg1) ? arg1 : 'you';
    splitExpenses = arg2 || [];
    settlements = arg3 || [];
  }

  const pairwiseMinor = {};
  const names = {};

  splitExpenses.forEach((expense) => {
    const paidBy = expense.paidById || expense.paidBy;
    const payerName = expense.payerName;
    if (paidBy && payerName) names[paidBy] = payerName;

    const participants = expense.participants || expense.shares || [];

    participants.forEach((part) => {
      const pId = part.participantId || part.userId;
      const pName = part.participantName || pId;
      if (pId && pName) names[pId] = pName;

      const shareMinor = toMinorUnits(part.shareAmount);

      if (paidBy === currentUserId && pId !== currentUserId) {
        pairwiseMinor[pId] = (pairwiseMinor[pId] || 0) + shareMinor;
      } else if (paidBy !== currentUserId && pId === currentUserId) {
        pairwiseMinor[paidBy] = (pairwiseMinor[paidBy] || 0) - shareMinor;
      }
    });
  });

  settlements.forEach((s) => {
    const amtMinor = toMinorUnits(s.amount);
    const from = s.fromId || s.fromUserId;
    const to = s.toId || s.toUserId;
    if (s.fromName) names[from] = s.fromName;
    if (s.toName) names[to] = s.toName;

    if (from === currentUserId) {
      pairwiseMinor[to] = (pairwiseMinor[to] || 0) + amtMinor;
    } else if (to === currentUserId) {
      pairwiseMinor[from] = (pairwiseMinor[from] || 0) - amtMinor;
    }
  });

  let totalYouAreOwedMinor = 0;
  let totalYouOweMinor = 0;
  const whoOwesYou = [];
  const youOwe = [];

  Object.entries(pairwiseMinor).forEach(([userId, balanceMinor]) => {
    if (balanceMinor > 0) {
      totalYouAreOwedMinor += balanceMinor;
      whoOwesYou.push({
        userId,
        name: names[userId] || userId,
        amount: toMajorUnits(balanceMinor),
      });
    } else if (balanceMinor < 0) {
      const absMinor = Math.abs(balanceMinor);
      totalYouOweMinor += absMinor;
      youOwe.push({
        userId,
        name: names[userId] || userId,
        amount: toMajorUnits(absMinor),
      });
    }
  });

  const netBalanceMinor = totalYouAreOwedMinor - totalYouOweMinor;
  const youAreOwed = toMajorUnits(totalYouAreOwedMinor);
  const youOweVal = toMajorUnits(totalYouOweMinor);

  return {
    youAreOwed,
    totalOwedToYou: youAreOwed,
    youOwe: youOweVal,
    totalYouOwe: youOweVal,
    youOweAmount: youOweVal,
    netBalance: toMajorUnits(netBalanceMinor),
    whoOwesYou: whoOwesYou.sort((a, b) => b.amount - a.amount),
    youOweList: youOwe.sort((a, b) => b.amount - a.amount),
    whoYouOwe: youOwe.sort((a, b) => b.amount - a.amount),
    pairwiseBalances: Object.fromEntries(
      Object.entries(pairwiseMinor).map(([k, v]) => [k, toMajorUnits(v)])
    ),
  };
}
