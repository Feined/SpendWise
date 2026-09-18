import assert from 'node:assert/strict';
import { sanitizeFriend } from '../src/lib/storage.js';

console.log('[TEST] Running SpendWise Friends Lifecycle & Safety Tests...');

// Mock friend management logic replicating SpendWiseContext behavior
function createFriendsManager(initialFriends = [], splitExpenses = [], settlements = []) {
  let friends = [...initialFriends];

  const addFriend = (data) => {
    const friend = sanitizeFriend({
      ...data,
      id: data.id || `f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    });
    friends.push(friend);
    return friend;
  };

  const editFriend = (id, updates) => {
    friends = friends.map((f) => {
      if (f.id === id) {
        return sanitizeFriend({
          ...f,
          ...updates,
          updatedAt: new Date().toISOString()
        });
      }
      return f;
    });
  };

  const archiveFriend = (id) => {
    friends = friends.map((f) => {
      if (f.id === id) {
        return sanitizeFriend({
          ...f,
          isArchived: true,
          updatedAt: new Date().toISOString()
        });
      }
      return f;
    });
  };

  const restoreFriend = (id) => {
    friends = friends.map((f) => {
      if (f.id === id) {
        return sanitizeFriend({
          ...f,
          isArchived: false,
          updatedAt: new Date().toISOString()
        });
      }
      return f;
    });
  };

  const removeFriend = (id, force = false) => {
    const hasHistory =
      splitExpenses.some((s) => s.paidBy === id || s.participants?.some((p) => p.friendId === id || p.userId === id)) ||
      settlements.some((st) => st.fromUserId === id || st.toUserId === id);

    if (hasHistory && !force) {
      // Soft-archive so historical split expenses and balances are NEVER destroyed (Req 3, 36)
      archiveFriend(id);
    } else {
      friends = friends.filter((f) => f.id !== id);
    }
  };

  const getActiveFriends = () => friends.filter((f) => !f.isArchived);
  const getArchivedFriends = () => friends.filter((f) => !!f.isArchived);

  return {
    getFriends: () => friends,
    getActiveFriends,
    getArchivedFriends,
    addFriend,
    editFriend,
    archiveFriend,
    restoreFriend,
    removeFriend
  };
}

// 1. Friend Creation (Req 1)
{
  console.log('-> 1. Testing Friend Creation...');
  const manager = createFriendsManager();
  const rahul = manager.addFriend({
    name: 'Rahul Sharma',
    email: 'rahul@example.com',
    color: '#10b981'
  });

  assert.ok(rahul.id);
  assert.equal(rahul.name, 'Rahul Sharma');
  assert.equal(rahul.email, 'rahul@example.com');
  assert.equal(rahul.avatar, 'R');
  assert.equal(rahul.isArchived, false);
  assert.ok(rahul.createdAt);
  assert.equal(manager.getActiveFriends().length, 1);
  assert.equal(manager.getArchivedFriends().length, 0);
}

// 2. Friend Editing (Req 1)
{
  console.log('-> 2. Testing Friend Editing...');
  const manager = createFriendsManager();
  const rahul = manager.addFriend({ name: 'Rahul' });
  manager.editFriend(rahul.id, { name: 'Rahul V. Sharma', email: 'rahul.v@gmail.com' });

  const updated = manager.getFriends().find((f) => f.id === rahul.id);
  assert.equal(updated.name, 'Rahul V. Sharma');
  assert.equal(updated.email, 'rahul.v@gmail.com');
  assert.ok(updated.updatedAt);
}

// 3. Friend Archiving & Restoration (Req 3, 8)
{
  console.log('-> 3. Testing Friend Archiving & Restoration...');
  const manager = createFriendsManager();
  const rahul = manager.addFriend({ name: 'Rahul' });

  manager.archiveFriend(rahul.id);
  assert.equal(manager.getActiveFriends().length, 0, 'Archived friend disappears from active friends list');
  assert.equal(manager.getArchivedFriends().length, 1, 'Archived friend appears in archived list');
  assert.equal(manager.getFriends().length, 1, 'Friend record is retained');

  manager.restoreFriend(rahul.id);
  assert.equal(manager.getActiveFriends().length, 1, 'Restored friend returns to active friends list');
  assert.equal(manager.getArchivedFriends().length, 0);
}

// 4. Friend Deletion Safety: Non-Destructive Soft-Archive when History Exists (Req 3, 36)
{
  console.log('-> 4. Testing Friend Deletion Safety with Historical Records...');
  const splitHistory = [
    {
      id: 'sp-dinner',
      title: 'Dinner',
      totalAmount: 1200,
      paidBy: 'f-rahul',
      participants: [{ friendId: 'f-rahul' }, { friendId: 'user-self' }]
    }
  ];

  const manager = createFriendsManager(
    [
      { id: 'f-rahul', name: 'Rahul', isArchived: false },
      { id: 'f-clean', name: 'Clean Peer', isArchived: false }
    ],
    splitHistory,
    []
  );

  // Remove Rahul who has historical records -> MUST soft-archive instead of deleting
  manager.removeFriend('f-rahul');
  assert.equal(manager.getActiveFriends().length, 1, 'Active friends now only contains Clean Peer');
  assert.equal(manager.getArchivedFriends().length, 1, 'Rahul is archived, preserving historical records');
  assert.ok(manager.getFriends().some((f) => f.id === 'f-rahul'), 'Rahul record remains in storage');

  // Remove Clean Peer who has NO history -> safe hard removal
  manager.removeFriend('f-clean');
  assert.equal(manager.getActiveFriends().length, 0);
  assert.equal(manager.getFriends().length, 1, 'Clean Peer hard deleted, Rahul remains archived');
}

console.log('[PASS] All Friends Lifecycle & Safety Tests passed successfully!\n');
