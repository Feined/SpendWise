/**
 * SpendWise Financial Calculators & Planning Utilities
 * 
 * Pure mathematical functions for all interactive tools.
 * Tested and decoupled from React components.
 */

/**
 * 1. Savings Goal Calculator
 * 
 * @param {object} params
 * @param {number} params.targetAmount
 * @param {number} params.currentAmount
 * @param {number} params.monthsRemaining
 * @returns {object}
 */
export function calculateSavingsGoal({ targetAmount = 0, currentAmount = 0, monthsRemaining = 1 }) {
  const target = Math.max(0, Number(targetAmount) || 0);
  const current = Math.max(0, Number(currentAmount) || 0);
  const months = Math.max(1, Number(monthsRemaining) || 1);

  const shortfall = Math.max(0, target - current);
  const progressPercent = target > 0 ? Math.min(100, (current / target) * 100) : 0;

  const monthlyRequired = shortfall / months;
  const weeklyRequired = monthlyRequired / 4.333;
  const dailyRequired = monthlyRequired / 30.416;

  return {
    targetAmount: target,
    currentAmount: current,
    shortfall,
    progressPercent: Math.round(progressPercent * 10) / 10,
    monthlyRequired: Math.round(monthlyRequired * 100) / 100,
    weeklyRequired: Math.round(weeklyRequired * 100) / 100,
    dailyRequired: Math.round(dailyRequired * 100) / 100
  };
}

/**
 * 2. Emergency Fund Calculator
 * 
 * @param {object} params
 * @param {number} params.monthlyEssentials
 * @param {number} params.targetMonths
 * @param {number} [params.currentSavings=0]
 * @returns {object}
 */
export function calculateEmergencyFund({ monthlyEssentials = 0, targetMonths = 6, currentSavings = 0 }) {
  const essentials = Math.max(0, Number(monthlyEssentials) || 0);
  const months = Math.max(1, Number(targetMonths) || 6);
  const current = Math.max(0, Number(currentSavings) || 0);

  const targetFund = essentials * months;
  const remaining = Math.max(0, targetFund - current);
  const fundedPercent = targetFund > 0 ? Math.min(100, (current / targetFund) * 100) : 0;
  const monthsCovered = essentials > 0 ? current / essentials : 0;

  return {
    monthlyEssentials: essentials,
    targetMonths: months,
    targetFund,
    currentSavings: current,
    remainingToFund: remaining,
    fundedPercent: Math.round(fundedPercent * 10) / 10,
    monthsCovered: Math.round(monthsCovered * 10) / 10
  };
}

/**
 * 3. 50/30/20 Budget Planner
 * 
 * @param {number} monthlyIncome
 * @param {object} [customPercentages={ needs: 50, wants: 30, savings: 20 }]
 * @returns {object}
 */
export function calculate503020(monthlyIncome = 0, customPercentages = { needs: 50, wants: 30, savings: 20 }) {
  const income = Math.max(0, Number(monthlyIncome) || 0);
  const pNeeds = Number(customPercentages.needs) || 50;
  const pWants = Number(customPercentages.wants) || 30;
  const pSavings = Number(customPercentages.savings) || 20;

  const needsAmount = (income * pNeeds) / 100;
  const wantsAmount = (income * pWants) / 100;
  const savingsAmount = (income * pSavings) / 100;

  return {
    income,
    needs: {
      percent: pNeeds,
      amount: Math.round(needsAmount * 100) / 100,
      label: 'Needs (Rent, Groceries, Bills)'
    },
    wants: {
      percent: pWants,
      amount: Math.round(wantsAmount * 100) / 100,
      label: 'Wants (Dining out, Entertainment, Shopping)'
    },
    savings: {
      percent: pSavings,
      amount: Math.round(savingsAmount * 100) / 100,
      label: 'Savings & Debt (Emergency fund, Investments)'
    }
  };
}

/**
 * 4. Compound Interest Calculator
 * 
 * @param {object} params
 * @param {number} params.principal Initial lump sum
 * @param {number} params.monthlyContribution Added each month
 * @param {number} params.annualRate Percentage (e.g. 10 for 10%)
 * @param {number} params.years Investment horizon in years
 * @returns {object}
 */
export function calculateCompoundInterest({ principal = 0, monthlyContribution = 0, annualRate = 8, years = 5 }) {
  const P = Math.max(0, Number(principal) || 0);
  const PMT = Math.max(0, Number(monthlyContribution) || 0);
  const r = Math.max(0, Number(annualRate) || 0) / 100;
  const y = Math.max(1, Number(years) || 1);

  const n = 12; // Compounded monthly
  const totalMonths = y * n;
  const monthlyRate = r / n;

  // Compound amount from initial principal: P * (1 + r/n)^(n*t)
  const principalGrowth = P * Math.pow(1 + monthlyRate, totalMonths);

  // Future value of a series: PMT * (((1 + r/n)^(n*t) - 1) / (r/n))
  let contributionsGrowth = 0;
  if (monthlyRate > 0) {
    contributionsGrowth = PMT * ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate);
  } else {
    contributionsGrowth = PMT * totalMonths;
  }

  const finalAmount = principalGrowth + contributionsGrowth;
  const totalContributed = P + (PMT * totalMonths);
  const totalInterest = Math.max(0, finalAmount - totalContributed);

  return {
    principal: P,
    totalContributed: Math.round(totalContributed),
    totalInterest: Math.round(totalInterest),
    finalAmount: Math.round(finalAmount),
    multiplier: totalContributed > 0 ? Math.round((finalAmount / totalContributed) * 100) / 100 : 1
  };
}

/**
 * 5. Subscription Cost Calculator
 * 
 * @param {Array<{ id: string, name: string, amount: number, billingCycle: 'monthly'|'yearly' }>} subscriptions
 * @returns {object}
 */
export function calculateSubscriptionCost(subscriptions = []) {
  const list = Array.isArray(subscriptions) ? subscriptions : [];

  let monthlyTotal = 0;
  let yearlyTotal = 0;

  list.forEach((sub) => {
    const amt = Math.max(0, Number(sub.amount) || 0);
    if (sub.billingCycle === 'yearly') {
      yearlyTotal += amt;
      monthlyTotal += amt / 12;
    } else {
      monthlyTotal += amt;
      yearlyTotal += amt * 12;
    }
  });

  const fiveYearTotal = yearlyTotal * 5;

  return {
    itemCount: list.length,
    monthlyTotal: Math.round(monthlyTotal * 100) / 100,
    yearlyTotal: Math.round(yearlyTotal * 100) / 100,
    fiveYearTotal: Math.round(fiveYearTotal * 100) / 100
  };
}

/**
 * 6. Daily Spending Calculator
 * 
 * @param {object} params
 * @param {number} params.income
 * @param {number} params.fixedExpenses
 * @param {number} params.savingsGoal
 * @param {number} params.daysRemaining
 * @returns {object}
 */
export function calculateDailySpending({ income = 0, fixedExpenses = 0, savingsGoal = 0, daysRemaining = 30 }) {
  const inc = Math.max(0, Number(income) || 0);
  const fixed = Math.max(0, Number(fixedExpenses) || 0);
  const sav = Math.max(0, Number(savingsGoal) || 0);
  const days = Math.max(1, Number(daysRemaining) || 1);

  const spendablePool = inc - fixed - sav;
  const isNegative = spendablePool < 0;
  const safeDaily = !isNegative && days > 0 ? Math.floor((spendablePool / days) * 100) / 100 : 0;

  return {
    income: inc,
    fixedExpenses: fixed,
    savingsGoal: sav,
    spendablePool,
    isNegative,
    daysRemaining: days,
    safeDaily
  };
}
