import { z } from 'zod';

/**
 * Validates a YYYY-MM-DD date in UTC to prevent timezone skew errors
 * across different client/server UTC offsets.
 */
export const validDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1900 || year > 2100) return false;

  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

export const dateSchema = z
  .string()
  .transform((val) => (val && val.includes('T') ? val.split('T')[0] : val))
  .refine((val) => typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val), {
    message: 'Date must be in YYYY-MM-DD format',
  })
  .refine(validDate, 'Invalid calendar date');

/**
 * Validates a YYYY-MM month key.
 */
export const validMonth = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month] = value.split('-').map(Number);
  return year >= 1900 && year <= 2100 && month >= 1 && month <= 12;
};

export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Invalid email address')
    .max(255, 'Email address is too long')
    .toLowerCase(),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must be under 100 characters'),
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name is too long'),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Invalid email address')
    .max(255, 'Email address is too long')
    .toLowerCase(),
  password: z.string().min(1, 'Password is required').max(100),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().trim().min(1, 'Refresh token is required'),
});

const ALLOWED_CATEGORIES = [
  'food',
  'shopping',
  'transport',
  'entertainment',
  'health',
  'bills',
  'other',
];

export const categorySchema = z
  .string()
  .trim()
  .min(1, 'Category is required')
  .refine(
    (val) => ALLOWED_CATEGORIES.includes(val.toLowerCase()),
    {
      message:
        'Invalid category. Allowed categories: Food, Shopping, Transport, Entertainment, Health, Other (or Bills)',
    }
  );

export const transactionSchema = z.object({
  date: dateSchema,
  amount: z
    .number()
    .positive('Amount must be positive')
    .max(1e9, 'Amount is too large (max ₹1,000,000,000)'),
  category: categorySchema,
  merchant: z.string().trim().max(80, 'Merchant cannot exceed 80 characters').optional().nullable(),
  note: z.string().trim().max(200, 'Note cannot exceed 200 characters').optional().nullable(),
  needWant: z.enum(['need', 'want']).default('need'),
  plannedUnplanned: z.enum(['planned', 'unplanned']).default('planned'),
  source: z.string().trim().max(40).default('manual'),
  splitExpenseId: z.string().trim().max(100).optional().nullable(),
});

export const updateTransactionSchema = transactionSchema.partial();

export const fixedExpenseLineSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, 'Fixed expense name is required').max(100),
  amount: z
    .number()
    .nonnegative('Amount must be non-negative')
    .max(1e9, 'Amount is too large'),
});

export const monthPlanSchema = z.object({
  monthKey: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Month key must be in YYYY-MM format')
    .refine(validMonth, 'Invalid month (must be YYYY-MM between 1900 and 2100)'),
  estimatedIncome: z
    .number()
    .nonnegative('Estimated income cannot be negative')
    .max(1e9, 'Income is too large'),
  actualIncome: z
    .number()
    .nonnegative('Actual income cannot be negative')
    .max(1e9, 'Income is too large')
    .default(0),
  savingsGoal: z
    .number()
    .nonnegative('Savings goal cannot be negative')
    .max(1e9, 'Savings goal is too large')
    .default(0),
  fixedExpenses: z.array(fixedExpenseLineSchema).max(25, 'Maximum 25 fixed expenses allowed').default([]),
});

export const friendSchema = z.object({
  name: z.string().trim().min(1, 'Friend name is required').max(100),
  avatar: z.string().trim().max(500).optional().nullable().or(z.literal('')),
  email: z
    .string()
    .trim()
    .email('Invalid email address')
    .max(255)
    .toLowerCase()
    .optional()
    .nullable()
    .or(z.literal('')),
});

export const friendRequestSchema = z
  .object({
    targetUserId: z.string().optional().nullable(),
    friendUserId: z.string().optional().nullable(),
    email: z.string().trim().email('Invalid email address').max(255).toLowerCase().optional().nullable(),
  })
  .refine((data) => data.targetUserId || data.friendUserId || data.email, {
    message: 'Either targetUserId or email must be provided to send a friend request',
  });

export const groupMemberInputSchema = z.union([
  z.string().trim().min(1).max(100),
  z.object({
    name: z.string().trim().min(1).max(100),
    email: z.string().trim().email().optional().nullable(),
    userId: z.string().optional().nullable(),
  }),
]);

export const groupSchema = z.object({
  name: z.string().trim().min(1, 'Group name is required').max(100),
  avatar: z.string().trim().max(500).optional().nullable(),
  currency: z.string().trim().min(1).max(10).default('INR'),
  members: z
    .array(groupMemberInputSchema)
    .min(1, 'At least one member is required')
    .max(50, 'Maximum 50 members allowed'),
});

export const joinGroupSchema = z.object({
  inviteCode: z.string().trim().min(4, 'Invite code must be at least 4 characters').max(30).toUpperCase(),
});

export const addGroupMemberSchema = z
  .object({
    userId: z.string().optional().nullable(),
    email: z.string().trim().email().optional().nullable(),
    name: z.string().trim().min(1).max(100).optional().nullable(),
  })
  .refine((data) => data.userId || data.email || data.name, {
    message: 'At least userId, email, or name must be provided',
  });

export const splitParticipantSchema = z.object({
  participantId: z.string().trim().min(1, 'Participant ID is required').max(100),
  participantName: z.string().trim().min(1, 'Participant name is required').max(100),
  shareAmount: z.number().nonnegative('Share amount cannot be negative').max(1e9),
  percentage: z.number().min(0).max(100).optional().nullable(),
  shares: z.number().nonnegative().max(1000).optional().nullable(),
  amountPaid: z.number().nonnegative().max(1e9).default(0),
  balance: z.number().max(1e9).default(0),
});

export const splitExpenseSchema = z
  .object({
    groupId: z.string().trim().max(100).optional().nullable(),
    title: z.string().trim().min(1, 'Title is required').max(100),
    totalAmount: z
      .number()
      .positive('Total amount must be greater than zero')
      .max(1e9, 'Amount is too large'),
    currency: z.string().trim().min(1).max(10).default('INR'),
    paidById: z.string().trim().min(1, 'Payer ID is required').max(100),
    payerName: z.string().trim().min(1, 'Payer name is required').max(100),
    splitMethod: z
      .enum(['EQUALLY', 'EXACT', 'PERCENTAGE', 'SHARES'])
      .default('EQUALLY'),
    date: dateSchema,
    notes: z.string().trim().max(200).optional().nullable(),
    participants: z
      .array(splitParticipantSchema)
      .min(1, 'At least one participant is required')
      .max(50, 'Maximum 50 participants allowed'),
  })
  .refine(
    (data) => {
      // Validate that the sum of participants' shareAmount closely matches totalAmount
      const sumShares = data.participants.reduce((acc, p) => acc + (p.shareAmount || 0), 0);
      return Math.abs(sumShares - data.totalAmount) < 0.05;
    },
    {
      message: 'The sum of all participant share amounts must match the total amount.',
      path: ['participants'],
    }
  );

export const settlementSchema = z
  .object({
    expenseId: z.string().trim().max(100).optional().nullable(),
    fromId: z.string().trim().min(1, 'Debtor ID is required').max(100),
    fromName: z.string().trim().min(1, 'Debtor name is required').max(100),
    toId: z.string().trim().min(1, 'Creditor ID is required').max(100),
    toName: z.string().trim().min(1, 'Creditor name is required').max(100),
    amount: z
      .number()
      .positive('Settlement amount must be positive')
      .max(1e9, 'Settlement amount is too large'),
    currency: z.string().trim().min(1).max(10).default('INR'),
    note: z.string().trim().max(200).optional().nullable(),
  })
  .refine((data) => data.fromId !== data.toId, {
    message: 'Debtor and creditor cannot be the same entity.',
    path: ['toId'],
  });

export const settingsSchema = z.object({
  currencyCode: z.string().trim().min(1).max(10).optional(),
  currencySymbol: z.string().trim().min(1).max(10).optional(),
  locale: z.string().trim().min(2).max(20).optional(),
  theme: z.enum(['day', 'night', 'system']).optional(),
  accentColor: z
    .enum(['emerald', 'ocean', 'indigo', 'coral', 'amber', 'rose', 'purple', 'teal'])
    .optional(),
  firstDayOfWeek: z.number().int().min(0).max(6).optional(),
  dateFormat: z.string().trim().min(1).max(20).optional(),
  budgetWarnings: z.boolean().optional(),
  dailyReminder: z.boolean().optional(),
  splitReminders: z.boolean().optional(),
});

export const migrationSchema = z.object({
  settings: settingsSchema.optional(),
  monthPlans: z
    .union([z.array(z.any()), z.record(z.any())])
    .transform((val) => (Array.isArray(val) ? val : Object.values(val || {})))
    .optional(),
  transactions: z.array(z.any()).optional(),
  friends: z.array(z.any()).optional(),
  groups: z.array(z.any()).optional(),
  splitExpenses: z.array(z.any()).optional(),
  settlements: z.array(z.any()).optional(),
});