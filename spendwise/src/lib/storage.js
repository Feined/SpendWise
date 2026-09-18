/**
 * SpendWise LocalStorage Management & Schema Migration
 * 
 * Centralized storage module for persisting SpendWise state.
 * Supports:
 * - Seamless automatic migration from version 1 to version 2
 * - Friends, Groups, Split Expenses, and Settlements
 * - Expanded user settings (theme, accent, currency, notifications)
 */

export const STORAGE_KEY_V1 = 'spendwise.v1';
export const STORAGE_KEY = 'spendwise.v2';

/**
 * Default initial data structure for SpendWise v2.
 */
export const DEFAULT_APP_DATA = {
  version: 2,
  settings: {
    currencySymbol: "₹",
    currencyCode: "INR",
    theme: "system",
    accentColor: "emerald",
    firstDayOfWeek: "monday",
    dateFormat: "YYYY-MM-DD",
    profile: {
      name: "User",
      email: "",
      avatar: ""
    },
    spendingDefaults: {
      defaultCategoryId: "food",
      defaultNature: "need",
      defaultPlanned: true
    },
    notifications: {
      dailySpendingReminder: true,
      budgetWarning: true,
      splitSettlementReminder: true
    }
  },
  monthPlans: [],
  transactions: [],
  friends: [],
  groups: [],
  splitExpenses: [],
  settlements: []
};

/**
 * Creates a fresh clone of the default app data structure.
 */
export function createDefaultAppData() {
  return JSON.parse(JSON.stringify(DEFAULT_APP_DATA));
}

/**
 * Validates complete app data object structure.
 * @param {any} data
 * @returns {boolean}
 */
export function validateAppData(data) {
  if (!data || typeof data !== 'object') return false;
  if (typeof data.version !== 'number' || data.version < 1) return false;
  if (!data.settings || typeof data.settings !== 'object') return false;
  if (!Array.isArray(data.monthPlans)) return false;
  if (!Array.isArray(data.transactions)) return false;
  return true;
}

/**
 * Validates an individual fixed expense object.
 */
export function isValidFixedExpense(item) {
  if (!item || typeof item !== 'object') return false;
  if (typeof item.id !== 'string') return false;
  if (typeof item.name !== 'string') return false;
  if (typeof item.amount !== 'number' || isNaN(item.amount) || item.amount < 0) return false;
  return true;
}

/**
 * Validates an individual month plan object.
 */
export function isValidMonthPlan(plan) {
  if (!plan || typeof plan !== 'object') return false;
  if (typeof plan.monthKey !== 'string' || !/^\d{4}-\d{2}$/.test(plan.monthKey)) return false;
  if (typeof plan.estimatedIncome !== 'number' || isNaN(plan.estimatedIncome) || plan.estimatedIncome < 0) return false;
  if (typeof plan.actualIncome !== 'number' || isNaN(plan.actualIncome) || plan.actualIncome < 0) return false;
  if (!Array.isArray(plan.fixedExpenses) || !plan.fixedExpenses.every(isValidFixedExpense)) return false;
  if (typeof plan.savingsGoal !== 'number' || isNaN(plan.savingsGoal) || plan.savingsGoal < 0) return false;
  if (plan.updatedAt !== undefined && typeof plan.updatedAt !== 'string') return false;
  return true;
}

/**
 * Validates an individual transaction object.
 */
export function isValidTransaction(t) {
  if (!t || typeof t !== 'object') return false;
  if (typeof t.id !== 'string' || !t.id) return false;
  if (typeof t.amount !== 'number' || isNaN(t.amount) || t.amount < 0) return false;
  if (typeof t.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(t.date)) return false;
  if (typeof t.categoryId !== 'string') return false;
  if (t.label !== undefined && typeof t.label !== 'string') return false;
  if (t.nature !== undefined && t.nature !== 'need' && t.nature !== 'want') return false;
  if (t.planned !== undefined && typeof t.planned !== 'boolean') return false;
  return true;
}

/**
 * Strips any non-schema or derived calculations from a month plan before saving.
 */
export function sanitizeMonthPlan(plan) {
  return {
    monthKey: String(plan.monthKey || ''),
    estimatedIncome: Math.max(0, Number(plan.estimatedIncome) || 0),
    actualIncome: Math.max(0, Number(plan.actualIncome) || 0),
    fixedExpenses: Array.isArray(plan.fixedExpenses)
      ? plan.fixedExpenses.map((fe) => ({
          id: String(fe.id || ''),
          name: String(fe.name || '').trim(),
          amount: Math.max(0, Number(fe.amount) || 0)
        }))
      : [],
    savingsGoal: Math.max(0, Number(plan.savingsGoal) || 0),
    updatedAt: plan.updatedAt || new Date().toISOString()
  };
}

/**
 * Sanitizes an individual transaction for persistent storage.
 */
export function sanitizeTransaction(t) {
  const nature = t.nature === 'need' || t.nature === 'want' ? t.nature : undefined;
  const planned = typeof t.planned === 'boolean' ? t.planned : undefined;
  return {
    id: String(t.id || ''),
    type: 'expense',
    amount: Math.max(0, Number(t.amount) || 0),
    date: String(t.date || ''),
    categoryId: String(t.categoryId || 'other'),
    label: String(t.label || '').trim(),
    note: String(t.note || '').trim(),
    nature,
    planned,
    createdAt: t.createdAt || new Date().toISOString(),
    updatedAt: t.updatedAt || new Date().toISOString()
  };
}

/**
 * Sanitizes a friend record.
 */
export function sanitizeFriend(f) {
  return {
    id: String(f.id || `f-${Date.now()}`),
    name: String(f.name || 'Friend').trim(),
    email: String(f.email || '').trim(),
    avatar: String(f.avatar || (f.name ? f.name[0].toUpperCase() : 'F')),
    color: String(f.color || '#10b981'),
    isArchived: Boolean(f.isArchived),
    createdAt: f.createdAt || new Date().toISOString(),
    updatedAt: f.updatedAt || new Date().toISOString()
  };
}

/**
 * Sanitizes a split expense record.
 */
export function sanitizeSplitExpense(e) {
  return {
    id: String(e.id || `split-${Date.now()}`),
    title: String(e.title || 'Shared Expense').trim(),
    totalAmount: Math.max(0, Number(e.totalAmount) || 0),
    currency: String(e.currency || 'INR'),
    paidBy: String(e.paidBy || 'user-self'),
    splitMethod: String(e.splitMethod || 'equally'),
    date: String(e.date || new Date().toISOString().split('T')[0]),
    notes: String(e.notes || '').trim(),
    groupId: e.groupId ? String(e.groupId) : null,
    shares: Array.isArray(e.shares)
      ? e.shares.map((s) => ({
          userId: String(s.userId),
          shareAmount: Math.max(0, Number(s.shareAmount) || 0),
          percentage: s.percentage !== undefined ? Number(s.percentage) : undefined,
          sharesCount: s.sharesCount !== undefined ? Number(s.sharesCount) : undefined,
          isPayer: Boolean(s.isPayer)
        }))
      : [],
    createdAt: e.createdAt || new Date().toISOString(),
    updatedAt: e.updatedAt || new Date().toISOString()
  };
}

/**
 * Sanitizes a settlement record.
 */
export function sanitizeSettlement(s) {
  return {
    id: String(s.id || `settle-${Date.now()}`),
    fromUserId: String(s.fromUserId),
    toUserId: String(s.toUserId),
    amount: Math.max(0, Number(s.amount) || 0),
    currency: String(s.currency || 'INR'),
    notes: String(s.notes || '').trim(),
    settledAt: s.settledAt || new Date().toISOString(),
    createdAt: s.createdAt || new Date().toISOString()
  };
}

/**
 * Validates that an object conforms to the SpendWise v2 schema.
 */
export function isValidAppData(data) {
  if (!data || typeof data !== 'object') return false;
  if (data.version !== 2) return false;
  if (!data.settings || typeof data.settings !== 'object') return false;
  if (!Array.isArray(data.monthPlans) || !Array.isArray(data.transactions)) return false;
  if (!Array.isArray(data.friends) || !Array.isArray(data.splitExpenses) || !Array.isArray(data.settlements)) return false;
  return true;
}

/**
 * Migrates a version 1 schema object to version 2 safely without data loss.
 */
export function migrateV1ToV2(v1Data) {
  return {
    version: 2,
    settings: {
      ...DEFAULT_APP_DATA.settings,
      currencySymbol: v1Data?.settings?.currencySymbol || "₹",
      currencyCode: v1Data?.settings?.currencyCode || "INR"
    },
    monthPlans: Array.isArray(v1Data?.monthPlans)
      ? v1Data.monthPlans.map(sanitizeMonthPlan)
      : [],
    transactions: Array.isArray(v1Data?.transactions)
      ? v1Data.transactions.map(sanitizeTransaction)
      : [],
    friends: structuredClone(DEFAULT_APP_DATA.friends),
    groups: structuredClone(DEFAULT_APP_DATA.groups),
    splitExpenses: [],
    settlements: []
  };
}

/**
 * Loads application data from localStorage with automatic v1->v2 migration.
 */
export function loadAppData() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return structuredClone(DEFAULT_APP_DATA);
  }

  // First check if v2 exists
  let rawV2 = null;
  try {
    rawV2 = window.localStorage.getItem(STORAGE_KEY);
  } catch (err) {
    console.warn('[SpendWise] Error accessing storage:', err);
  }

  if (rawV2) {
    try {
      const parsed = JSON.parse(rawV2);
      if (parsed && parsed.version === 2) {
        return {
          ...DEFAULT_APP_DATA,
          ...parsed,
          settings: {
            ...DEFAULT_APP_DATA.settings,
            ...(parsed.settings || {})
          },
          friends: Array.isArray(parsed.friends) ? parsed.friends : DEFAULT_APP_DATA.friends,
          groups: Array.isArray(parsed.groups) ? parsed.groups : DEFAULT_APP_DATA.groups,
          splitExpenses: Array.isArray(parsed.splitExpenses) ? parsed.splitExpenses : [],
          settlements: Array.isArray(parsed.settlements) ? parsed.settlements : []
        };
      }
    } catch (parseErr) {
      console.warn('[SpendWise] Corrupted v2 data:', parseErr);
    }
  }

  // Next, check if legacy v1 exists and safely migrate
  let rawV1 = null;
  try {
    rawV1 = window.localStorage.getItem(STORAGE_KEY_V1);
  } catch {
    // ignore
  }

  if (rawV1) {
    try {
      const parsedV1 = JSON.parse(rawV1);
      if (parsedV1 && (parsedV1.version === 1 || parsedV1.monthPlans || parsedV1.transactions)) {
        console.info('[SpendWise] Migrating data from schema v1 to v2...');
        const migrated = migrateV1ToV2(parsedV1);
        saveAppData(migrated);
        return migrated;
      }
    } catch (parseErr) {
      console.warn('[SpendWise] Corrupted v1 data during migration:', parseErr);
    }
  }

  // Fallback to fresh v2 data
  const initial = structuredClone(DEFAULT_APP_DATA);
  saveAppData(initial);
  return initial;
}

/**
 * Saves application data to localStorage adhering to schema v2.
 */
export function saveAppData(appData) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  const sanitized = {
    version: 2,
    settings: {
      currencySymbol: appData?.settings?.currencySymbol || '₹',
      currencyCode: appData?.settings?.currencyCode || 'INR',
      theme: appData?.settings?.theme || 'system',
      accentColor: appData?.settings?.accentColor || 'emerald',
      firstDayOfWeek: appData?.settings?.firstDayOfWeek || 'monday',
      dateFormat: appData?.settings?.dateFormat || 'YYYY-MM-DD',
      profile: {
        name: appData?.settings?.profile?.name || 'User',
        email: appData?.settings?.profile?.email || '',
        avatar: appData?.settings?.profile?.avatar || ''
      },
      spendingDefaults: {
        defaultCategoryId: appData?.settings?.spendingDefaults?.defaultCategoryId || 'food',
        defaultNature: appData?.settings?.spendingDefaults?.defaultNature || 'need',
        defaultPlanned: appData?.settings?.spendingDefaults?.defaultPlanned !== undefined ? appData.settings.spendingDefaults.defaultPlanned : true
      },
      notifications: {
        dailySpendingReminder: Boolean(appData?.settings?.notifications?.dailySpendingReminder),
        budgetWarning: Boolean(appData?.settings?.notifications?.budgetWarning),
        splitSettlementReminder: Boolean(appData?.settings?.notifications?.splitSettlementReminder)
      }
    },
    monthPlans: Array.isArray(appData?.monthPlans)
      ? appData.monthPlans.map(sanitizeMonthPlan)
      : [],
    transactions: Array.isArray(appData?.transactions)
      ? appData.transactions.map(sanitizeTransaction)
      : [],
    friends: Array.isArray(appData?.friends)
      ? appData.friends.map(sanitizeFriend)
      : [],
    groups: Array.isArray(appData?.groups)
      ? appData.groups
      : [],
    splitExpenses: Array.isArray(appData?.splitExpenses)
      ? appData.splitExpenses.map(sanitizeSplitExpense)
      : [],
    settlements: Array.isArray(appData?.settlements)
      ? appData.settlements.map(sanitizeSettlement)
      : []
  };

  try {
    const serialized = JSON.stringify(sanitized);
    window.localStorage.setItem(STORAGE_KEY, serialized);
  } catch (err) {
    if (err.name === 'QuotaExceededError' || err.code === 22 || err.code === 1014) {
      throw new Error('Storage quota exceeded. Unable to persist data to browser.');
    }
    throw new Error(`Failed to save data: ${err.message || err}`);
  }
}

/**
 * Clears SpendWise data from localStorage across both v1 and v2 keys.
 */
export function clearAppData() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(STORAGE_KEY_V1);
  } catch (err) {
    throw new Error(`Failed to clear storage: ${err.message || err}`);
  }
}
