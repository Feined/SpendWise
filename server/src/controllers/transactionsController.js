import prisma from '../db/prisma.js';
import {
  transactionSchema,
  updateTransactionSchema,
  validMonth,
} from '../validators/index.js';

export async function getTransactions(req, res, next) {
  try {
    const { month } = req.query;

    if (month !== undefined) {
      if (typeof month !== 'string' || !validMonth(month)) {
        return res.status(400).json({
          success: false,
          error: 'Month must be in YYYY-MM format between 1900 and 2100',
        });
      }
    }

    if (!prisma) {
      return res.status(200).json({
        success: true,
        transactions: [],
      });
    }

    const where = {
      userId: req.user.id,
    };

    if (month) {
      where.date = {
        startsWith: month,
      };
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return res.status(200).json({
      success: true,
      transactions,
    });
  } catch (err) {
    next(err);
  }
}

export async function createTransaction(req, res, next) {
  try {
    const data = transactionSchema.parse(req.body);

    if (!prisma) {
      return res.status(201).json({
        success: true,
        transaction: {
          id: `local-${Date.now()}`,
          ...data,
          userId: req.user.id,
        },
      });
    }

    // Verify splitExpenseId if provided
    if (data.splitExpenseId) {
      const split = await prisma.splitExpense.findFirst({
        where: {
          id: data.splitExpenseId,
          OR: [
            { createdById: req.user.id },
            { participants: { some: { participantId: req.user.id } } },
            { group: { members: { some: { userId: req.user.id } } } },
          ],
        },
      });

      if (!split) {
        return res.status(400).json({
          success: false,
          error: 'Referenced split expense was not found or is unauthorized',
        });
      }
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId: req.user.id,
        date: data.date,
        amount: data.amount,
        category: data.category,
        merchant: data.merchant ?? null,
        note: data.note ?? null,
        needWant: data.needWant,
        plannedUnplanned: data.plannedUnplanned,
        source: data.source,
        splitExpenseId: data.splitExpenseId ?? null,
      },
    });

    return res.status(201).json({
      success: true,
      transaction,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateTransaction(req, res, next) {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Transaction ID is required',
      });
    }

    const data = updateTransactionSchema.parse(req.body);

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one field is required to update',
      });
    }

    if (!prisma) {
      return res.status(200).json({
        success: true,
        transaction: {
          id,
          ...data,
        },
      });
    }

    const existing = await prisma.transaction.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found or unauthorized',
      });
    }

    if (data.splitExpenseId) {
      const split = await prisma.splitExpense.findFirst({
        where: {
          id: data.splitExpenseId,
          OR: [
            { createdById: req.user.id },
            { participants: { some: { participantId: req.user.id } } },
            { group: { members: { some: { userId: req.user.id } } } },
          ],
        },
      });

      if (!split) {
        return res.status(400).json({
          success: false,
          error: 'Referenced split expense was not found or is unauthorized',
        });
      }
    }

    const updated = await prisma.transaction.update({
      where: {
        id,
      },
      data,
    });

    return res.status(200).json({
      success: true,
      transaction: updated,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteTransaction(req, res, next) {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Transaction ID is required',
      });
    }

    if (!prisma) {
      return res.status(200).json({
        success: true,
        message: 'Transaction deleted successfully',
      });
    }

    const deleted = await prisma.transaction.deleteMany({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (deleted.count === 0) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found or unauthorized',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Transaction deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}