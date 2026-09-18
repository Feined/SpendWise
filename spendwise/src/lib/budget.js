/**
 * SpendWise Budget Calculation & Date Utilities
 * 
 * Implements business logic according to SpendWise v1.1 specification.
 * Pure calculations with no DOM or React dependencies.
 */

import { CATEGORIES } from '../constants/categories.js';
import { formatMoney } from './currency.js';

/**
 * Returns today's local month key in "YYYY-MM" format.
 * 
 * @param {Date} [date=new Date()]
 * @returns {string}
 */
export function getCurrentMonthKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Formats a "YYYY-MM" month key into a human-readable string (e.g. "September 2026").
 * 
 * @param {string} monthKey
 * @returns {string}
 */
export function formatMonthDisplay(monthKey) {
  if (!monthKey || typeof monthKey !== 'string') return '';
  const [yearStr, monthStr] = monthKey.split('-');
  const year = parseInt(yearStr, 10);
  const monthIndex = parseInt(monthStr, 10) - 1;
  if (isNaN(year) || isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return monthKey;
  }
  const date = new Date(year, monthIndex, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Shifts a "YYYY-MM" month key by a given delta in months.
 * 
 * @param {string} monthKey
 * @param {number} delta
 * @returns {string}
 */
export function shiftMonth(monthKey, delta) {
  if (!monthKey) return getCurrentMonthKey();
  const [yearStr, monthStr] = monthKey.split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10);
  if (isNaN(year) || isNaN(month)) return getCurrentMonthKey();

  month += delta;
  while (month > 12) {
    month -= 12;
    year += 1;
  }
  while (month < 1) {
    month += 12;
    year -= 1;
  }
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Returns the number of days in a given calendar month.
 * 
 * @param {string} monthKey "YYYY-MM"
 * @returns {number}
 */
export function getDaysInMonth(monthKey) {
  if (!monthKey) return 30;
  const [yearStr, monthStr] = monthKey.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  if (isNaN(year) || isNaN(month)) return 30;
  return new Date(year, month, 0).getDate();
}

/**
 * Formats a monetary amount using the centralized currency engine.
 * Maintained for backward compatibility.
 * 
 * @param {number} amount
 * @param {string|object} [symbolOrSettings='₹']
 * @param {boolean} [showDecimals=false]
 * @returns {string}
 */
export function formatCurrency(amount, symbolOrSettings = '₹', showDecimals = false) {
  if (typeof symbolOrSettings === 'object') {
    return formatMoney(amount, symbolOrSettings, { showDecimals });
  }
  return formatMoney(amount, { currencySymbol: symbolOrSettings }, { showDecimals });
}

/**
 * Calculates sum of all fixed expense items.
 * @param {Array} fixedExpenses
 * @returns {number}
 */
export function calculateTotalFixed(fixedExpenses = []) {
  if (!Array.isArray(fixedExpenses)) return 0;
  return fixedExpenses.reduce((sum, item) => {
    const amt = Number(item.amount) || 0;
    return sum + (amt > 0 ? amt : 0);
  }, 0);
}

/**
 * Calculates sum of variable expenses for a given monthKey.
 * @param {Array} transactions
 * @param {string} [monthKey]
 * @returns {number}
 */
export function calculateTotalVariable(transactions = [], monthKey = '') {
  if (!Array.isArray(transactions)) return 0;
  const filtered = monthKey
    ? transactions.filter((t) => (t.date && t.date.startsWith(monthKey)) || t.monthKey === monthKey)
    : transactions;
  return filtered.reduce((sum, t) => {
    const amt = Number(t.amount) || 0;
    return sum + (amt > 0 ? amt : 0);
  }, 0);
}

/**
 * Calculates spendable budget (incomeForBudget - fixed - savings).
 * Strict: incomeForBudget = actualIncome === 0 ? estimatedIncome : actualIncome (never max).
 * @param {object|null} plan
 * @returns {number}
 */
export function calculateSpendableBudget(plan) {
  if (!plan) return 0;
  const estimatedIncome = Math.max(0, Number(plan.estimatedIncome) || 0);
  const actualIncome = Math.max(0, Number(plan.actualIncome) || 0);
  const savingsGoal = Math.max(0, Number(plan.savingsGoal) || 0);
  const incomeForBudget = actualIncome === 0 ? estimatedIncome : actualIncome;
  const totalFixed = calculateTotalFixed(plan.fixedExpenses);
  return incomeForBudget - totalFixed - savingsGoal;
}

/**
 * Calculates remaining spendable pool after deducting variable expenses.
 * @param {object|null} plan
 * @param {Array} transactions
 * @param {string} [monthKey]
 * @returns {number}
 */
export function calculateRemainingSpendable(plan, transactions = [], monthKey = '') {
  const targetMonth = monthKey || plan?.monthKey || '';
  const spendable = calculateSpendableBudget(plan);
  const variable = calculateTotalVariable(transactions, targetMonth);
  return spendable - variable;
}

/**
 * Calculates safe daily spend limit based on remaining amount and days left in month.
 * @param {number} remainingAmount
 * @param {Date} [date=new Date()]
 * @returns {number}
 */
export function calculateSafeDailyLimit(remainingAmount, date = new Date()) {
  if (remainingAmount <= 0) return 0;
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayOfMonth = date.getDate();
  const daysRemaining = Math.max(1, daysInMonth - dayOfMonth + 1);
  return Math.floor((remainingAmount / daysRemaining) * 100) / 100;
}

/**
 * Derives financial status state: ON_TRACK, WATCH, TIGHT, or OVERSPENT.
 * @param {number} remainingAmount
 * @param {number} spendableBudget
 * @returns {'ON_TRACK'|'WATCH'|'TIGHT'|'OVERSPENT'}
 */
export function getFinancialStatus(remainingAmount, spendableBudget) {
  if (remainingAmount < 0 || (spendableBudget <= 0 && remainingAmount <= 0)) {
    return 'OVERSPENT';
  }
  if (!spendableBudget || spendableBudget <= 0) {
    return 'WATCH';
  }
  const ratio = remainingAmount / spendableBudget;
  if (ratio < 0.20) return 'TIGHT';
  if (ratio < 0.50) return 'WATCH';
  return 'ON_TRACK';
}

/**
 * Performs core budget calculations for a given month plan.
 * 
 * Specification §13:
 * - incomeForBudget = actualIncome === 0 ? estimatedIncome : actualIncome
 * - totalFixedExpenses = sum(fixedExpenses.amount)
 * - spendableBudget = incomeForBudget - totalFixedExpenses - savingsGoal
 * - isNegative = incomeForBudget < totalFixedExpenses + savingsGoal
 * - remainingAmount = spendableBudget - variableExpenses
 * 
 * @param {object|null} plan Month plan object
 * @param {Array} [transactions=[]] Transaction list
 * @returns {object} Calculated snapshot
 */
export function calculateBudget(plan, transactions = []) {
  if (!plan) {
    return {
      hasPlan: false,
      monthKey: '',
      estimatedIncome: 0,
      actualIncome: 0,
      incomeForBudget: 0,
      incomeSource: 'none',
      totalFixedExpenses: 0,
      savingsGoal: 0,
      spendableBudget: 0,
      isNegative: false,
      variableExpenses: 0,
      remainingAmount: 0,
      safeDailyLimit: 0,
      daysRemaining: 0,
      isAheadOfPace: true,
      paceDifference: 0
    };
  }

  const estimatedIncome = Math.max(0, Number(plan.estimatedIncome) || 0);
  const actualIncome = Math.max(0, Number(plan.actualIncome) || 0);
  const savingsGoal = Math.max(0, Number(plan.savingsGoal) || 0);

  // Determine active income source (never max)
  const incomeForBudget = actualIncome === 0 ? estimatedIncome : actualIncome;
  const incomeSource = actualIncome === 0 ? 'estimated' : 'actual';

  // Sum fixed expenses
  const fixedExpensesList = Array.isArray(plan.fixedExpenses) ? plan.fixedExpenses : [];
  const totalFixedExpenses = fixedExpensesList.reduce((sum, item) => {
    const amt = Number(item.amount) || 0;
    return sum + (amt > 0 ? amt : 0);
  }, 0);

  // Spendable budget (variable pool)
  const spendableBudget = incomeForBudget - totalFixedExpenses - savingsGoal;
  const isNegative = incomeForBudget < totalFixedExpenses + savingsGoal;

  // Filter variable expenses for this month
  const monthKey = plan.monthKey || '';
  const monthTransactions = Array.isArray(transactions)
    ? transactions.filter((t) => (t.date && t.date.startsWith(monthKey)) || t.monthKey === monthKey)
    : [];

  const variableExpenses = monthTransactions.reduce((sum, t) => {
    const amt = Number(t.amount) || 0;
    return sum + (amt > 0 ? amt : 0);
  }, 0);

  const remainingAmount = spendableBudget - variableExpenses;

  // Calculate Safe Daily Limit & Pacing (§14)
  const today = new Date();
  const currentKey = getCurrentMonthKey(today);
  const daysInMonth = getDaysInMonth(monthKey);
  let dayOfMonth = today.getDate();

  // If looking at a past or future month, clamp dayOfMonth
  if (monthKey < currentKey) {
    dayOfMonth = daysInMonth;
  } else if (monthKey > currentKey) {
    dayOfMonth = 1;
  }

  const daysRemainingIncludingToday = Math.max(1, daysInMonth - dayOfMonth + 1);

  // Daily limit based strictly on remaining variable budget
  let safeDailyLimit = 0;
  if (remainingAmount > 0) {
    safeDailyLimit = Math.floor((remainingAmount / daysRemainingIncludingToday) * 100) / 100;
  }

  // Pacing indicator
  const expectedPaceToDate = spendableBudget > 0 ? (spendableBudget / daysInMonth) * dayOfMonth : 0;
  const paceDifference = Math.round(variableExpenses - expectedPaceToDate);
  const isAheadOfPace = variableExpenses <= expectedPaceToDate;

  return {
    hasPlan: true,
    monthKey,
    estimatedIncome,
    actualIncome,
    incomeForBudget,
    incomeSource,
    totalFixedExpenses,
    savingsGoal,
    spendableBudget,
    isNegative,
    variableExpenses,
    remainingAmount,
    safeDailyLimit,
    daysRemaining: daysRemainingIncludingToday,
    expectedPaceToDate: Math.round(expectedPaceToDate),
    paceDifference,
    isAheadOfPace
  };
}

/**
 * Returns breakdown of spending across all standard categories for a given month.
 * 
 * @param {string} monthKey
 * @param {Array} transactions
 * @param {number} spendableBudget
 * @returns {Array<object>}
 */
export function getCategoryBreakdown(monthKey, transactions = [], spendableBudget = 0) {
  const monthTransactions = transactions.filter((t) => (t.date && t.date.startsWith(monthKey)) || t.monthKey === monthKey);
  const totalVariable = monthTransactions.reduce((s, t) => s + (Number(t.amount) || 0), 0);

  return CATEGORIES.map((cat) => {
    const catTxs = monthTransactions.filter((t) => t.categoryId === cat.id);
    const amount = catTxs.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const count = catTxs.length;
    const percentageOfVariable = totalVariable > 0 ? Math.round((amount / totalVariable) * 100) : 0;
    const percentageOfSpendable = spendableBudget > 0 ? Math.round((amount / spendableBudget) * 100) : 0;

    return {
      ...cat,
      amount,
      count,
      percentageOfVariable,
      percentageOfSpendable
    };
  });
}

/**
 * Returns classification split of spending between Needs and Wants.
 * 
 * @param {string} monthKey
 * @param {Array} transactions
 * @returns {object}
 */
export function getNeedsVsWantsBreakdown(monthKey, transactions = []) {
  const monthTransactions = transactions.filter((t) => (t.date && t.date.startsWith(monthKey)) || t.monthKey === monthKey);
  let needsAmount = 0;
  let wantsAmount = 0;
  let unclassifiedAmount = 0;

  monthTransactions.forEach((t) => {
    const amt = Number(t.amount) || 0;
    if (t.nature === 'need') {
      needsAmount += amt;
    } else if (t.nature === 'want') {
      wantsAmount += amt;
    } else {
      unclassifiedAmount += amt;
    }
  });

  const total = needsAmount + wantsAmount + unclassifiedAmount;
  const wantsPercentage = total > 0 ? Math.round((wantsAmount / total) * 100) : 0;
  const needsPercentage = total > 0 ? Math.round((needsAmount / total) * 100) : 0;
  const potentialSavings = Math.round(wantsAmount * 0.25); // conservative 25% trimming opportunity

  return {
    needsAmount,
    wantsAmount,
    unclassifiedAmount,
    total,
    needsPercentage,
    wantsPercentage,
    potentialSavings
  };
}

/**
 * Returns breakdown between Planned and Unplanned expenses for a given month.
 * 
 * @param {string} monthKey
 * @param {Array} transactions
 * @returns {object}
 */
export function getPlannedVsUnplannedBreakdown(monthKey, transactions = []) {
  const monthTransactions = transactions.filter((t) => (t.date && t.date.startsWith(monthKey)) || t.monthKey === monthKey);
  let plannedAmount = 0;
  let unplannedAmount = 0;
  let unclassifiedAmount = 0;
  let plannedCount = 0;
  let unplannedCount = 0;

  monthTransactions.forEach((t) => {
    const amt = Number(t.amount) || 0;
    if (t.planned === true) {
      plannedAmount += amt;
      plannedCount += 1;
    } else if (t.planned === false) {
      unplannedAmount += amt;
      unplannedCount += 1;
    } else {
      unclassifiedAmount += amt;
    }
  });

  const total = plannedAmount + unplannedAmount + unclassifiedAmount;
  const plannedPercentage = total > 0 ? Math.round((plannedAmount / total) * 100) : 0;
  const unplannedPercentage = total > 0 ? Math.round((unplannedAmount / total) * 100) : 0;

  return {
    plannedAmount,
    unplannedAmount,
    unclassifiedAmount,
    plannedCount,
    unplannedCount,
    total,
    plannedPercentage,
    unplannedPercentage
  };
}

/**
 * Calculates heuristic savings opportunities based strictly on actual user transaction data.
 * Explains the methodology clearly without fabricated statistics.
 * 
 * @param {string} monthKey
 * @param {Array} transactions
 * @returns {Array<object>} Opportunities list
 */
export function calculateSavingOpportunities(monthKey, transactions = []) {
  const monthTransactions = transactions.filter((t) => (t.date && t.date.startsWith(monthKey)) || t.monthKey === monthKey);
  if (!monthTransactions || monthTransactions.length === 0) {
    return [];
  }

  const opportunities = [];

  // 1. Food category spending reduction
  const foodTxs = monthTransactions.filter((t) => t.categoryId === 'food');
  const foodTotal = foodTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  if (foodTotal > 1500) {
    const low = Math.round(foodTotal * 0.15);
    const high = Math.round(foodTotal * 0.25);
    opportunities.push({
      id: 'save-food',
      category: 'Food & Dining',
      currentSpend: foodTotal,
      minReduction: low,
      maxReduction: high,
      title: 'Dine-Out & Delivery Optimization',
      rationale: `Trimming 15–25% of your food spend (replacing 2–3 deliveries with home-cooked meals) preserves cash for savings.`,
      methodology: 'Based on 15–25% discretionary trim of your current food transactions.'
    });
  }

  // 2. Shopping spending reduction
  const shoppingTxs = monthTransactions.filter((t) => t.categoryId === 'shopping');
  const shoppingTotal = shoppingTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  if (shoppingTotal > 1000) {
    const low = Math.round(shoppingTotal * 0.20);
    const high = Math.round(shoppingTotal * 0.30);
    opportunities.push({
      id: 'save-shopping',
      category: 'Shopping & Retail',
      currentSpend: shoppingTotal,
      minReduction: low,
      maxReduction: high,
      title: 'Impulse Shopping Buffer',
      rationale: `Applying a 48-hour cooling-off rule on non-essential purchases could shave 20–30% off your retail spending.`,
      methodology: 'Based on 20–30% discretionary reduction of retail transactions.'
    });
  }

  // 3. Unplanned transactions audit
  const unplannedTxs = monthTransactions.filter((t) => t.planned === false);
  const unplannedTotal = unplannedTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  if (unplannedTotal > 800) {
    const savings = Math.round(unplannedTotal * 0.50);
    opportunities.push({
      id: 'save-unplanned',
      category: 'Unplanned Purchases',
      currentSpend: unplannedTotal,
      minReduction: savings,
      maxReduction: unplannedTotal,
      title: 'Pre-Planning Variable Buys',
      rationale: `You logged ${unplannedTxs.length} unplanned purchases totaling ${formatCurrency(unplannedTotal)}. Pre-allocating allowances prevents spontaneous leaks.`,
      methodology: 'Based on potential 50–100% recapture of unbudgeted purchases.'
    });
  }

  // 4. Discretionary Wants trim
  const wantTxs = monthTransactions.filter((t) => t.nature === 'want');
  const wantTotal = wantTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  if (wantTotal > 1200 && opportunities.length < 3) {
    const low = Math.round(wantTotal * 0.20);
    const high = Math.round(wantTotal * 0.30);
    opportunities.push({
      id: 'save-wants',
      category: 'Lifestyle Wants',
      currentSpend: wantTotal,
      minReduction: low,
      maxReduction: high,
      title: 'Lifestyle Trim Allowance',
      rationale: `Scaling back non-essential want spending by 20–30% directly funnels into your monthly savings target.`,
      methodology: 'Derived from your tagged discretionary want transactions.'
    });
  }

  return opportunities;
}
