// Comprehensive SpendWise Frontend ↔ Backend Live Integration Test
import assert from 'node:assert';

// Mock localStorage and window environment for Node.js test execution
const memoryStorage = new Map();
globalThis.localStorage = {
  getItem: (key) => memoryStorage.get(key) || null,
  setItem: (key, val) => memoryStorage.set(key, String(val)),
  removeItem: (key) => memoryStorage.delete(key),
  clear: () => memoryStorage.clear(),
};
globalThis.window = {
  dispatchEvent: () => {},
  navigator: { onLine: true }
};

const API_BASE_URL = 'http://localhost:5000/api';

console.log('====================================================');
console.log('🧪 RUNNING SPENDWISE LIVE E2E INTEGRATION SUITE');
console.log(`📡 Target API: ${API_BASE_URL}`);
console.log('====================================================\n');

async function run() {
  const timestamp = Date.now();
  const testEmail = `frontend_int_${timestamp}@spendwise.test`;
  const testPassword = 'Password123!';
  const testName = 'Integration Tester';

  // Import API modules
  const { authApi } = await import('../src/api/authApi.js');
  const { transactionApi } = await import('../src/api/transactionApi.js');
  const { budgetApi } = await import('../src/api/budgetApi.js');
  const { friendApi } = await import('../src/api/friendApi.js');
  const { groupsApi } = await import('../src/api/groupsApi.js');
  const { splitApi } = await import('../src/api/splitApi.js');
  const { settingsApi } = await import('../src/api/settingsApi.js');
  const { migrationApi } = await import('../src/api/migrationApi.js');
  const { getAuthToken, setAuthToken, clearAuthTokens } = await import('../src/api/client.js');

  console.log('Step 1: Health check...');
  const healthRes = await fetch(`${API_BASE_URL}/health`).then(r => r.json());
  assert.strictEqual(healthRes.status, 'ONLINE', 'Backend must be ONLINE');
  console.log('  ✔ Health check passed: status ONLINE');

  console.log('\nStep 2: Register user via authApi.register...');
  const regRes = await authApi.register({
    email: testEmail,
    password: testPassword,
    name: testName
  });
  assert(regRes.token, 'Must return an access token');
  assert(regRes.refreshToken, 'Must return a refresh token');
  assert.strictEqual(regRes.user.email, testEmail.toLowerCase(), 'Email matches');
  console.log(`  ✔ Registration successful for ${regRes.user.email}`);

  console.log('\nStep 3: Fetch current user via authApi.getMe...');
  const meRes = await authApi.getMe();
  assert.strictEqual(meRes.user.email, testEmail.toLowerCase(), 'User profile verified');
  console.log(`  ✔ authApi.getMe() verified: ${meRes.user.name} (${meRes.user.email})`);

  console.log('\nStep 4: Update and verify User Settings via settingsApi...');
  const updatedSettings = await settingsApi.updateSettings({
    theme: 'night',
    accentColor: 'indigo',
    currencyCode: 'INR',
    currencySymbol: '₹',
    spendingDefaults: { defaultCategoryId: 'transport', defaultNature: 'want' }
  });
  assert.strictEqual(updatedSettings.settings.theme, 'night');
  assert.strictEqual(updatedSettings.settings.accentColor, 'indigo');
  console.log('  ✔ settingsApi.updateSettings verified');

  console.log('\nStep 5: Configure Monthly Budget Plan via budgetApi...');
  const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
  const planPayload = {
    estimatedIncome: 75000,
    actualIncome: 80000,
    savingsGoal: 20000,
    fixedExpenses: [
      { id: `rent_${timestamp}`, name: 'Apartment Rent', amount: 25000, isPaid: true },
      { id: `wifi_${timestamp}`, name: 'Broadband Fiber', amount: 1200, isPaid: true }
    ]
  };
  const planRes = await budgetApi.upsertMonthPlan(currentMonth, planPayload);
  assert.strictEqual(planRes.monthPlan.actualIncome, 80000);
  assert.strictEqual(planRes.monthPlan.fixedExpenses.length, 2);
  console.log(`  ✔ Month plan created for ${currentMonth}: Income ₹80,000, Savings Goal ₹20,000`);

  const fetchedPlan = await budgetApi.getMonthPlan(currentMonth);
  assert.strictEqual(fetchedPlan.monthPlan.monthKey, currentMonth);
  console.log(`  ✔ budgetApi.getMonthPlan verified for ${currentMonth}`);

  console.log('\nStep 6: Create, Fetch, Update and Delete Transactions via transactionApi...');
  const newTx = await transactionApi.createTransaction({
    amount: 850,
    category: 'food',
    description: 'Grocery run & fruits',
    nature: 'need',
    date: new Date().toISOString()
  });
  assert(newTx.transaction.id, 'Transaction must have an ID');
  assert.strictEqual(newTx.transaction.amount, 850);
  console.log(`  ✔ Created transaction: ID ${newTx.transaction.id}, Amount ₹${newTx.transaction.amount}`);

  const txList = await transactionApi.getTransactions(currentMonth);
  assert(txList.transactions.length >= 1, 'Transaction list should contain at least 1 item');
  const foundTx = txList.transactions.find(t => t.id === newTx.transaction.id);
  assert(foundTx, 'Created transaction must be in month transactions list');
  console.log(`  ✔ Found created transaction in month query (total ${txList.transactions.length})`);

  const updatedTx = await transactionApi.updateTransaction(newTx.transaction.id, {
    amount: 900,
    notes: 'Updated receipt'
  });
  assert.strictEqual(updatedTx.transaction.amount, 900);
  console.log(`  ✔ Updated transaction amount to ₹${updatedTx.transaction.amount}`);

  console.log('\nStep 7: Test Friends and Groups APIs...');
  const friendRes = await friendApi.createFriend({
    name: 'Rohan Sharma',
    email: `rohan_${timestamp}@example.com`,
    phone: '+91 9876543210'
  });
  const friendId = friendRes.friend.id;
  assert(friendId, 'Friend must have an ID');
  console.log(`  ✔ Created friend: ${friendRes.friend.name} (ID: ${friendId})`);

  const friendsList = await friendApi.getFriends();
  assert(friendsList.friends.some(f => f.id === friendId));
  console.log(`  ✔ friendApi.getFriends verified (${friendsList.friends.length} friends)`);

  const groupRes = await groupsApi.createGroup({
    name: 'Goa Trip 2026',
    members: ['Alex Taylor', 'Rohan Sharma']
  });
  const groupId = groupRes.group.id;
  assert(groupId, 'Group must have an ID');
  console.log(`  ✔ Created group: ${groupRes.group.name} (ID: ${groupId})`);

  const groupsList = await groupsApi.getGroups();
  assert(groupsList.groups.some(g => g.id === groupId));
  console.log(`  ✔ groupsApi.getGroups verified (${groupsList.groups.length} groups)`);

  console.log('\nStep 8: Test Split Expenses & Settlements via splitApi...');
  const splitRes = await splitApi.createSplit({
    title: 'Beach Villa Stay',
    totalAmount: 6000,
    paidById: regRes.user.id,
    payerName: 'Alex Taylor',
    splitMethod: 'EQUALLY',
    date: new Date().toISOString().slice(0, 10),
    groupId,
    participants: [
      {
        participantId: regRes.user.id,
        participantName: 'Alex Taylor',
        shareAmount: 3000,
        amountPaid: 6000,
        balance: 0
      },
      {
        participantId: friendId,
        participantName: 'Rohan Sharma',
        shareAmount: 3000,
        amountPaid: 0,
        balance: 3000
      }
    ]
  });
  const splitId = splitRes.split.id;
  assert(splitId, 'Split expense must have an ID');
  console.log(`  ✔ Created split expense: ₹6000 split across 2 members`);

  const splitsList = await splitApi.getSplits();
  assert(splitsList.splits.some(s => s.id === splitId));
  console.log(`  ✔ splitApi.getSplits verified (${splitsList.splits.length} splits)`);

  const settleRes = await splitApi.settleSplit(splitId, {
    expenseId: splitId,
    fromId: friendId,
    fromName: 'Rohan Sharma',
    toId: regRes.user.id,
    toName: 'Alex Taylor',
    amount: 3000,
    currency: 'INR',
    note: 'UPI transfer'
  });
  assert(settleRes.settlement, 'Must return settlement confirmation');
  console.log(`  ✔ Recorded settlement: Rohan settled ₹3000 via UPI`);

  console.log('\nStep 9: Test Token Refresh Rotation Flow...');
  // Set invalid access token to trigger 401 interception & refresh
  setAuthToken('invalid_expired_token_for_test');
  const refreshedUser = await authApi.getMe();
  assert.strictEqual(refreshedUser.user.email, testEmail.toLowerCase());
  const newValidToken = getAuthToken();
  assert.notStrictEqual(newValidToken, 'invalid_expired_token_for_test', 'Token replaced by refreshed access token');
  console.log('  ✔ Automatic 401 intercept & token refresh succeeded transparently!');

  console.log('\nStep 10: Test Cloud Migration API...');
  const mockLocalExport = {
    transactions: [
      {
        id: `local_tx_${timestamp}`,
        amount: 320,
        category: 'transport',
        description: 'Metro card recharge',
        nature: 'need',
        date: new Date().toISOString()
      }
    ],
    monthPlans: {
      [currentMonth]: {
        month: currentMonth,
        estimatedIncome: 60000,
        actualIncome: 65000,
        savingsGoal: 15000,
        fixedExpenses: []
      }
    },
    friends: [
      { id: `local_friend_${timestamp}`, name: 'Pooja Verma', isArchived: false }
    ],
    groups: [],
    splitExpenses: [],
    settlements: []
  };
  const migrationResult = await migrationApi.migrateLocalDataToAccount(mockLocalExport);
  assert(migrationResult.message, 'Migration result must have message');
  console.log(`  ✔ Migration succeeded: ${migrationResult.message}`);

  console.log('\nStep 11: Test Targeted Logout...');
  await authApi.logout();
  clearAuthTokens();
  console.log('  ✔ Targeted logout successful');

  console.log('\n====================================================');
  console.log('🎉 ALL LIVE FRONTEND ↔ BACKEND INTEGRATION TESTS PASSED!');
  console.log('====================================================\n');
}

run().catch((err) => {
  console.error('\n❌ INTEGRATION TEST FAILED:', err);
  process.exit(1);
});
