import prisma from '../db/prisma.js';
import { splitExpenseSchema, settlementSchema } from '../validators/index.js';

export async function getSplits(req, res, next) {
  try {
    if (!prisma) {
      return res.status(200).json({ success: true, splits: [] });
    }

    const splits = await prisma.splitExpense.findMany({
      where: {
        OR: [
          { createdById: req.user.id },
          { participants: { some: { participantId: req.user.id } } },
          { group: { members: { some: { userId: req.user.id } } } },
        ],
      },
      include: {
        participants: true,
        settlements: {
          orderBy: { settledAt: 'desc' },
        },
        group: {
          select: {
            id: true,
            name: true,
            currency: true,
            inviteCode: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    return res.status(200).json({ success: true, splits });
  } catch (err) {
    next(err);
  }
}

export async function createSplit(req, res, next) {
  try {
    const rawData = { ...req.body };

    // Resolve payer if sent as 'user-self' or empty
    if (!rawData.paidById || rawData.paidById === 'user-self') {
      rawData.paidById = req.user.id;
      rawData.payerName = req.user.name || 'You';
    }

    // Resolve 'user-self' in participants to req.user.id
    if (Array.isArray(rawData.participants)) {
      rawData.participants = rawData.participants.map((p) => {
        if (p.participantId === 'user-self') {
          return {
            ...p,
            participantId: req.user.id,
            participantName: req.user.name || p.participantName || 'You',
          };
        }
        return p;
      });
    }

    const data = splitExpenseSchema.parse(rawData);

    if (!prisma) {
      return res.status(201).json({
        success: true,
        split: { id: `split-${Date.now()}`, ...data, createdById: req.user.id },
      });
    }

    // Verify groupId if provided
    if (data.groupId) {
      const group = await prisma.group.findFirst({
        where: {
          id: data.groupId,
          OR: [
            { createdById: req.user.id },
            { members: { some: { userId: req.user.id } } },
          ],
        },
      });

      if (!group) {
        return res.status(400).json({
          success: false,
          error: 'Specified group was not found or you are not an active member',
        });
      }
    }

    // Verify uniqueness of participants within split
    const participantIds = data.participants.map((p) => p.participantId.toLowerCase());
    if (new Set(participantIds).size !== participantIds.length) {
      return res.status(400).json({
        success: false,
        error: 'Duplicate participants are not allowed in the same split expense',
      });
    }

    const split = await prisma.splitExpense.create({
      data: {
        createdById: req.user.id,
        groupId: data.groupId || null,
        title: data.title,
        totalAmount: data.totalAmount,
        currency: data.currency || 'INR',
        paidById: data.paidById,
        payerName: data.payerName,
        splitMethod: data.splitMethod,
        date: data.date,
        notes: data.notes || null,
        participants: {
          create: data.participants.map((p) => {
            const amountPaid = p.amountPaid || 0;
            const balance = Math.max(0, p.shareAmount - amountPaid);
            return {
              participantId: p.participantId,
              participantName: p.participantName,
              shareAmount: p.shareAmount,
              percentage: p.percentage || null,
              shares: p.shares || null,
              amountPaid,
              balance,
              settledAmount: 0,
            };
          }),
        },
      },
      include: {
        participants: true,
        settlements: true,
      },
    });

    return res.status(201).json({ success: true, split });
  } catch (err) {
    next(err);
  }
}

export async function getSplitById(req, res, next) {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Split ID is required',
      });
    }

    if (!prisma) {
      return res.status(404).json({ success: false, error: 'Split not found' });
    }

    const split = await prisma.splitExpense.findFirst({
      where: {
        id,
        OR: [
          { createdById: req.user.id },
          { participants: { some: { participantId: req.user.id } } },
          { group: { members: { some: { userId: req.user.id } } } },
        ],
      },
      include: {
        participants: true,
        settlements: {
          orderBy: { settledAt: 'desc' },
        },
      },
    });

    if (!split) {
      return res.status(404).json({ success: false, error: 'Split not found or unauthorized' });
    }

    return res.status(200).json({ success: true, split });
  } catch (err) {
    next(err);
  }
}

export async function settleSplit(req, res, next) {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Split ID is required',
      });
    }

    const rawData = { ...req.body, expenseId: id };

    // Resolve 'user-self' if provided by client
    if (rawData.fromId === 'user-self') {
      rawData.fromId = req.user.id;
      rawData.fromName = req.user.name || 'You';
    }
    if (rawData.toId === 'user-self') {
      rawData.toId = req.user.id;
      rawData.toName = req.user.name || 'You';
    }

    const data = settlementSchema.parse(rawData);

    if (!prisma) {
      return res.status(200).json({
        success: true,
        settlement: { id: `settle-${Date.now()}`, ...data, settledAt: new Date().toISOString() },
      });
    }

    // Verify split access & permissions
    const split = await prisma.splitExpense.findFirst({
      where: {
        id,
        OR: [
          { createdById: req.user.id },
          { participants: { some: { participantId: req.user.id } } },
          { group: { members: { some: { userId: req.user.id } } } },
        ],
      },
      include: {
        participants: true,
      },
    });

    if (!split) {
      return res.status(404).json({ success: false, error: 'Split expense not found or unauthorized' });
    }

    // Debtor authorization: The caller must be the debtor OR the creator/payer confirming settlement
    const isDebtor = data.fromId === req.user.id;
    const isPayerOrCreator = split.paidById === req.user.id || split.createdById === req.user.id;

    if (!isDebtor && !isPayerOrCreator) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to record a settlement on behalf of another debtor',
      });
    }

    // Identify participant debtor: must match data.fromId or data.fromName
    const participant = split.participants.find(
      (p) =>
        (data.fromId && p.participantId === data.fromId) ||
        (data.fromName && p.participantName.toLowerCase() === data.fromName.toLowerCase())
    );

    if (!participant) {
      return res.status(400).json({
        success: false,
        error: `Debtor "${data.fromName}" is not a recognized participant in this split expense`,
      });
    }

    // Prevent over-settling
    if (data.amount > participant.balance + 0.05) {
      return res.status(400).json({
        success: false,
        error: `Settlement amount (₹${data.amount}) exceeds debtor remaining balance (₹${participant.balance})`,
      });
    }

    // Create settlement and update participant balances atomically
    const settlement = await prisma.$transaction(async (tx) => {
      const createdSettlement = await tx.settlement.create({
        data: {
          expenseId: split.id,
          groupId: split.groupId || null,
          fromId: data.fromId,
          fromName: data.fromName,
          toId: data.toId,
          toName: data.toName,
          amount: data.amount,
          currency: data.currency || split.currency,
          note: data.note || null,
          status: 'SETTLED',
        },
      });

      const newSettledAmount = (participant.settledAmount || 0) + data.amount;
      const newBalance = Math.max(0, participant.shareAmount - newSettledAmount);

      await tx.splitParticipant.update({
        where: { id: participant.id },
        data: {
          settledAmount: newSettledAmount,
          balance: newBalance,
        },
      });

      // Check if all participants in the split are now fully settled
      const remainingBalances = split.participants
        .filter((p) => p.id !== participant.id)
        .map((p) => p.balance || 0);

      const allSettled = newBalance === 0 && remainingBalances.every((b) => b <= 0.05);

      if (allSettled) {
        await tx.splitExpense.update({
          where: { id: split.id },
          data: { status: 'SETTLED' },
        });
      }

      return createdSettlement;
    });

    return res.status(200).json({ success: true, settlement });
  } catch (err) {
    next(err);
  }
}

export async function deleteSplit(req, res, next) {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Split ID is required',
      });
    }

    if (!prisma) {
      return res.status(200).json({ success: true, message: 'Deleted locally' });
    }

    const deleted = await prisma.splitExpense.deleteMany({
      where: {
        id,
        createdById: req.user.id,
      },
    });

    if (deleted.count === 0) {
      return res.status(404).json({
        success: false,
        error: 'Split not found or you are not authorized to delete it',
      });
    }

    return res.status(200).json({ success: true, message: 'Split expense deleted successfully' });
  } catch (err) {
    next(err);
  }
}
