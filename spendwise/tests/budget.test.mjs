import assert from 'node:assert/strict';
import {
  calculateTotalFixed,
  calculateTotalVariable,
  calculateSpendableBudget,
  calculateRemainingSpendable,
  calculateSafeDailyLimit,
  getFinancialStatus,
  formatCurrency,
} from '../src/lib/budget.js';

console.log('[TEST] Running SpendWise Budget Math Specification Tests...');

// 1. Core Rule: incomeForBudget (NEVER max(estimatedIncome, actualIncome))
{
  const estimatedOnly = {
    estimatedIncome: 80000,
    actualIncome: 0,
    fixedExpenses: [],
    savingsGoal: 0,
  };
  const spendableEst = calculateSpendableBudget(estimatedOnly);
  assert.equal(spendableEst, 80000, 'When actualIncome is 0, incomeForBudget must be estimatedIncome');

  const actualOnly = {
    estimatedIncome: 80000,
    actualIncome: 50000, // lower than estimated!
    fixedExpenses: [],
    savingsGoal: 0,
  };
  const spendableAct = calculateSpendableBudget(actualOnly);
  assert.equal(
    spendableAct,
    50000,
    'When actualIncome > 0, incomeForBudget MUST be actualIncome, never max(estimated, actual)'
  );
}

// 2. Exact Specification Fixture: September 2026
// Income = ₹80,000
// Fixed = ₹21,799
// Savings = ₹10,000
// Variable = ₹8,000
// Remaining = ₹40,201
// Daily limit = ₹2,512.56
{
  const monthPlan = {
    monthKey: '2026-09',
    estimatedIncome: 80000,
    actualIncome: 0, // falls back to estimated 80000
    savingsGoal: 10000,
    fixedExpenses: [
      { id: 'f1', name: 'Rent', amount: 15000 },
      { id: 'f2', name: 'Utilities', amount: 6799 },
    ],
  };

  const transactions = [
    { id: 't1', date: '2026-09-02', amount: 3000 },
    { id: 't2', date: '2026-09-10', amount: 5000 },
    { id: 't3', date: '2026-08-30', amount: 2000 }, // Out of month - should be ignored
  ];

  const totalFixed = calculateTotalFixed(monthPlan.fixedExpenses);
  assert.equal(totalFixed, 21799, `Total fixed expenses must be 21,799, got ${totalFixed}`);

  const spendable = calculateSpendableBudget(monthPlan);
  // 80,000 - 21,799 - 10,000 = 48,201
  assert.equal(spendable, 48201, `Spendable budget must be 48,201, got ${spendable}`);

  const totalVariable = calculateTotalVariable(transactions, '2026-09');
  assert.equal(totalVariable, 8000, `Variable expenses for 2026-09 must be 8,000, got ${totalVariable}`);

  const remaining = calculateRemainingSpendable(monthPlan, transactions, '2026-09');
  // 48,201 - 8,000 = 40,201
  assert.equal(remaining, 40201, `Remaining spendable must be exactly 40,201, got ${remaining}`);

  // September 2026 has 30 days. Tested on day 15 (16 days remaining: 30 - 15 + 1 = 16)
  // 40,201 / 16 = 2512.5625 -> 2512.56
  const testDate = new Date(2026, 8, 15); // Sept 15, 2026
  const dailyLimit = calculateSafeDailyLimit(remaining, testDate);
  assert.equal(dailyLimit, 2512.56, `Safe daily limit on Sept 15 must be exactly 2512.56, got ${dailyLimit}`);

  const status = getFinancialStatus(remaining, spendable);
  assert.equal(status, 'ON_TRACK', 'Remaining 40,201 / 48,201 is ~83%, status must be ON_TRACK');
}

// 3. Financial Status states
{
  assert.equal(getFinancialStatus(4000, 10000), 'WATCH', '40% left should be WATCH');
  assert.equal(getFinancialStatus(1500, 10000), 'TIGHT', '15% left should be TIGHT');
  assert.equal(getFinancialStatus(-500, 10000), 'OVERSPENT', 'Negative remaining should be OVERSPENT');
}

// 4. Backwards compatible formatCurrency
{
  const formatted = formatCurrency(40201, { currencySymbol: '₹', currencyCode: 'INR' });
  assert.ok(formatted.includes('40,201'), `formatCurrency should format 40,201 properly: ${formatted}`);
}

console.log('✔ All SpendWise Budget Math Specification Tests PASSED successfully!');
