// SpendWise Mandatory Cross-Account & Auth Persistence E2E Test
import assert from 'node:assert';

// Mock localStorage and window environment for Node.js test execution
const storageStore = new Map();
globalThis.localStorage = {
  getItem: (key) => storageStore.get(key) || null,
  setItem: (key, val) => storageStore.set(key, String(val)),
  removeItem: (key) => storageStore.delete(key),
  clear: () => storageStore.clear(),
};
globalThis.window = {
  dispatchEvent: () => {},
  navigator: { onLine: true }
};

const API_BASE_URL = 'http://localhost:5000/api';

console.log('====================================================');
console.log('👥 MANDATORY CROSS-ACCOUNT & AUTH PERSISTENCE TEST');
console.log(`📡 Backend Server: ${API_BASE_URL}`);
console.log('====================================================\n');

async function run() {
  const ts = Date.now();
  const userA_email = `user_a_${ts}@spendwise.test`;
  const userB_email = `user_b_${ts}@spendwise.test`;
  const password = 'Password123!';

  // Import API modules
  const { authApi } = await import('../src/api/authApi.js');
  const { transactionApi } = await import('../src/api/transactionApi.js');
  const { friendApi } = await import('../src/api/friendApi.js');
  const { groupsApi } = await import('../src/api/groupsApi.js');
  const { splitApi } = await import('../src/api/splitApi.js');
  const { setAuthToken, clearAuthTokens, getAuthToken } = await import('../src/api/client.js');

  // ----------------------------------------------------
  // PART 1: REGISTER USER A & USER B
  // ----------------------------------------------------
  console.log('Step 1: Registering User A & User B on PostgreSQL...');
  clearAuthTokens();
  const regA = await authApi.register({ email: userA_email, password, name: 'User Alpha' });
  assert(regA.user?.id, 'User A must have an ID');
  const userA_id = regA.user.id;
  const userA_token = regA.token;
  console.log(`  ✔ User A registered: ${regA.user.name} (${userA_id})`);

  clearAuthTokens();
  const regB = await authApi.register({ email: userB_email, password, name: 'User Beta' });
  assert(regB.user?.id, 'User B must have an ID');
  const userB_id = regB.user.id;
  const userB_token = regB.token;
  console.log(`  ✔ User B registered: ${regB.user.name} (${userB_id})`);

  // ----------------------------------------------------
  // PART 2: AUTHENTICATE AS USER A & CREATE PRIVATE DATA
  // ----------------------------------------------------
  console.log('\nStep 2: Authenticating as User A...');
  clearAuthTokens();
  setAuthToken(userA_token);
  const meA = await authApi.getMe();
  assert.strictEqual(meA.user.id, userA_id);
  console.log(`  ✔ User A authenticated successfully`);

  console.log('\nStep 3: User A creates a PRIVATE personal transaction...');
  const txA = await transactionApi.createTransaction({
    amount: 1450,
    category: 'shopping',
    merchant: 'Online Course Book',
    note: 'Confidential personal purchase',
    needWant: 'need',
    plannedUnplanned: 'planned',
    date: new Date().toISOString()
  });
  const txA_id = txA.transaction.id;
  assert(txA_id, 'Private transaction must be created');
  console.log(`  ✔ User A created private transaction: ₹1,450 (ID: ${txA_id})`);

  // ----------------------------------------------------
  // PART 3: USER A SENDS FRIEND REQUEST -> USER B ACCEPTS
  // ----------------------------------------------------
  console.log('\nStep 4: User A searches for User B and sends Friend Request...');
  const searchResults = await friendApi.searchUsers('User Beta');
  const foundB = searchResults.users.find(u => u.id === userB_id);
  assert(foundB, 'User A must be able to discover User B by name');
  console.log(`  ✔ User A found registered User B: ${foundB.name} (${foundB.email})`);

  const reqRes = await friendApi.sendFriendRequest(userB_id);
  assert(reqRes.success, 'Friend request must be sent successfully');
  console.log(`  ✔ User A sent friendship request to User B`);

  console.log('\nStep 5: Authenticate as User B to accept Friend Request...');
  clearAuthTokens();
  setAuthToken(userB_token);
  const bRequests = await friendApi.getFriendRequests();
  const incomingReq = bRequests.incoming.find(r => r.userId === userA_id);
  assert(incomingReq, 'User B must see incoming request from User A');
  console.log(`  ✔ User B sees incoming request from ${incomingReq.user.name}`);

  const acceptRes = await friendApi.acceptFriendRequest(incomingReq.id);
  assert(acceptRes.success, 'User B accepted friendship');
  console.log(`  ✔ User B accepted friendship! Bilateral friendship connected.`);

  // ----------------------------------------------------
  // PART 4: USER A CREATES GROUP & ₹1,000 SPLIT EXPENSE
  // ----------------------------------------------------
  console.log('\nStep 6: Authenticate as User A and create shared Group "Goa Trip"...');
  clearAuthTokens();
  setAuthToken(userA_token);

  const groupRes = await groupsApi.createGroup({
    name: 'Goa Trip',
    currency: 'INR',
    members: [
      { userId: userA_id, name: 'User Alpha', role: 'ADMIN' },
      { userId: userB_id, name: 'User Beta', role: 'MEMBER' }
    ]
  });
  const group = groupRes.group;
  assert(group?.id, 'Group must have an ID');
  assert(group.inviteCode, 'Group must have an invite code');
  console.log(`  ✔ Group created: "${group.name}" (ID: ${group.id}, Invite Code: ${group.inviteCode})`);
  console.log(`    Members: ${group.members.map(m => m.user?.name || m.name).join(', ')}`);

  console.log('\nStep 7: User A creates ₹1,000 shared expense split equally...');
  const splitRes = await splitApi.createSplit({
    groupId: group.id,
    title: 'Beachside Seafood Dinner',
    totalAmount: 1000,
    currency: 'INR',
    paidById: userA_id,
    payerName: 'User Alpha',
    splitMethod: 'EQUALLY',
    date: new Date().toISOString().slice(0, 10),
    participants: [
      {
        participantId: userA_id,
        participantName: 'User Alpha',
        shareAmount: 500,
        amountPaid: 1000,
        balance: 0
      },
      {
        participantId: userB_id,
        participantName: 'User Beta',
        shareAmount: 500,
        amountPaid: 0,
        balance: 500
      }
    ]
  });
  const split = splitRes.split;
  assert.strictEqual(split.totalAmount, 1000);
  const debtorB = split.participants.find(p => p.participantId === userB_id);
  assert.strictEqual(debtorB.balance, 500, 'User B must owe ₹500');
  console.log(`  ✔ Split expense created: "${split.title}" ₹1,000. User B owes ₹500`);

  // ----------------------------------------------------
  // PART 5: USER B AUTHENTICATES & VERIFIES SHARED STATE
  // ----------------------------------------------------
  console.log('\nStep 8: Authenticate as User B (Cross-Account Verification)...');
  clearAuthTokens();
  setAuthToken(userB_token);
  const meB = await authApi.getMe();
  assert.strictEqual(meB.user.id, userB_id);

  console.log('  -> Verifying User B can see the shared Group...');
  const bGroups = await groupsApi.getGroups();
  const foundGroupB = bGroups.groups.find(g => g.id === group.id);
  assert(foundGroupB, 'User B MUST see the exact same shared group in PostgreSQL');
  console.log(`  ✔ Verified: User B sees shared group "${foundGroupB.name}"`);

  console.log('  -> Verifying User B can see the shared Split Expense & Owed Amount...');
  const bSplits = await splitApi.getSplits();
  const foundSplitB = bSplits.splits.find(s => s.id === split.id);
  assert(foundSplitB, 'User B MUST see the shared split expense');
  const bParticipantRecord = foundSplitB.participants.find(p => p.participantId === userB_id);
  assert(bParticipantRecord, 'User B must be a participant');
  assert.strictEqual(bParticipantRecord.balance, 500, 'User B owes balance of ₹500');
  console.log(`  ✔ Verified: User B sees shared bill "${foundSplitB.title}" with outstanding debt ₹${bParticipantRecord.balance}`);

  console.log('  -> Verifying PRIVACY ISOLATION: User B CANNOT see User A private transactions...');
  const bTxs = await transactionApi.getTransactions();
  const leakedTx = bTxs.transactions.find(t => t.id === txA_id);
  assert.strictEqual(leakedTx, undefined, 'CRITICAL: User B must NEVER see User A private transactions');
  console.log(`  ✔ Verified PRIVACY ISOLATION: User A personal transactions are completely invisible to User B.`);

  // ----------------------------------------------------
  // PART 6: USER B SETTLES ₹500 DEBT ATOMICALLY
  // ----------------------------------------------------
  console.log('\nStep 9: User B settles ₹500 debt via splitApi.settleSplit...');
  const settleRes = await splitApi.settleSplit(split.id, {
    expenseId: split.id,
    fromId: userB_id,
    fromName: 'User Beta',
    toId: userA_id,
    toName: 'User Alpha',
    amount: 500,
    currency: 'INR',
    note: 'GPay payment'
  });
  assert(settleRes.settlement, 'Settlement must be recorded');
  assert.strictEqual(settleRes.settlement.amount, 500);
  console.log(`  ✔ Settlement confirmed: User B paid ₹500 to User A.`);

  // ----------------------------------------------------
  // PART 7: USER A VERIFIES SETTLEMENT & 0 BALANCE
  // ----------------------------------------------------
  console.log('\nStep 10: Authenticate as User A and verify updated group ledger...');
  clearAuthTokens();
  setAuthToken(userA_token);

  const aSplitsAfter = await splitApi.getSplits();
  const splitAfterA = aSplitsAfter.splits.find(s => s.id === split.id);
  const debtorB_after = splitAfterA.participants.find(p => p.participantId === userB_id);
  assert.strictEqual(debtorB_after.balance, 0, 'User B balance must now be 0 after settlement');
  assert.strictEqual(debtorB_after.settledAmount, 500, 'User B settled amount must be 500');
  console.log(`  ✔ Verified on User A view: User B debt balance is now ₹${debtorB_after.balance} (Settled: ₹${debtorB_after.settledAmount})`);
  console.log(`  ✔ Split Status: ${splitAfterA.status}`);

  // ----------------------------------------------------
  // PART 8: AUTH PERSISTENCE TEST (REFRESH, LOGOUT, RE-LOGIN)
  // ----------------------------------------------------
  console.log('\nStep 11: Testing Auth Persistence (Browser Refresh, Logout, Login Again)...');
  console.log('  -> Simulating Browser Refresh: Validating session restore via /me...');
  const refreshMe = await authApi.getMe();
  assert.strictEqual(refreshMe.user.id, userA_id);
  console.log('  ✔ Browser refresh restores user identity from PostgreSQL session');

  console.log('  -> Logging out User A...');
  await authApi.logout();
  clearAuthTokens();
  console.log('  ✔ Tokens cleared from client. Database records remain intact.');

  console.log('  -> Logging back in as User A with credentials...');
  const loginA = await authApi.login({ email: userA_email, password });
  assert.strictEqual(loginA.user.id, userA_id);
  setAuthToken(loginA.token);
  console.log(`  ✔ Logged in as User A: ${loginA.user.email}`);

  console.log('  -> Verifying ALL cloud data restored from PostgreSQL...');
  const restoredTxs = await transactionApi.getTransactions();
  const foundRestoredTx = restoredTxs.transactions.find(t => t.id === txA_id);
  assert(foundRestoredTx, 'User A private transaction MUST persist across logout/login');
  assert.strictEqual(foundRestoredTx.amount, 1450);

  const restoredGroups = await groupsApi.getGroups();
  assert(restoredGroups.groups.some(g => g.id === group.id), 'Shared group MUST persist across logout/login');

  const restoredSplits = await splitApi.getSplits();
  assert(restoredSplits.splits.some(s => s.id === split.id), 'Split expenses & settlements MUST persist across logout/login');
  console.log('  ✔ ALL previous cloud data verified in PostgreSQL after logout and re-login!');

  console.log('\n====================================================');
  console.log('🏆 MANDATORY CROSS-ACCOUNT & AUTH PERSISTENCE TEST PASSED 100%!');
  console.log('====================================================\n');
}

run().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
