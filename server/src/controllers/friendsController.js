import prisma from '../db/prisma.js';
import { friendSchema, friendRequestSchema } from '../validators/index.js';

/**
 * Search registered SpendWise users by name or email
 */
export async function searchUsers(req, res, next) {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    if (!q || q.length < 1) {
      return res.status(200).json({ success: true, users: [] });
    }

    if (!prisma) {
      return res.status(200).json({ success: true, users: [] });
    }

    const users = await prisma.user.findMany({
      where: {
        id: { not: req.user.id },
        OR: [
          { email: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
      },
      take: 15,
    });

    return res.status(200).json({ success: true, users });
  } catch (err) {
    next(err);
  }
}

/**
 * Send a friend request to a registered user or record a pending invite
 */
export async function sendFriendRequest(req, res, next) {
  try {
    const data = friendRequestSchema.parse(req.body);

    if (!prisma) {
      return res.status(503).json({ success: false, error: 'Database service unavailable' });
    }

    let targetUser = null;
    const targetUserId = data.targetUserId || data.friendUserId;
    if (targetUserId) {
      targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, name: true, email: true, avatar: true },
      });
    } else if (data.email) {
      targetUser = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() },
        select: { id: true, name: true, email: true, avatar: true },
      });
    }

    // If target user is not yet registered, save as an invite contact in Friend table
    if (!targetUser) {
      const inviteName = data.email ? data.email.split('@')[0] : 'Invited Friend';
      const friend = await prisma.friend.upsert({
        where: {
          id: `invite-${req.user.id}-${data.email}`,
        },
        update: { email: data.email },
        create: {
          userId: req.user.id,
          name: inviteName,
          email: data.email,
          avatar: inviteName[0].toUpperCase(),
        },
      }).catch(async () => {
        return prisma.friend.create({
          data: {
            userId: req.user.id,
            name: inviteName,
            email: data.email,
            avatar: inviteName[0].toUpperCase(),
          },
        });
      });

      return res.status(200).json({
        success: true,
        isRegistered: false,
        message: 'Friend invitation recorded. Once they register, connection will link automatically.',
        friend,
      });
    }

    if (targetUser.id === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'You cannot send a friend request to yourself',
      });
    }

    // Check existing friendship
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: req.user.id, addresseeId: targetUser.id },
          { requesterId: targetUser.id, addresseeId: req.user.id },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        return res.status(409).json({
          success: false,
          error: `You are already connected with ${targetUser.name}`,
        });
      }
      if (existing.status === 'PENDING') {
        if (existing.requesterId === req.user.id) {
          return res.status(409).json({
            success: false,
            error: `A friend request to ${targetUser.name} is already pending`,
          });
        } else {
          // If the other user already sent a request, auto-accept it!
          const accepted = await prisma.friendship.update({
            where: { id: existing.id },
            data: { status: 'ACCEPTED' },
          });
          return res.status(200).json({
            success: true,
            message: `Accepted existing friend request from ${targetUser.name}!`,
            friendship: accepted,
          });
        }
      }
      // Re-activate previously declined request
      const updated = await prisma.friendship.update({
        where: { id: existing.id },
        data: {
          requesterId: req.user.id,
          addresseeId: targetUser.id,
          status: 'PENDING',
        },
      });
      return res.status(200).json({
        success: true,
        message: `Friend request sent to ${targetUser.name}`,
        request: updated,
      });
    }

    const request = await prisma.friendship.create({
      data: {
        requesterId: req.user.id,
        addresseeId: targetUser.id,
        status: 'PENDING',
      },
    });

    return res.status(201).json({
      success: true,
      message: `Friend request sent to ${targetUser.name}`,
      request,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get incoming and outgoing pending friend requests
 */
export async function getFriendRequests(req, res, next) {
  try {
    if (!prisma) {
      return res.status(200).json({ success: true, incoming: [], outgoing: [] });
    }

    const [incoming, outgoing] = await Promise.all([
      prisma.friendship.findMany({
        where: {
          addresseeId: req.user.id,
          status: 'PENDING',
        },
        include: {
          requester: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.friendship.findMany({
        where: {
          requesterId: req.user.id,
          status: 'PENDING',
        },
        include: {
          addressee: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return res.status(200).json({
      success: true,
      incoming: incoming.map((r) => ({
        id: r.id,
        userId: r.requester.id,
        user: r.requester,
        sender: r.requester,
        status: r.status,
        createdAt: r.createdAt,
      })),
      outgoing: outgoing.map((r) => ({
        id: r.id,
        userId: r.addressee.id,
        user: r.addressee,
        recipient: r.addressee,
        status: r.status,
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Accept incoming friend request
 */
export async function acceptFriendRequest(req, res, next) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, error: 'Request ID is required' });
    }

    if (!prisma) {
      return res.status(200).json({ success: true, message: 'Friend request accepted' });
    }

    const request = await prisma.friendship.findFirst({
      where: {
        id,
        addresseeId: req.user.id,
      },
      include: {
        requester: { select: { id: true, name: true, email: true } },
      },
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Pending friend request not found or unauthorized',
      });
    }

    const updated = await prisma.friendship.update({
      where: { id: request.id },
      data: { status: 'ACCEPTED' },
    });

    return res.status(200).json({
      success: true,
      message: `You are now friends with ${request.requester.name}!`,
      friendship: updated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Decline incoming friend request or cancel outgoing request
 */
export async function declineFriendRequest(req, res, next) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, error: 'Request ID is required' });
    }

    if (!prisma) {
      return res.status(200).json({ success: true, message: 'Request removed' });
    }

    const deleted = await prisma.friendship.deleteMany({
      where: {
        id,
        OR: [
          { addresseeId: req.user.id },
          { requesterId: req.user.id },
        ],
      },
    });

    if (deleted.count === 0) {
      return res.status(404).json({
        success: false,
        error: 'Friend request not found or unauthorized',
      });
    }

    return res.status(200).json({ success: true, message: 'Friend request removed' });
  } catch (err) {
    next(err);
  }
}

/**
 * Fetch all accepted friends and private contacts
 */
export async function getFriends(req, res, next) {
  try {
    if (!prisma) {
      return res.status(200).json({ success: true, friends: [] });
    }

    // 1. Fetch accepted friendships
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { requesterId: req.user.id, status: 'ACCEPTED' },
          { addresseeId: req.user.id, status: 'ACCEPTED' },
        ],
      },
      include: {
        requester: { select: { id: true, name: true, email: true, avatar: true } },
        addressee: { select: { id: true, name: true, email: true, avatar: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const connectedUserIds = new Set();
    const connectedEmails = new Set();

    const connectedFriends = friendships.map((f) => {
      const isRequester = f.requesterId === req.user.id;
      const otherUser = isRequester ? f.addressee : f.requester;
      connectedUserIds.add(otherUser.id);
      if (otherUser.email) connectedEmails.add(otherUser.email.toLowerCase());

      return {
        id: otherUser.id,
        friendshipId: f.id,
        friendUserId: otherUser.id,
        userId: req.user.id,
        name: otherUser.name,
        email: otherUser.email,
        avatar: otherUser.avatar || otherUser.name[0]?.toUpperCase() || 'F',
        isConnectedAccount: true,
        status: 'ACCEPTED',
        createdAt: f.createdAt,
      };
    });

    // 2. Fetch private contacts from Friend table
    const privateContacts = await prisma.friend.findMany({
      where: { userId: req.user.id },
      orderBy: { name: 'asc' },
    });

    // Merge: include private contacts not already covered by connected account
    const nonConnectedContacts = privateContacts.filter((c) => {
      if (c.friendUserId && connectedUserIds.has(c.friendUserId)) return false;
      if (c.email && connectedEmails.has(c.email.toLowerCase())) return false;
      return true;
    });

    const friends = [...connectedFriends, ...nonConnectedContacts];

    return res.status(200).json({ success: true, friends });
  } catch (err) {
    next(err);
  }
}

/**
 * Add a private contact
 */
export async function createFriend(req, res, next) {
  try {
    const data = friendSchema.parse(req.body);

    if (!prisma) {
      return res.status(201).json({
        success: true,
        friend: { id: `friend-${Date.now()}`, ...data, userId: req.user.id },
      });
    }

    // Link to registered user if email matches
    let friendUserId = null;
    if (data.email) {
      const registeredUser = await prisma.user.findUnique({
        where: { email: data.email },
        select: { id: true, name: true },
      });
      if (registeredUser && registeredUser.id !== req.user.id) {
        friendUserId = registeredUser.id;

        // Auto-create or ensure friendship exists
        await prisma.friendship.upsert({
          where: {
            requesterId_addresseeId: {
              requesterId: req.user.id,
              addresseeId: registeredUser.id,
            },
          },
          update: { status: 'ACCEPTED' },
          create: {
            requesterId: req.user.id,
            addresseeId: registeredUser.id,
            status: 'ACCEPTED',
          },
        }).catch(() => {});
      }
    }

    const friend = await prisma.friend.create({
      data: {
        userId: req.user.id,
        friendUserId,
        name: data.name,
        avatar: data.avatar || data.name[0]?.toUpperCase() || 'F',
        email: data.email || null,
      },
    });

    return res.status(201).json({
      success: true,
      friend: {
        ...friend,
        id: friendUserId || friend.id,
        isConnectedAccount: !!friendUserId,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Remove friend connection or private contact
 */
export async function deleteFriend(req, res, next) {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Friend ID is required',
      });
    }

    if (!prisma) {
      return res.status(200).json({ success: true, message: 'Friend removed' });
    }

    // 1. Try deleting Friendship where caller is participant and target is id (or friendship id is id)
    const friendshipDeleted = await prisma.friendship.deleteMany({
      where: {
        OR: [
          { id },
          { requesterId: req.user.id, addresseeId: id },
          { requesterId: id, addresseeId: req.user.id },
        ],
      },
    });

    // 2. Try deleting private contact
    const contactDeleted = await prisma.friend.deleteMany({
      where: {
        userId: req.user.id,
        OR: [
          { id },
          { friendUserId: id },
        ],
      },
    });

    if (friendshipDeleted.count === 0 && contactDeleted.count === 0) {
      return res.status(404).json({
        success: false,
        error: 'Friend record not found or unauthorized',
      });
    }

    return res.status(200).json({ success: true, message: 'Friend removed successfully' });
  } catch (err) {
    next(err);
  }
}
