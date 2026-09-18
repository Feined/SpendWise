import assert from 'node:assert/strict';
import {
  splitEqually,
  calculateNetBalances,
  simplifyDebts,
} from '../src/lib/splitEngine.js';

console.log('[TEST] Running Complete Friends Split Verification Flow...');

// =================================================================
// 1. New User Empty State Resilience (Section 7, 12)
// =================================================================
{
  const emptyBalances = calculateNetBalances('user-self', [], []);
  assert.equal(emptyBalances.totalYouOwe, 0);
  assert.equal(emptyBalances.totalOwedToYou, 0);
  assert.equal(emptyBalances.netBalance, 0);
  assert.ok(Array.isArray(emptyBalances.whoOwesYou), 'whoOwesYou must be an array');
  assert.equal(emptyBalances.whoOwesYou.length, 0);
  assert.ok(Array.isArray(emptyBalances.whoYouOwe), 'whoYouOwe must be an array');
  assert.equal(emptyBalances.whoYouOwe.length, 0);
  assert.ok(Array.isArray(emptyBalances.youOweList), 'youOweList must be an array');
  assert.equal(emptyBalances.youOweList.length, 0);
}

// =================================================================
// 2. Exact Specification Fixture (Section 13)
// "Rahul paid ₹1,200
// Participants: You, Rahul, Aman, Zaid
// Expected:
// Rahul's own share = ₹300
// You owe Rahul = ₹300
// Aman owes Rahul = ₹300
// Zaid owes Rahul = ₹300
// Rahul is owed = ₹900"
// =================================================================
{
  const participants = [
    { id: 'user-self', name: 'You' },
    { id: 'f-rahul', name: 'Rahul' },
    { id: 'f-aman', name: 'Aman' },
    { id: 'f-zaid', name: 'Zaid' },
  ];

  // 1. Equal Split calculation
  const splitResult = splitEqually({
    totalAmount: 1200,
    paidById: 'f-rahul',
    participants,
  });

  assert.equal(splitResult.length, 4, '4 participants must be present');

  // Verify Rahul's share
  const rahulShare = splitResult.find((p) => p.participantId === 'f-rahul');
  assert.equal(rahulShare.shareAmount, 300, "Rahul's own share must be ₹300");
  assert.equal(rahulShare.amountPaid, 1200, "Rahul amount paid must be ₹1,200");
  assert.equal(rahulShare.balance, 900, "Rahul net balance must be ₹900");

  // Verify You share
  const youShare = splitResult.find((p) => p.participantId === 'user-self');
  assert.equal(youShare.shareAmount, 300, "Your share must be ₹300");
  assert.equal(youShare.amountPaid, 0, "Your amount paid must be 0");
  assert.equal(youShare.balance, -300, "You owe ₹300");

  // Verify Aman share
  const amanShare = splitResult.find((p) => p.participantId === 'f-aman');
  assert.equal(amanShare.shareAmount, 300, "Aman's share must be ₹300");
  assert.equal(amanShare.balance, -300, "Aman owes ₹300");

  // Verify Zaid share
  const zaidShare = splitResult.find((p) => p.participantId === 'f-zaid');
  assert.equal(zaidShare.shareAmount, 300, "Zaid's share must be ₹300");
  assert.equal(zaidShare.balance, -300, "Zaid owes ₹300");

  // 2. Net Balances from the perspective of "You" (user-self)
  const recordedExpense = {
    id: 'exp-1',
    title: 'Dinner',
    totalAmount: 1200,
    currency: 'INR',
    paidBy: 'f-rahul',
    payerName: 'Rahul',
    splitMethod: 'equally',
    date: '2026-09-16',
    shares: splitResult.map((s) => ({
      userId: s.participantId,
      shareAmount: s.shareAmount,
      isPayer: s.isPayer,
    })),
  };

  const youBalances = calculateNetBalances('user-self', [recordedExpense], []);

  // For You:
  // You owe Rahul ₹300
  assert.equal(youBalances.totalYouOwe, 300, "You total owed must be ₹300");
  assert.equal(youBalances.totalOwedToYou, 0, "Nobody owes you money");
  assert.equal(youBalances.netBalance, -300, "Your net balance must be -₹300");
  assert.equal(youBalances.whoYouOwe.length, 1, "You owe 1 friend");
  assert.equal(youBalances.whoYouOwe[0].userId, 'f-rahul');
  assert.equal(youBalances.whoYouOwe[0].amount, 300, "You owe Rahul exactly ₹300");

  // For Rahul:
  // Rahul is owed ₹900 in total (₹300 from You, ₹300 from Aman, ₹300 from Zaid)
  const rahulBalances = calculateNetBalances('f-rahul', [recordedExpense], []);
  assert.equal(rahulBalances.totalOwedToYou, 900, "Rahul is owed exactly ₹900");
  assert.equal(rahulBalances.totalYouOwe, 0, "Rahul owes 0");
  assert.equal(rahulBalances.netBalance, 900, "Rahul's net balance must be +₹900");
  assert.equal(rahulBalances.whoOwesYou.length, 3, "3 friends owe Rahul");
  assert.equal(rahulBalances.whoOwesYou.reduce((sum, f) => sum + f.amount, 0), 900);
}

console.log('✔ Basic Equal Split Flow Verified 100% Mathematically Correct!');
