import assert from 'node:assert/strict';
import {
  migrateV1ToV2,
  validateAppData,
  createDefaultAppData,
} from '../src/lib/storage.js';

console.log('[TEST] Running SpendWise Storage Migration & Schema Tests...');

// 1. Migrate legacy v1 data to v2
{
  const legacyV1Data = {
    version: 1,
    settings: {
      currencySymbol: '₹',
      currencyCode: 'INR',
    },
    monthPlans: [
      {
        monthKey: '2026-09',
        estimatedIncome: 80000,
        actualIncome: 0,
        savingsGoal: 10000,
        fixedExpenses: [{ id: 'f1', name: 'Rent', amount: 21799 }],
        updatedAt: '2026-09-01T00:00:00.000Z',
      },
    ],
    transactions: [
      {
        id: 't-1',
        date: '2026-09-05',
        amount: 8000,
        category: 'Food',
        note: 'Grocery haul',
        needWant: 'need',
        plannedUnplanned: 'planned',
        source: 'manual',
      },
    ],
  };

  const v2Data = migrateV1ToV2(legacyV1Data);

  // Assert version bump
  assert.equal(v2Data.version, 2, 'Migrated data must be version 2');

  // Assert historical budget & transaction preservation
  assert.equal(v2Data.monthPlans.length, 1);
  assert.equal(v2Data.monthPlans[0].monthKey, '2026-09');
  assert.equal(v2Data.monthPlans[0].estimatedIncome, 80000);
  assert.equal(v2Data.transactions.length, 1);
  assert.equal(v2Data.transactions[0].amount, 8000);

  // Assert currency settings preservation
  assert.equal(v2Data.settings.currencyCode, 'INR');
  assert.equal(v2Data.settings.currencySymbol, '₹');

  // Assert new v2 features initialized cleanly
  assert.ok(Array.isArray(v2Data.friends), 'Must have friends array');
  assert.ok(Array.isArray(v2Data.groups), 'Must have groups array');
  assert.ok(Array.isArray(v2Data.splitExpenses), 'Must have splitExpenses array');
  assert.ok(Array.isArray(v2Data.settlements), 'Must have settlements array');
  assert.equal(v2Data.settings.theme, 'system');
  assert.equal(v2Data.settings.accentColor, 'emerald');

  // Validate complete migrated structure passes schema validator
  assert.ok(validateAppData(v2Data), 'Migrated v2 structure must be 100% valid schema');
}

// 2. Default app data schema validity
{
  const defaultData = createDefaultAppData();
  assert.equal(defaultData.version, 2);
  assert.ok(validateAppData(defaultData), 'Default app data must be valid');
}

// 3. Corrupted data rejection
{
  assert.equal(validateAppData(null), false);
  assert.equal(validateAppData({}), false);
  assert.equal(validateAppData({ version: 2, settings: null }), false);
}

console.log('✔ All SpendWise Storage Migration & Schema Tests PASSED successfully!');
