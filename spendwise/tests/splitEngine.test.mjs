import assert from 'node:assert/strict';
import {
  toMinorUnits,
  toMajorUnits,
  splitEqually,
  splitByExactAmounts,
  splitByPercentage,
  splitByShares,
  simplifyDebts,
  calculateNetBalances,
} from '../src/lib/splitEngine.js';

console.log('[TEST] Running SpendWise Split Engine Tests...');

// 1. Integer Precision & Minor Units
{
  assert.equal(toMinorUnits(1200), 120000);
  assert.equal(toMinorUnits(10.5), 1050);
  assert.equal(toMinorUnits(0.01), 1);
  assert.equal(toMajorUnits(1050), 10.5);
  assert.equal(toMajorUnits(120000), 1200);
}

// 2. Equal Splitting: ₹1,200 between 4 people (Payer: Rahul)
{
  const participants = [
    { id: 'u-rahul', name: 'Rahul' },
    { id: 'u-you', name: 'You' },
    { id: 'u-aman', name: 'Aman' },
    { id: 'u-zaid', name: 'Zaid' },
  ];

  const result = splitEqually({
    totalAmount: 1200,
    paidById: 'u-rahul',
    participants,
  });

  assert.equal(result.length, 4);

  // Each person's share must be 300
  result.forEach((p) => {
    assert.equal(p.shareAmount, 300, `${p.participantName} share must be 300`);
  });

  // Rahul paid 1200, share 300 -> net balance +900
  const rahul = result.find((p) => p.participantId === 'u-rahul');
  assert.equal(rahul.amountPaid, 1200);
  assert.equal(rahul.balance, 900, 'Rahul net balance must be +900 (owed to him)');

  // You paid 0, share 300 -> net balance -300
  const you = result.find((p) => p.participantId === 'u-you');
  assert.equal(you.amountPaid, 0);
  assert.equal(you.balance, -300, 'You net balance must be -300 (you owe)');

  // Sum of shares must equal total amount exactly (no penny leaks)
  const totalShares = result.reduce((sum, p) => sum + p.shareAmount, 0);
  assert.equal(totalShares, 1200);
}

// 3. Remainder Allocation on Odd Division (₹100 split 3 ways)
{
  const participants = [
    { id: 'p1', name: 'Person 1' },
    { id: 'p2', name: 'Person 2' },
    { id: 'p3', name: 'Person 3' },
  ];

  const result = splitEqually({
    totalAmount: 100,
    paidById: 'p1',
    participants,
  });

  // 10000 paise / 3 = 3333 paise each + 1 remainder
  const sumShares = result.reduce((sum, p) => sum + p.shareAmount, 0);
  assert.equal(sumShares, 100, 'Sum of shares with remainder must equal 100 exactly');
}

// 4. Exact Amounts Splitting
{
  const participants = [
    { id: 'p-you', name: 'You' },
    { id: 'p-rahul', name: 'Rahul' },
    { id: 'p-aman', name: 'Aman' },
    { id: 'p-zaid', name: 'Zaid' },
  ];

  const exactAmounts = {
    'p-you': 200,
    'p-rahul': 400,
    'p-aman': 300,
    'p-zaid': 300,
  };

  const result = splitByExactAmounts({
    totalAmount: 1200,
    paidById: 'p-rahul',
    participants,
    exactAmounts,
  });

  assert.equal(result.find((p) => p.participantId === 'p-you').shareAmount, 200);
  assert.equal(result.find((p) => p.participantId === 'p-rahul').shareAmount, 400);
  assert.equal(result.find((p) => p.participantId === 'p-aman').shareAmount, 300);
  assert.equal(result.find((p) => p.participantId === 'p-zaid').shareAmount, 300);

  // Mismatch error test
  assert.throws(() => {
    splitByExactAmounts({
      totalAmount: 1200,
      paidById: 'p-rahul',
      participants,
      exactAmounts: { ...exactAmounts, 'p-you': 100 }, // sum 1100 != 1200
    });
  }, /does not match total/);
}

// 5. Percentage Splitting
{
  const participants = [
    { id: 'p1', name: 'A' },
    { id: 'p2', name: 'B' },
    { id: 'p3', name: 'C' },
    { id: 'p4', name: 'D' },
  ];

  const percentages = { p1: 25, p2: 25, p3: 25, p4: 25 };
  const result = splitByPercentage({
    totalAmount: 1200,
    paidById: 'p1',
    participants,
    percentages,
  });

  result.forEach((p) => {
    assert.equal(p.shareAmount, 300);
  });

  // Percentage sum != 100 error test
  assert.throws(() => {
    splitByPercentage({
      totalAmount: 1200,
      paidById: 'p1',
      participants,
      percentages: { p1: 20, p2: 20, p3: 20, p4: 20 }, // 80% != 100%
    });
  }, /must equal 100%/);
}

// 6. Shares Splitting
{
  const participants = [
    { id: 'p-you', name: 'You' },
    { id: 'p-rahul', name: 'Rahul' },
    { id: 'p-aman', name: 'Aman' },
  ];

  // You = 1 share, Rahul = 2 shares, Aman = 1 share. Total shares = 4. Total = 1200.
  const shares = {
    'p-you': 1,
    'p-rahul': 2,
    'p-aman': 1,
  };

  const result = splitByShares({
    totalAmount: 1200,
    paidById: 'p-you',
    participants,
    shares,
  });

  assert.equal(result.find((p) => p.participantId === 'p-you').shareAmount, 300);
  assert.equal(result.find((p) => p.participantId === 'p-rahul').shareAmount, 600);
  assert.equal(result.find((p) => p.participantId === 'p-aman').shareAmount, 300);
}

// 7. Prompt Realistic Fixture (Section 44):
// A pays ₹1000, B share ₹300, C share ₹300, D share ₹400.
{
  const participants = [
    { id: 'A', name: 'Alice' },
    { id: 'B', name: 'Bob' },
    { id: 'C', name: 'Charlie' },
    { id: 'D', name: 'David' },
  ];

  const exactAmounts = { A: 0, B: 300, C: 300, D: 400 };
  const splitResult = splitByExactAmounts({
    totalAmount: 1000,
    paidById: 'A',
    participants,
    exactAmounts,
  });

  // Net balances
  const netAlice = splitResult.find((p) => p.participantId === 'A').balance;
  const netBob = splitResult.find((p) => p.participantId === 'B').balance;
  const netCharlie = splitResult.find((p) => p.participantId === 'C').balance;
  const netDavid = splitResult.find((p) => p.participantId === 'D').balance;

  assert.equal(netAlice, 1000, 'Alice net balance must be +1000');
  assert.equal(netBob, -300, 'Bob net balance must be -300');
  assert.equal(netCharlie, -300, 'Charlie net balance must be -300');
  assert.equal(netDavid, -400, 'David net balance must be -400');
}

// 8. Debt Simplification (Section 13)
// A owes B ₹500, B owes C ₹300 -> simplified to A owes B ₹200 and A owes C ₹300
{
  const debts = [
    { fromId: 'A', fromName: 'Alice', toId: 'B', toName: 'Bob', amount: 500 },
    { fromId: 'B', fromName: 'Bob', toId: 'C', toName: 'Charlie', amount: 300 },
  ];

  const simplified = simplifyDebts(debts);

  // Bob net: +500 - 300 = +200
  // Alice net: -500
  // Charlie net: +300
  // Total simplified transfers:
  const aliceToBob = simplified.find((d) => d.fromId === 'A' && d.toId === 'B');
  const aliceToCharlie = simplified.find((d) => d.fromId === 'A' && d.toId === 'C');

  assert.ok(aliceToBob, 'Should have A -> B transfer');
  assert.equal(aliceToBob.amount, 200, 'A owes B ₹200');

  assert.ok(aliceToCharlie, 'Should have A -> C transfer');
  assert.equal(aliceToCharlie.amount, 300, 'A owes C ₹300');

  // Bob does not owe Charlie directly anymore
  const bobToCharlie = simplified.find((d) => d.fromId === 'B' && d.toId === 'C');
  assert.equal(bobToCharlie, undefined, 'Bob to Charlie debt eliminated through transitivity');
}

// 9. Full & Partial Settlement Balance Calculation (Section 15, 16)
{
  const splitExpenses = [
    {
      id: 's1',
      title: 'Dinner',
      totalAmount: 1000,
      currency: 'INR',
      paidById: 'you',
      payerName: 'You',
      participants: [
        { participantId: 'you', participantName: 'You', shareAmount: 500, amountPaid: 1000, balance: 500 },
        { participantId: 'rahul', participantName: 'Rahul', shareAmount: 500, amountPaid: 0, balance: -500 },
      ],
    },
  ];

  // Rahul owes 500. Rahul pays partial 200:
  const settlements = [
    {
      id: 'set1',
      expenseId: 's1',
      fromId: 'rahul',
      fromName: 'Rahul',
      toId: 'you',
      toName: 'You',
      amount: 200,
      status: 'SETTLED',
    },
  ];

  const balances = calculateNetBalances(splitExpenses, settlements, 'you');
  assert.equal(balances.totalOwedToYou, 300, 'After ₹200 partial settlement, Rahul still owes ₹300');
  assert.equal(balances.totalYouOwe, 0);
  assert.equal(balances.netBalance, 300);

  // Full settlement: Rahul pays remaining 300
  settlements.push({
    id: 'set2',
    expenseId: 's1',
    fromId: 'rahul',
    fromName: 'Rahul',
    toId: 'you',
    toName: 'You',
    amount: 300,
    status: 'SETTLED',
  });

  const settledBalances = calculateNetBalances(splitExpenses, settlements, 'you');
  assert.equal(settledBalances.totalOwedToYou, 0, 'After full settlement, owed amount is 0');
  assert.equal(settledBalances.netBalance, 0);
}

console.log('✔ All SpendWise Split Engine Tests PASSED successfully!');
