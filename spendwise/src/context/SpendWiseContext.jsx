/* oxlint-disable react/only-export-components */
import { createContext, useState, useEffect, useCallback, useContext, useMemo } from 'react';
import {
  DEFAULT_APP_DATA,
  createDefaultAppData,
  loadAppData,
  saveAppData,
  clearAppData,
  sanitizeMonthPlan,
  sanitizeTransaction,
  sanitizeSplitExpense,
  sanitizeSettlement,
  sanitizeFriend,
} from '../lib/storage';
import { getCurrentMonthKey } from '../lib/budget';
import { applyThemeToDocument, THEME_MODES } from '../constants/theme';
import { formatMoney, getCurrencyConfig } from '../lib/currency';
import {
  getUnifiedFinancialSummary,
  buildUnifiedActivityTimeline,
  getFriendFinancialProfile,
} from '../lib/financialEngine';
import {
  authApi,
  budgetApi,
  transactionApi,
  friendApi,
  groupsApi,
  splitApi,
  settingsApi,
  migrationApi,
  getAuthToken,
  clearAuthTokens,
} from '../api';

export const SpendWiseContext = createContext(null);

export function SpendWiseProvider({ children }) {
  const [appData, setAppData] = useState(createDefaultAppData);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Global Modals
  const [isPaymentHubOpen, setIsPaymentHubOpen] = useState(false);
  const [paymentHubDefaultTab, setPaymentHubDefaultTab] = useState('manual');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Cloud / Auth State
  const [currentUser, setCurrentUser] = useState(null);
  const [authToken, setAuthTokenState] = useState(null);
  const [isCloudSynced, setIsCloudSynced] = useState(false);

  // Social Friend Requests
  const [friendRequests, setFriendRequests] = useState({ incoming: [], outgoing: [] });

  const openPaymentHub = useCallback((tab = 'manual') => {
    setPaymentHubDefaultTab(tab);
    setIsPaymentHubOpen(true);
  }, []);

  const closePaymentHub = useCallback(() => {
    setIsPaymentHubOpen(false);
  }, []);

  const openAuthModal = useCallback(() => {
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  /**
   * Initializes guest state from localStorage and applies document theme.
   */
  const initializeData = useCallback(() => {
    setIsLoading(true);
    setError(null);
    try {
      const data = loadAppData();
      setAppData(data);
      applyThemeToDocument(data.settings?.theme, data.settings?.accentColor);
    } catch (err) {
      console.error('[SpendWise] Error loading data from storage:', err);
      setError(err.message || 'An unexpected error occurred while loading your data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Fetches all cloud data from SpendWise PostgreSQL backend API and synchronizes state.
   */
  const fetchCloudData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [plansRes, txRes, friendsRes, groupsRes, splitsRes, settingsRes, reqRes] =
        await Promise.allSettled([
          budgetApi.getMonthPlans(),
          transactionApi.getTransactions(),
          friendApi.getFriends(),
          groupsApi.getGroups(),
          splitApi.getSplits(),
          settingsApi.getSettings(),
          friendApi.getFriendRequests(),
        ]);

      if (reqRes.status === 'fulfilled' && reqRes.value?.success) {
        setFriendRequests({
          incoming: reqRes.value.incoming || [],
          outgoing: reqRes.value.outgoing || [],
        });
      }

      setAppData((prev) => {
        const nextPlans =
          plansRes.status === 'fulfilled' && plansRes.value?.monthPlans
            ? plansRes.value.monthPlans
            : prev.monthPlans || [];

        const nextTx =
          txRes.status === 'fulfilled' && txRes.value?.transactions
            ? txRes.value.transactions.map((t) => ({
                ...t,
                label: t.merchant || t.label || '',
                categoryId: (t.category || 'other').toLowerCase(),
              }))
            : prev.transactions || [];

        const nextFriends =
          friendsRes.status === 'fulfilled' && friendsRes.value?.friends
            ? friendsRes.value.friends
            : prev.friends || [];

        const nextGroups =
          groupsRes.status === 'fulfilled' && groupsRes.value?.groups
            ? groupsRes.value.groups
            : prev.groups || [];

        const nextSplits =
          splitsRes.status === 'fulfilled' && splitsRes.value?.splits
            ? splitsRes.value.splits
            : prev.splitExpenses || [];

        const nextSettlements =
          splitsRes.status === 'fulfilled' && splitsRes.value?.splits
            ? splitsRes.value.splits.flatMap((s) => s.settlements || [])
            : prev.settlements || [];

        const nextSettings =
          settingsRes.status === 'fulfilled' && settingsRes.value?.settings
            ? { ...prev.settings, ...settingsRes.value.settings }
            : prev.settings;

        const nextAppData = {
          ...prev,
          monthPlans: nextPlans,
          transactions: nextTx,
          friends: nextFriends,
          groups: nextGroups,
          splitExpenses: nextSplits,
          settlements: nextSettlements,
          settings: nextSettings,
        };

        if (nextSettings.theme || nextSettings.accentColor) {
          applyThemeToDocument(nextSettings.theme, nextSettings.accentColor);
        }

        return nextAppData;
      });

      setIsCloudSynced(true);
    } catch (err) {
      console.warn('[SpendWise Cloud Sync] Error fetching cloud records:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Boot lifecycle: Restores session if auth token exists; falls back to clean guest state.
   */
  useEffect(() => {
    const initSession = async () => {
      const token = getAuthToken();
      if (token) {
        try {
          const res = await authApi.getMe();
          if (res?.user) {
            setCurrentUser(res.user);
            setAuthTokenState(token);
            await fetchCloudData();
            return;
          }
        } catch (err) {
          console.warn('[SpendWise] Stored auth token expired or invalid:', err.message);
          clearAuthTokens();
          setCurrentUser(null);
          setAuthTokenState(null);
        }
      }
      initializeData();
    };

    initSession();

    const handleSessionExpired = () => {
      setCurrentUser(null);
      setAuthTokenState(null);
      setIsCloudSynced(false);
      initializeData();
    };

    window.addEventListener('spendwise:session-expired', handleSessionExpired);
    return () => window.removeEventListener('spendwise:session-expired', handleSessionExpired);
  }, [fetchCloudData, initializeData]);

  // System theme changes listener
  useEffect(() => {
    const currentTheme = appData?.settings?.theme || THEME_MODES.SYSTEM;
    if (currentTheme !== THEME_MODES.SYSTEM || typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      applyThemeToDocument(THEME_MODES.SYSTEM, appData?.settings?.accentColor);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [appData?.settings?.theme, appData?.settings?.accentColor]);

  /**
   * User Authentication Actions
   */
  const loginUser = useCallback(
    async ({ email, password }) => {
      const res = await authApi.login({ email, password });
      if (res?.user && res?.token) {
        setCurrentUser(res.user);
        setAuthTokenState(res.token);
        await fetchCloudData();
      }
      return res;
    },
    [fetchCloudData]
  );

  const registerUser = useCallback(
    async ({ email, password, name, migrateLocal = false }) => {
      const currentLocalData = loadAppData();
      const res = await authApi.register({ email, password, name });
      if (res?.user && res?.token) {
        setCurrentUser(res.user);
        setAuthTokenState(res.token);

        // Only migrate if user actually created local transactions or plans
        const hasLocalFinancialData =
          (currentLocalData?.transactions && currentLocalData.transactions.length > 0) ||
          (currentLocalData?.monthPlans && currentLocalData.monthPlans.length > 0);

        if (migrateLocal && hasLocalFinancialData) {
          try {
            await migrationApi.migrateLocalDataToAccount(currentLocalData);
          } catch (mErr) {
            console.warn('[SpendWise Migration] Initial migration error:', mErr);
          }
        }

        await fetchCloudData();
      }
      return res;
    },
    [fetchCloudData]
  );

  const logoutUser = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors during logout
    } finally {
      clearAuthTokens();
      setCurrentUser(null);
      setAuthTokenState(null);
      setIsCloudSynced(false);
      setFriendRequests({ incoming: [], outgoing: [] });
      // Reset in-memory data to clean default guest state without destroying PostgreSQL records
      const fresh = createDefaultAppData();
      setAppData(fresh);
      applyThemeToDocument(fresh.settings.theme, fresh.settings.accentColor);
    }
  }, []);

  const migrateLocalDataToCloud = useCallback(async () => {
    if (!getAuthToken()) {
      throw new Error('You must be signed in to migrate local data.');
    }
    const currentLocal = loadAppData();
    const res = await migrationApi.migrateLocalDataToAccount(currentLocal);
    await fetchCloudData();
    return res;
  }, [fetchCloudData]);

  /**
   * Updates user settings and persists to storage while updating theme.
   */
  const updateSettings = useCallback(
    async (newSettings) => {
      setAppData((prev) => {
        const updated = {
          ...prev,
          settings: {
            ...prev.settings,
            ...newSettings,
          },
        };

        try {
          if (!getAuthToken()) {
            saveAppData(updated);
          }
          if (newSettings.theme || newSettings.accentColor) {
            applyThemeToDocument(updated.settings.theme, updated.settings.accentColor);
          }
          return updated;
        } catch (err) {
          console.error('[SpendWise] Error saving settings:', err);
          setError(err.message || 'Failed to update settings.');
          return prev;
        }
      });

      if (getAuthToken()) {
        try {
          await settingsApi.updateSettings(newSettings);
        } catch (err) {
          console.warn('[SpendWise Settings] Cloud sync warning:', err.message);
        }
      }
    },
    []
  );

  /**
   * Month Plans Management
   */
  const getMonthPlan = useCallback(
    (monthKey) => {
      if (!appData.monthPlans) return null;
      return appData.monthPlans.find((p) => p.monthKey === monthKey) || null;
    },
    [appData.monthPlans]
  );

  const currentMonthPlan = getMonthPlan(selectedMonth);

  const saveMonthPlan = useCallback(
    async (monthPlanData) => {
      const targetMonthKey = monthPlanData.monthKey || selectedMonth;
      const sanitized = sanitizeMonthPlan({
        ...monthPlanData,
        monthKey: targetMonthKey,
        updatedAt: new Date().toISOString(),
      });

      setAppData((prev) => {
        const existingPlans = Array.isArray(prev.monthPlans) ? prev.monthPlans : [];
        const index = existingPlans.findIndex((p) => p.monthKey === targetMonthKey);

        let nextPlans;
        if (index >= 0) {
          nextPlans = [...existingPlans];
          nextPlans[index] = sanitized;
        } else {
          nextPlans = [...existingPlans, sanitized];
        }

        const nextAppData = {
          ...prev,
          monthPlans: nextPlans,
        };

        if (!getAuthToken()) {
          saveAppData(nextAppData);
        }
        return nextAppData;
      });

      if (getAuthToken()) {
        try {
          const payload = {
            monthKey: targetMonthKey,
            estimatedIncome: Number(sanitized.estimatedIncome) || 0,
            actualIncome: Number(sanitized.actualIncome) || 0,
            savingsGoal: Number(sanitized.savingsGoal) || 0,
            fixedExpenses: (sanitized.fixedExpenses || []).map((fe) => ({
              name: fe.name,
              amount: Number(fe.amount) || 0,
            })),
          };

          const res = await budgetApi.upsertMonthPlan(targetMonthKey, payload);
          if (res?.monthPlan) {
            setAppData((prev) => {
              const existingPlans = Array.isArray(prev.monthPlans) ? prev.monthPlans : [];
              const index = existingPlans.findIndex((p) => p.monthKey === targetMonthKey);
              let nextPlans = [...existingPlans];
              if (index >= 0) {
                nextPlans[index] = res.monthPlan;
              } else {
                nextPlans.push(res.monthPlan);
              }
              return { ...prev, monthPlans: nextPlans };
            });
          }
        } catch (err) {
          console.error('[SpendWise] Error saving month plan to server:', err);
          setError(err.message || 'Failed to save month plan to cloud.');
        }
      }
    },
    [selectedMonth]
  );

  const deleteMonthPlan = useCallback((monthKey) => {
    setAppData((prev) => {
      const existingPlans = Array.isArray(prev.monthPlans) ? prev.monthPlans : [];
      const nextPlans = existingPlans.filter((p) => p.monthKey !== monthKey);
      const nextAppData = { ...prev, monthPlans: nextPlans };
      if (!getAuthToken()) {
        saveAppData(nextAppData);
      }
      return nextAppData;
    });
  }, []);

  /**
   * Fixed Expenses Management
   */
  const addFixedExpense = useCallback(
    (monthKey, { name, amount }) => {
      const targetKey = monthKey || selectedMonth;
      const plan = getMonthPlan(targetKey) || {
        monthKey: targetKey,
        estimatedIncome: 0,
        actualIncome: 0,
        fixedExpenses: [],
        savingsGoal: 0,
      };

      const newExpense = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `fe-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: String(name || '').trim(),
        amount: Math.max(0, Number(amount) || 0),
      };

      const updatedFixed = [...(plan.fixedExpenses || []), newExpense];
      saveMonthPlan({
        ...plan,
        fixedExpenses: updatedFixed,
      });
    },
    [selectedMonth, getMonthPlan, saveMonthPlan]
  );

  const editFixedExpense = useCallback(
    (monthKey, expenseId, updatedFields) => {
      const targetKey = monthKey || selectedMonth;
      const plan = getMonthPlan(targetKey);
      if (!plan) return;

      const updatedFixed = (plan.fixedExpenses || []).map((fe) => {
        if (fe.id === expenseId) {
          return {
            ...fe,
            ...updatedFields,
            amount:
              updatedFields.amount !== undefined
                ? Math.max(0, Number(updatedFields.amount) || 0)
                : fe.amount,
            name:
              updatedFields.name !== undefined
                ? String(updatedFields.name).trim()
                : fe.name,
          };
        }
        return fe;
      });

      saveMonthPlan({
        ...plan,
        fixedExpenses: updatedFixed,
      });
    },
    [selectedMonth, getMonthPlan, saveMonthPlan]
  );

  const removeFixedExpense = useCallback(
    (monthKey, expenseId) => {
      const targetKey = monthKey || selectedMonth;
      const plan = getMonthPlan(targetKey);
      if (!plan) return;

      const updatedFixed = (plan.fixedExpenses || []).filter((fe) => fe.id !== expenseId);
      saveMonthPlan({
        ...plan,
        fixedExpenses: updatedFixed,
      });
    },
    [selectedMonth, getMonthPlan, saveMonthPlan]
  );

  /**
   * Personal Transactions Management (Strictly Isolated to Current User)
   */
  const addTransaction = useCallback(async (txData) => {
    const localTx = sanitizeTransaction({
      ...txData,
      id: typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    setAppData((prev) => {
      const existing = Array.isArray(prev.transactions) ? prev.transactions : [];
      const nextTransactions = [localTx, ...existing];
      const nextAppData = { ...prev, transactions: nextTransactions };
      if (!getAuthToken()) {
        saveAppData(nextAppData);
      }
      return nextAppData;
    });

    if (getAuthToken()) {
      try {
        const payload = {
          date: txData.date,
          amount: Number(txData.amount),
          category: txData.categoryId || txData.category || 'other',
          merchant: txData.label || txData.merchant || null,
          note: txData.note || null,
          needWant: txData.needWant || 'need',
          plannedUnplanned: txData.plannedUnplanned || 'planned',
          source: txData.source || 'manual',
          splitExpenseId: txData.splitExpenseId || null,
        };

        const res = await transactionApi.createTransaction(payload);
        if (res?.transaction) {
          const serverTx = {
            ...res.transaction,
            label: res.transaction.merchant || res.transaction.label || '',
            categoryId: (res.transaction.category || 'other').toLowerCase(),
          };

          setAppData((prev) => {
            const nextTransactions = (prev.transactions || []).map((t) =>
              t.id === localTx.id ? serverTx : t
            );
            return { ...prev, transactions: nextTransactions };
          });
          return serverTx;
        }
      } catch (err) {
        console.error('[SpendWise] Error syncing transaction to cloud:', err);
        setError(err.message || 'Failed to sync transaction with server.');
      }
    }

    return localTx;
  }, []);

  const updateTransaction = useCallback(async (id, updatedFields) => {
    setAppData((prev) => {
      const existing = Array.isArray(prev.transactions) ? prev.transactions : [];
      const nextTransactions = existing.map((tx) => {
        if (tx.id === id) {
          return sanitizeTransaction({
            ...tx,
            ...updatedFields,
            updatedAt: new Date().toISOString(),
          });
        }
        return tx;
      });

      const nextAppData = { ...prev, transactions: nextTransactions };
      if (!getAuthToken()) {
        saveAppData(nextAppData);
      }
      return nextAppData;
    });

    if (getAuthToken()) {
      try {
        const payload = {};
        if (updatedFields.date !== undefined) payload.date = updatedFields.date;
        if (updatedFields.amount !== undefined) payload.amount = Number(updatedFields.amount);
        if (updatedFields.category !== undefined || updatedFields.categoryId !== undefined) {
          payload.category = updatedFields.categoryId || updatedFields.category;
        }
        if (updatedFields.label !== undefined || updatedFields.merchant !== undefined) {
          payload.merchant = updatedFields.merchant || updatedFields.label;
        }
        if (updatedFields.note !== undefined) payload.note = updatedFields.note;
        if (updatedFields.needWant !== undefined) payload.needWant = updatedFields.needWant;
        if (updatedFields.plannedUnplanned !== undefined) {
          payload.plannedUnplanned = updatedFields.plannedUnplanned;
        }

        await transactionApi.updateTransaction(id, payload);
      } catch (err) {
        console.error('[SpendWise] Error updating transaction on server:', err);
      }
    }
  }, []);

  const deleteTransaction = useCallback(async (id) => {
    setAppData((prev) => {
      const existing = Array.isArray(prev.transactions) ? prev.transactions : [];
      const nextTransactions = existing.filter((tx) => tx.id !== id);
      const nextAppData = { ...prev, transactions: nextTransactions };
      if (!getAuthToken()) {
        saveAppData(nextAppData);
      }
      return nextAppData;
    });

    if (getAuthToken()) {
      try {
        await transactionApi.deleteTransaction(id);
      } catch (err) {
        console.error('[SpendWise] Error deleting transaction on server:', err);
      }
    }
  }, []);

  /**
   * Multi-User Friends Management
   */
  const fetchFriendRequests = useCallback(async () => {
    if (getAuthToken()) {
      try {
        const res = await friendApi.getFriendRequests();
        if (res?.success) {
          setFriendRequests({
            incoming: res.incoming || [],
            outgoing: res.outgoing || [],
          });
        }
      } catch (err) {
        console.warn('[SpendWise] Error fetching friend requests:', err);
      }
    }
  }, []);

  const sendFriendRequest = useCallback(
    async (target) => {
      if (getAuthToken()) {
        const res = await friendApi.sendFriendRequest(target);
        await fetchFriendRequests();
        await fetchCloudData();
        return res;
      }
    },
    [fetchFriendRequests, fetchCloudData]
  );

  const acceptFriendRequest = useCallback(
    async (id) => {
      if (getAuthToken()) {
        const res = await friendApi.acceptFriendRequest(id);
        await fetchFriendRequests();
        await fetchCloudData();
        return res;
      }
    },
    [fetchFriendRequests, fetchCloudData]
  );

  const declineFriendRequest = useCallback(
    async (id) => {
      if (getAuthToken()) {
        const res = await friendApi.declineFriendRequest(id);
        await fetchFriendRequests();
        return res;
      }
    },
    [fetchFriendRequests]
  );

  const addFriend = useCallback(
    async (friendData) => {
      const localFriend = sanitizeFriend({
        ...friendData,
        id: typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `f-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      });

      setAppData((prev) => {
        const existing = Array.isArray(prev.friends) ? prev.friends : [];
        const nextFriends = [...existing, localFriend];
        const nextAppData = { ...prev, friends: nextFriends };
        if (!getAuthToken()) {
          saveAppData(nextAppData);
        }
        return nextAppData;
      });

      if (getAuthToken()) {
        try {
          const res = await friendApi.createFriend({
            name: friendData.name,
            email: friendData.email || null,
            avatar: friendData.avatar || null,
          });
          if (res?.friend) {
            await fetchCloudData();
            return res.friend;
          }
        } catch (err) {
          console.error('[SpendWise] Error creating friend on server:', err);
        }
      }

      return localFriend;
    },
    [fetchCloudData]
  );

  const editFriend = useCallback((friendId, updatedFields) => {
    setAppData((prev) => {
      const existing = Array.isArray(prev.friends) ? prev.friends : [];
      const nextFriends = existing.map((f) => {
        if (f.id === friendId) {
          return sanitizeFriend({
            ...f,
            ...updatedFields,
            updatedAt: new Date().toISOString(),
          });
        }
        return f;
      });
      const nextAppData = { ...prev, friends: nextFriends };
      if (!getAuthToken()) {
        saveAppData(nextAppData);
      }
      return nextAppData;
    });
  }, []);

  const archiveFriend = useCallback((friendId) => {
    setAppData((prev) => {
      const existing = Array.isArray(prev.friends) ? prev.friends : [];
      const nextFriends = existing.map((f) => {
        if (f.id === friendId) {
          return sanitizeFriend({
            ...f,
            isArchived: true,
            updatedAt: new Date().toISOString(),
          });
        }
        return f;
      });
      const nextAppData = { ...prev, friends: nextFriends };
      if (!getAuthToken()) {
        saveAppData(nextAppData);
      }
      return nextAppData;
    });
  }, []);

  const restoreFriend = useCallback((friendId) => {
    setAppData((prev) => {
      const existing = Array.isArray(prev.friends) ? prev.friends : [];
      const nextFriends = existing.map((f) => {
        if (f.id === friendId) {
          return sanitizeFriend({
            ...f,
            isArchived: false,
            updatedAt: new Date().toISOString(),
          });
        }
        return f;
      });
      const nextAppData = { ...prev, friends: nextFriends };
      if (!getAuthToken()) {
        saveAppData(nextAppData);
      }
      return nextAppData;
    });
  }, []);

  const removeFriend = useCallback(async (friendId, force = false) => {
    setAppData((prev) => {
      const splits = Array.isArray(prev.splitExpenses) ? prev.splitExpenses : [];
      const settlements = Array.isArray(prev.settlements) ? prev.settlements : [];
      const hasHistory =
        splits.some(
          (s) =>
            s.paidBy === friendId ||
            s.participants?.some((p) => p.friendId === friendId || p.participantId === friendId)
        ) ||
        settlements.some(
          (st) => st.fromId === friendId || st.toId === friendId
        );

      const existing = Array.isArray(prev.friends) ? prev.friends : [];
      let nextFriends;
      if (hasHistory && !force) {
        nextFriends = existing.map((f) => {
          if (f.id === friendId) {
            return sanitizeFriend({
              ...f,
              isArchived: true,
              updatedAt: new Date().toISOString(),
            });
          }
          return f;
        });
      } else {
        nextFriends = existing.filter((f) => f.id !== friendId);
      }
      const nextAppData = { ...prev, friends: nextFriends };
      if (!getAuthToken()) {
        saveAppData(nextAppData);
      }
      return nextAppData;
    });

    if (getAuthToken()) {
      try {
        await friendApi.deleteFriend(friendId);
      } catch (err) {
        console.error('[SpendWise] Error deleting friend on server:', err);
      }
    }
  }, []);

  /**
   * Truly Shared Groups Management
   */
  const createGroup = useCallback(
    async (groupData) => {
      const localGroup = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `g-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: String(groupData.name || 'Group').trim(),
        currency: groupData.currency || 'INR',
        members: Array.isArray(groupData.members) ? groupData.members : ['You'],
        createdAt: new Date().toISOString(),
      };

      setAppData((prev) => {
        const existing = Array.isArray(prev.groups) ? prev.groups : [];
        const nextGroups = [...existing, localGroup];
        const nextAppData = { ...prev, groups: nextGroups };
        if (!getAuthToken()) {
          saveAppData(nextAppData);
        }
        return nextAppData;
      });

      if (getAuthToken()) {
        try {
          const res = await groupsApi.createGroup({
            name: groupData.name,
            currency: groupData.currency || 'INR',
            members: groupData.members || [],
          });

          if (res?.group) {
            await fetchCloudData();
            return res.group;
          }
        } catch (err) {
          console.error('[SpendWise] Error creating group on server:', err);
          throw err;
        }
      }

      return localGroup;
    },
    [fetchCloudData]
  );

  const joinGroup = useCallback(
    async (inviteCode) => {
      if (getAuthToken()) {
        const res = await groupsApi.joinGroup(inviteCode);
        await fetchCloudData();
        return res;
      }
    },
    [fetchCloudData]
  );

  const addGroupMember = useCallback(
    async (groupId, memberData) => {
      if (getAuthToken()) {
        const res = await groupsApi.addGroupMember(groupId, memberData);
        await fetchCloudData();
        return res;
      }
    },
    [fetchCloudData]
  );

  const removeGroupMember = useCallback(
    async (groupId, memberId) => {
      if (getAuthToken()) {
        const res = await groupsApi.removeGroupMember(groupId, memberId);
        await fetchCloudData();
        return res;
      }
    },
    [fetchCloudData]
  );

  const deleteGroup = useCallback((groupId) => {
    setAppData((prev) => {
      const existing = Array.isArray(prev.groups) ? prev.groups : [];
      const nextGroups = existing.filter((g) => g.id !== groupId);
      const nextAppData = { ...prev, groups: nextGroups };
      if (!getAuthToken()) {
        saveAppData(nextAppData);
      }
      return nextAppData;
    });
  }, []);

  /**
   * Split Expenses & Settlements Management
   */
  const addSplitExpense = useCallback(
    async (splitData) => {
      const activeUserId = currentUser?.id || 'user-self';
      const activeUserName = currentUser?.name || 'You';

      const localSplit = sanitizeSplitExpense({
        ...splitData,
        id: typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `split-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      });

      setAppData((prev) => {
        const existing = Array.isArray(prev.splitExpenses) ? prev.splitExpenses : [];
        const nextSplits = [localSplit, ...existing];
        const nextAppData = { ...prev, splitExpenses: nextSplits };
        if (!getAuthToken()) {
          saveAppData(nextAppData);
        }
        return nextAppData;
      });

      if (getAuthToken()) {
        try {
          const rawParticipants = splitData.participants || splitData.shares || [];
          const participants = rawParticipants.map((p) => {
            const shareAmount = Number(p.shareAmount || p.amount) || 0;
            const amountPaid = Number(p.amountPaid) || 0;
            const balance =
              p.balance != null
                ? Number(p.balance)
                : Math.max(0, shareAmount - amountPaid);

            let participantId = p.participantId || p.userId || p.friendId || p.id;
            let participantName = p.participantName || p.name || 'Friend';

            if (participantId === 'user-self' || participantName === 'You') {
              participantId = activeUserId;
              participantName = activeUserName;
            }

            return {
              participantId,
              participantName,
              shareAmount,
              percentage: p.percentage != null ? Number(p.percentage) : null,
              shares: p.shares != null ? Number(p.shares) : null,
              amountPaid,
              balance,
            };
          });

          const paidById =
            splitData.paidById === 'user-self' || !splitData.paidById
              ? activeUserId
              : splitData.paidById;

          const payerName =
            splitData.payerName === 'You' || !splitData.payerName
              ? activeUserName
              : splitData.payerName;

          const payload = {
            title: splitData.title,
            totalAmount: Number(splitData.totalAmount || splitData.amount),
            currency: splitData.currency || 'INR',
            paidById,
            payerName,
            splitMethod: (splitData.splitMethod || 'EQUALLY').toUpperCase(),
            date: splitData.date || new Date().toISOString().slice(0, 10),
            notes: splitData.notes || null,
            groupId: splitData.groupId || null,
            participants,
          };

          const res = await splitApi.createSplit(payload);
          if (res?.split) {
            await fetchCloudData();
            return res.split;
          }
        } catch (err) {
          console.error('[SpendWise] Error creating split on server:', err);
          throw err;
        }
      }

      return localSplit;
    },
    [currentUser, fetchCloudData]
  );

  const deleteSplitExpense = useCallback(async (expenseId) => {
    setAppData((prev) => {
      const existing = Array.isArray(prev.splitExpenses) ? prev.splitExpenses : [];
      const nextSplits = existing.filter((s) => s.id !== expenseId);
      const nextAppData = { ...prev, splitExpenses: nextSplits };
      if (!getAuthToken()) {
        saveAppData(nextAppData);
      }
      return nextAppData;
    });

    if (getAuthToken()) {
      try {
        await splitApi.deleteSplit(expenseId);
      } catch (err) {
        console.error('[SpendWise] Error deleting split on server:', err);
      }
    }
  }, []);

  const recordSettlement = useCallback(
    async (settlementData) => {
      const activeUserId = currentUser?.id || 'user-self';
      const activeUserName = currentUser?.name || 'You';

      const localSettlement = sanitizeSettlement({
        ...settlementData,
        id: typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `settle-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      });

      setAppData((prev) => {
        const existing = Array.isArray(prev.settlements) ? prev.settlements : [];
        const nextSettlements = [localSettlement, ...existing];
        const nextAppData = { ...prev, settlements: nextSettlements };
        if (!getAuthToken()) {
          saveAppData(nextAppData);
        }
        return nextAppData;
      });

      if (getAuthToken() && settlementData.expenseId) {
        try {
          let fromId = settlementData.fromId || settlementData.payerId || settlementData.fromUserId;
          let fromName = settlementData.fromName || settlementData.payerName;
          let toId = settlementData.toId || settlementData.receiverId || settlementData.toUserId;
          let toName = settlementData.toName || settlementData.receiverName;

          if (fromId === 'user-self') {
            fromId = activeUserId;
            fromName = activeUserName;
          }
          if (toId === 'user-self') {
            toId = activeUserId;
            toName = activeUserName;
          }

          const payload = {
            expenseId: settlementData.expenseId,
            fromId,
            fromName: fromName || 'Debtor',
            toId,
            toName: toName || 'Creditor',
            amount: Number(settlementData.amount),
            currency: settlementData.currency || 'INR',
            note: settlementData.note || null,
          };

          const res = await splitApi.settleSplit(settlementData.expenseId, payload);
          await fetchCloudData();
          return res?.settlement;
        } catch (err) {
          console.error('[SpendWise] Error recording settlement on server:', err);
          throw err;
        }
      }

      return localSettlement;
    },
    [currentUser, fetchCloudData]
  );

  /**
   * Resets all application data to clean default state.
   */
  const resetData = useCallback(() => {
    try {
      clearAppData();
      const fresh = createDefaultAppData();
      setAppData(fresh);
      setSelectedMonth(getCurrentMonthKey());
      applyThemeToDocument(fresh.settings.theme, fresh.settings.accentColor);
      setError(null);
    } catch (err) {
      console.error('[SpendWise] Error resetting data:', err);
      setError(err.message || 'Failed to reset data.');
    }
  }, []);

  /**
   * Currency convenience helpers
   */
  const appSettings = appData?.settings;
  const currencyConfig = useMemo(() => {
    return getCurrencyConfig(appSettings);
  }, [appSettings]);

  const formatAppMoney = useCallback(
    (amount, options = {}) => {
      return formatMoney(amount, appSettings, options);
    },
    [appSettings]
  );

  /**
   * Derived Friend Lists (Active vs Archived)
   */
  const activeFriends = useMemo(() => {
    return (appData.friends || []).filter((f) => !f.isArchived);
  }, [appData.friends]);

  const archivedFriends = useMemo(() => {
    return (appData.friends || []).filter((f) => !!f.isArchived);
  }, [appData.friends]);

  /**
   * Current Active User ID for domain calculations
   */
  const activeUserId = currentUser?.id || 'user-self';

  /**
   * Unified Financial Summary Selector
   */
  const financialSummary = useMemo(() => {
    return getUnifiedFinancialSummary(
      selectedMonth,
      appData.transactions || [],
      appData.splitExpenses || [],
      appData.settlements || [],
      currentMonthPlan,
      activeUserId
    );
  }, [selectedMonth, appData.transactions, appData.splitExpenses, appData.settlements, currentMonthPlan, activeUserId]);

  /**
   * Unified Activity Timeline
   */
  const unifiedTimeline = useMemo(() => {
    const friendMap = (appData.friends || []).reduce((acc, f) => {
      acc[f.id] = f;
      return acc;
    }, {});

    if (currentUser?.id) {
      friendMap[currentUser.id] = {
        id: currentUser.id,
        name: currentUser.name || 'You',
        avatar: currentUser.name?.[0]?.toUpperCase() || 'YOU',
        color: 'var(--color-accent)',
      };
    }

    return buildUnifiedActivityTimeline(
      appData.transactions || [],
      appData.splitExpenses || [],
      appData.settlements || [],
      activeUserId,
      friendMap
    );
  }, [appData.transactions, appData.splitExpenses, appData.settlements, appData.friends, activeUserId, currentUser]);

  /**
   * Bilateral Friend Financial Profile Helper
   */
  const getFriendProfile = useCallback(
    (friendId) => {
      return getFriendFinancialProfile(
        friendId,
        appData.splitExpenses || [],
        appData.settlements || [],
        activeUserId
      );
    },
    [appData.splitExpenses, appData.settlements, activeUserId]
  );

  const value = {
    appData,
    selectedMonth,
    setSelectedMonth,
    currentMonthPlan,
    getMonthPlan,
    saveMonthPlan,
    deleteMonthPlan,
    addFixedExpense,
    editFixedExpense,
    removeFixedExpense,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    // Multi-User Friends & Splits
    friends: appData.friends || [],
    activeFriends,
    archivedFriends,
    groups: appData.groups || [],
    splitExpenses: appData.splitExpenses || [],
    settlements: appData.settlements || [],
    friendRequests,
    fetchFriendRequests,
    searchUsers: friendApi.searchUsers,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    addFriend,
    editFriend,
    archiveFriend,
    restoreFriend,
    removeFriend,
    getFriendProfile,
    // Shared Groups & Invite Sharing
    createGroup,
    joinGroup,
    addGroupMember,
    removeGroupMember,
    deleteGroup,
    addSplitExpense,
    deleteSplitExpense,
    recordSettlement,
    // Unified Financial Calculations & Timeline
    financialSummary,
    unifiedTimeline,
    // Modals & UI state
    isPaymentHubOpen,
    paymentHubDefaultTab,
    openPaymentHub,
    closePaymentHub,
    isAuthModalOpen,
    openAuthModal,
    closeAuthModal,
    // Settings & Theme
    updateSettings,
    resetData,
    currencyConfig,
    formatAppMoney,
    // Auth & Cloud Sync
    currentUser,
    setCurrentUser,
    authToken,
    isCloudSynced,
    setIsCloudSynced,
    loginUser,
    registerUser,
    logoutUser,
    migrateLocalDataToCloud,
    refreshCloudData: fetchCloudData,
    isLoading,
    error,
    retryLoading: fetchCloudData,
  };

  return (
    <SpendWiseContext.Provider value={value}>
      {children}
    </SpendWiseContext.Provider>
  );
}

export function useSpendWise() {
  const context = useContext(SpendWiseContext);
  if (!context) {
    throw new Error('useSpendWise must be used within a SpendWiseProvider.');
  }
  return context;
}
