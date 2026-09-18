import assert from 'node:assert/strict';
import {
  calculateSplitAccounting,
  getUnifiedFinancialSummary,
  getFriendFinancialProfile,
  buildUnifiedActivityTimeline,
  calculateSpendingVelocity
} from '../src/lib/financialEngine.js';

console.log('[TEST] Running SpendWise Financial Engine & Accounting Tests...');

// ============================================================================
// 1. CRITICAL ACCOUNTING TEST (Req 12, 13, 22, 50, 51)
// ============================================================================
{
  console.log('-> 1. Testing Section 50: ₹1,200 equal split with 4 participants...');
  // You pay ₹1,200. 4 participants. Equal split.
  const splitExpense = {
    id: 'split-dinner-1',
    title: 'Dinner with friends',
    totalAmount: 1200,
    paidBy: 'user-self',
    date: '2026-09-15',
    shares: [
      { userId: 'user-self', shareAmount: 300 },
      { userId: 'f-rahul', shareAmount: 300 },
      { userId: 'f-aman', shareAmount: 300 },
      { userId: 'f-zaid', shareAmount: 300 }
    ]
  };

  const accounting = calculateSplitAccounting(splitExpense, 'user-self');

  assert.equal(accounting.isPayer, true, 'Current user is the payer');
  assert.equal(accounting.amountPaidByMe, 1200, 'Cash outflow must be exactly ₹1,200');
  assert.equal(accounting.myShare, 300, 'Personal expense share must be exactly ₹300');
  assert.equal(accounting.amountOwedToMe, 900, 'Peers owe user exactly ₹900');
  assert.equal(accounting.amountIOwe, 0, 'User owes 0 since user paid');
  assert.equal(accounting.netImpact, 900, 'Net receivable asset impact is +₹900');

  // Month Plan fixture
  const monthPlan = {
    monthKey: '2026-09',
    estimatedIncome: 80000,
    actualIncome: 80000,
    fixedExpenses: [
      { id: 'fe-1', name: 'Rent', amount: 21799 }
    ],
    savingsGoal: 10000
  };

  // Run month financial summary BEFORE Rahul settles
  const summaryBefore = getUnifiedFinancialSummary(
    '2026-09',
    [], // No personal transactions yet
    [splitExpense],
    [], // No settlements yet
    monthPlan,
    'user-self'
  );

  // Assert accounting formulas
  assert.equal(summaryBefore.income, 80000);
  assert.equal(summaryBefore.fixedCosts, 21799);
  assert.equal(summaryBefore.savingsGoal, 10000);
  assert.equal(summaryBefore.variableBudget, 48201); // 80000 - 21799 - 10000
  assert.equal(summaryBefore.sharedCashOutflow, 1200, 'Shared cash outflow is ₹1,200');
  assert.equal(summaryBefore.sharedReceivables, 900, 'Receivables asset is ₹900');
  assert.equal(summaryBefore.personalExpenses, 300, 'Only user personal share of ₹300 counts as variable expense (NO DOUBLE COUNTING)');
  assert.equal(summaryBefore.remainingVariableBudget, 48201 - 300, 'Remaining variable budget is 48201 - 300 = 47901');
  assert.equal(summaryBefore.globalReceivables, 900);

  // Now Rahul pays ₹300 settlement
  console.log('-> 2. Testing Rahul settlement of ₹300...');
  const settlement = {
    id: 'settle-1',
    fromUserId: 'f-rahul',
    toUserId: 'user-self',
    amount: 300,
    date: '2026-09-16',
    notes: 'Paid via UPI'
  };

  const summaryAfter = getUnifiedFinancialSummary(
    '2026-09',
    [],
    [splitExpense],
    [settlement],
    monthPlan,
    'user-self'
  );

  assert.equal(summaryAfter.sharedCashOutflow, 1200, 'Cash outflow remains ₹1,200');
  assert.equal(summaryAfter.personalExpenses, 300, 'Personal expense strictly remains ₹300');
  assert.equal(summaryAfter.globalReceivables, 600, 'Receivable drops to exactly ₹600 (900 - 300)');
  assert.equal(summaryAfter.moneyReceivedFromFriends, 300, 'Money received from friends is exactly ₹300');
  assert.equal(summaryAfter.remainingVariableBudget, 48201 - 300, 'Remaining variable budget stays protected at 47901');
}

// ============================================================================
// 2. ZERO DOUBLE COUNTING WITH PERSONAL TRANSACTIONS (Req 22, 51)
// ============================================================================
{
  console.log('-> 3. Testing personal transactions + split expenses isolation (Zero Double Counting)...');
  const personalTx = {
    id: 'tx-1',
    label: 'Swiggy',
    amount: 420,
    categoryId: 'food',
    nature: 'want',
    planned: false,
    date: '2026-09-10'
  };

  const splitExpense = {
    id: 'split-cab-1',
    title: 'Uber to airport',
    totalAmount: 800,
    paidBy: 'f-rahul',
    date: '2026-09-12',
    shares: [
      { userId: 'user-self', shareAmount: 200 },
      { userId: 'f-rahul', shareAmount: 600 }
    ]
  };

  const monthPlan = {
    monthKey: '2026-09',
    actualIncome: 50000,
    fixedExpenses: [],
    savingsGoal: 10000
  };

  const summary = getUnifiedFinancialSummary(
    '2026-09',
    [personalTx],
    [splitExpense],
    [],
    monthPlan,
    'user-self'
  );

  // Total personal consumption = 420 (Swiggy) + 200 (Uber share) = 620
  assert.equal(summary.personalExpenses, 620, 'Personal expenses sum direct personal purchases + user split share');
  assert.equal(summary.sharedCashOutflow, 0, 'User was not payer, so shared cash outflow is 0');
  assert.equal(summary.globalPayables, 200, 'User owes Rahul ₹200');
  assert.equal(summary.netPeerBalance, -200, 'Net peer position is -₹200');
}

// ============================================================================
// 3. BILATERAL FRIEND FINANCIAL PROFILE (Req 4, 5, 9, 33)
// ============================================================================
{
  console.log('-> 4. Testing getFriendFinancialProfile...');
  const split1 = {
    id: 's-1',
    title: 'Dinner',
    totalAmount: 1200,
    paidBy: 'user-self',
    date: '2026-09-10',
    shares: [
      { userId: 'user-self', shareAmount: 300 },
      { userId: 'f-rahul', shareAmount: 300 }
    ]
  };

  const split2 = {
    id: 's-2',
    title: 'Cab',
    totalAmount: 800,
    paidBy: 'f-rahul',
    date: '2026-09-11',
    shares: [
      { userId: 'user-self', shareAmount: 200 },
      { userId: 'f-rahul', shareAmount: 600 }
    ]
  };

  // Rahul owes 300 from Dinner; User owes 200 from Cab -> Net: Rahul owes user 100
  const profile = getFriendFinancialProfile('f-rahul', [split1, split2], [], 'user-self');

  assert.equal(profile.theyOweYou, 300);
  assert.equal(profile.youOweThem, 200);
  assert.equal(profile.netBalance, 100, 'Net balance is +100 (Rahul owes user)');
  assert.equal(profile.sharedExpensesCount, 2);

  // Settle 100
  const settle = {
    id: 'st-1',
    fromUserId: 'f-rahul',
    toUserId: 'user-self',
    amount: 100,
    date: '2026-09-12'
  };

  const profileAfterSettle = getFriendFinancialProfile('f-rahul', [split1, split2], [settle], 'user-self');
  assert.equal(profileAfterSettle.netBalance, 0, 'After settling ₹100, net balance must be exactly 0');
}

// ============================================================================
// 4. SPENDING VELOCITY ENGINE (Req 24)
// ============================================================================
{
  console.log('-> 5. Testing calculateSpendingVelocity...');
  // Month with 30 days, budget 30000, 10 days elapsed, 10000 spent
  const velocity = calculateSpendingVelocity(10000, 30000, '2026-09');
  assert.equal(velocity.daysInMonth, 30);
  assert.ok(velocity.daysElapsed >= 1);
  assert.ok(velocity.daysRemaining <= 30);
  assert.ok(typeof velocity.currentDailyPace === 'number');
  assert.ok(typeof velocity.safeDailyPace === 'number');
  assert.ok(['ON_TRACK', 'WATCH', 'CRITICAL'].includes(velocity.status));
}

// ============================================================================
// 5. UNIFIED TIMELINE ENGINE (Req 19, 31)
// ============================================================================
{
  console.log('-> 6. Testing buildUnifiedActivityTimeline...');
  const tx = {
    id: 'tx-1',
    label: 'Metro',
    amount: 80,
    date: '2026-09-14'
  };

  const split = {
    id: 'sp-1',
    title: 'Dinner with Rahul',
    totalAmount: 1200,
    paidBy: 'user-self',
    date: '2026-09-15',
    shares: [{ userId: 'user-self', shareAmount: 600 }, { userId: 'f-rahul', shareAmount: 600 }]
  };

  const settle = {
    id: 'st-1',
    fromUserId: 'f-rahul',
    toUserId: 'user-self',
    amount: 600,
    date: '2026-09-16'
  };

  const timeline = buildUnifiedActivityTimeline([tx], [split], [settle], 'user-self', {});
  assert.equal(timeline.length, 3);
  // Sorted newest first
  assert.equal(timeline[0].streamType, 'settlement');
  assert.equal(timeline[1].streamType, 'split');
  assert.equal(timeline[2].streamType, 'personal');
}

console.log('[PASS] All Financial Engine & Accounting Tests passed successfully!\n');
