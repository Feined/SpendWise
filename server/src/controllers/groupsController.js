import crypto from 'crypto';
import prisma from '../db/prisma.js';
import {
  groupSchema,
  joinGroupSchema,
  addGroupMemberSchema,
} from '../validators/index.js';

export async function getGroups(req, res, next) {
  try {
    if (!prisma) {
      return res.status(200).json({ success: true, groups: [] });
    }

    // Return groups the user created OR belongs to as a registered member
    const groups = await prisma.group.findMany({
      where: {
        OR: [
          { createdById: req.user.id },
          { members: { some: { userId: req.user.id } } },
        ],
      },
      include: {
        members: {
          select: {
            id: true,
            groupId: true,
            userId: true,
            name: true,
            role: true,
            joinedAt: true,
          },
        },
        expenses: {
          include: {
            participants: true,
            settlements: true,
          },
          orderBy: { date: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return res.status(200).json({ success: true, groups });
  } catch (err) {
    next(err);
  }
}

export async function createGroup(req, res, next) {
  try {
    const data = groupSchema.parse(req.body);

    if (!prisma) {
      return res.status(201).json({
        success: true,
        group: {
          id: `group-${Date.now()}`,
          ...data,
          inviteCode: 'TESTCODE',
          createdById: req.user.id,
        },
      });
    }

    // Generate unique 8-character invite code
    const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    // Prepare members: Start with creator
    const creatorName = req.user.name || 'Admin';
    const memberRecords = [
      {
        name: creatorName,
        role: 'ADMIN',
        userId: req.user.id,
      },
    ];

    const addedUserIds = new Set([req.user.id]);
    const addedNames = new Set([creatorName.toLowerCase(), 'you']);

    for (const item of data.members) {
      let memberName = '';
      let memberEmail = null;
      let memberUserId = null;

      if (typeof item === 'string') {
        const trimmed = item.trim();
        if (!trimmed || trimmed.toLowerCase() === 'you') continue;

        if (trimmed.includes('@')) {
          memberEmail = trimmed.toLowerCase();
          memberName = memberEmail.split('@')[0];
        } else {
          memberName = trimmed;
        }
      } else if (typeof item === 'object' && item !== null) {
        memberName = (item.name || '').trim();
        if (item.email) memberEmail = String(item.email).trim().toLowerCase();
        if (item.userId) memberUserId = String(item.userId).trim();
      }

      // If userId provided, check registered user
      if (memberUserId && !addedUserIds.has(memberUserId)) {
        const regUser = await prisma.user.findUnique({
          where: { id: memberUserId },
          select: { id: true, name: true },
        });
        if (regUser && !addedUserIds.has(regUser.id)) {
          addedUserIds.add(regUser.id);
          memberRecords.push({
            name: regUser.name,
            role: 'MEMBER',
            userId: regUser.id,
          });
          continue;
        }
      }

      // If email provided, check if user exists
      if (memberEmail) {
        const regUser = await prisma.user.findUnique({
          where: { email: memberEmail },
          select: { id: true, name: true },
        });
        if (regUser && !addedUserIds.has(regUser.id)) {
          addedUserIds.add(regUser.id);
          memberRecords.push({
            name: regUser.name,
            role: 'MEMBER',
            userId: regUser.id,
          });
          continue;
        }
      }

      // Plain non-registered contact
      if (memberName && !addedNames.has(memberName.toLowerCase())) {
        addedNames.add(memberName.toLowerCase());
        memberRecords.push({
          name: memberName,
          role: 'MEMBER',
          userId: null,
        });
      }
    }

    const group = await prisma.group.create({
      data: {
        createdById: req.user.id,
        name: data.name,
        avatar: data.avatar || null,
        currency: data.currency || 'INR',
        inviteCode,
        members: {
          create: memberRecords,
        },
      },
      include: {
        members: true,
        expenses: true,
      },
    });

    return res.status(201).json({ success: true, group });
  } catch (err) {
    next(err);
  }
}

export async function getGroupDetails(req, res, next) {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Group ID is required',
      });
    }

    if (!prisma) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    // Enforce membership or creator authorization
    const group = await prisma.group.findFirst({
      where: {
        id,
        OR: [
          { createdById: req.user.id },
          { members: { some: { userId: req.user.id } } },
        ],
      },
      include: {
        members: true,
        expenses: {
          include: {
            participants: true,
            settlements: true,
          },
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found or unauthorized',
      });
    }

    return res.status(200).json({ success: true, group });
  } catch (err) {
    next(err);
  }
}

/**
 * Join a group using an invite code or link
 */
export async function joinGroup(req, res, next) {
  try {
    const data = joinGroupSchema.parse(req.body);

    if (!prisma) {
      return res.status(503).json({ success: false, error: 'Database service unavailable' });
    }

    const group = await prisma.group.findUnique({
      where: { inviteCode: data.inviteCode },
      include: {
        members: true,
      },
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Invalid invite code. Group not found.',
      });
    }

    // Check if user is already a member
    const existingMember = group.members.find((m) => m.userId === req.user.id);
    if (existingMember) {
      return res.status(200).json({
        success: true,
        message: `You are already a member of ${group.name}`,
        group,
      });
    }

    // Add user as group member
    // Handle case where their name was added as an unlinked member
    const unlinkedMember = group.members.find(
      (m) =>
        m.userId === null &&
        m.name.toLowerCase() === (req.user.name || '').toLowerCase()
    );

    if (unlinkedMember) {
      await prisma.groupMember.update({
        where: { id: unlinkedMember.id },
        data: { userId: req.user.id },
      });
    } else {
      await prisma.groupMember.create({
        data: {
          groupId: group.id,
          userId: req.user.id,
          name: req.user.name || 'Member',
          role: 'MEMBER',
        },
      });
    }

    const updatedGroup = await prisma.group.findUnique({
      where: { id: group.id },
      include: {
        members: true,
        expenses: {
          include: {
            participants: true,
            settlements: true,
          },
          orderBy: { date: 'desc' },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: `Successfully joined ${group.name}!`,
      group: updatedGroup,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Add a member to an existing group
 */
export async function addGroupMember(req, res, next) {
  try {
    const { id } = req.params;
    const data = addGroupMemberSchema.parse(req.body);

    if (!prisma) {
      return res.status(503).json({ success: false, error: 'Database service unavailable' });
    }

    const group = await prisma.group.findFirst({
      where: {
        id,
        OR: [
          { createdById: req.user.id },
          { members: { some: { userId: req.user.id } } },
        ],
      },
      include: { members: true },
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found or unauthorized',
      });
    }

    let targetUserId = data.userId || null;
    let targetName = (data.name || '').trim();

    if (data.email && !targetUserId) {
      const regUser = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() },
        select: { id: true, name: true },
      });
      if (regUser) {
        targetUserId = regUser.id;
        if (!targetName) targetName = regUser.name;
      } else if (!targetName) {
        targetName = data.email.split('@')[0];
      }
    }

    if (targetUserId) {
      const alreadyMember = group.members.some((m) => m.userId === targetUserId);
      if (alreadyMember) {
        return res.status(409).json({
          success: false,
          error: 'This user is already a member of this group',
        });
      }
    }

    if (!targetName) {
      targetName = 'Friend';
    }

    const newMember = await prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId: targetUserId,
        name: targetName,
        role: 'MEMBER',
      },
    });

    return res.status(201).json({
      success: true,
      member: newMember,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Remove a member from a group or leave group
 */
export async function removeGroupMember(req, res, next) {
  try {
    const { id, memberId } = req.params;

    if (!prisma) {
      return res.status(200).json({ success: true, message: 'Member removed' });
    }

    const group = await prisma.group.findFirst({
      where: {
        id,
        OR: [
          { createdById: req.user.id },
          { members: { some: { userId: req.user.id } } },
        ],
      },
      include: { members: true },
    });

    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found or unauthorized' });
    }

    const member = group.members.find((m) => m.id === memberId || m.userId === memberId);
    if (!member) {
      return res.status(404).json({ success: false, error: 'Member not found in this group' });
    }

    // Only group creator can remove others; any member can remove/leave themselves
    const isCreator = group.createdById === req.user.id;
    const isSelf = member.userId === req.user.id;

    if (!isCreator && !isSelf) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to remove this member from the group',
      });
    }

    await prisma.groupMember.delete({
      where: { id: member.id },
    });

    return res.status(200).json({
      success: true,
      message: isSelf ? 'You have left the group' : `Removed ${member.name} from the group`,
    });
  } catch (err) {
    next(err);
  }
}
