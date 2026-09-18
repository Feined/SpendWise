import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../db/prisma.js';
import { config } from '../config/index.js';
import { registerSchema, loginSchema, refreshTokenSchema } from '../validators/index.js';

function createAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

function createRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function saveRefreshToken(userId, refreshToken) {
  const expiresAt = new Date(
    Date.now() + config.refreshTokenExpiresInDays * 24 * 60 * 60 * 1000
  );

  await prisma.refreshToken.create({
    data: {
      userId,
      token: hashRefreshToken(refreshToken),
      expiresAt,
    },
  });

  return refreshToken;
}

export async function register(req, res, next) {
  try {
    const data = registerSchema.parse(req.body);

    if (!prisma) {
      return res.status(503).json({
        success: false,
        error: 'Database service is not connected. Configure DATABASE_URL in .env to enable backend accounts.',
      });
    }

    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Email already registered',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash,
        settings: {
          create: {
            currencyCode: 'INR',
            currencySymbol: '₹',
            theme: 'system',
            accentColor: 'emerald',
          },
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        createdAt: true,
      },
    });

    const token = createAccessToken(user);
    const refreshToken = createRefreshToken();

    await saveRefreshToken(user.id, refreshToken);

    return res.status(201).json({
      success: true,
      user,
      token,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const data = loginSchema.parse(req.body);

    if (!prisma) {
      return res.status(503).json({
        success: false,
        error: 'Database service is not connected. Configure DATABASE_URL in .env to enable backend accounts.',
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: { settings: true },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    const valid = await bcrypt.compare(data.password, user.passwordHash);

    if (!valid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    const token = createAccessToken(user);
    const refreshToken = createRefreshToken();

    await saveRefreshToken(user.id, refreshToken);

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        settings: user.settings,
      },
      token,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const data = refreshTokenSchema.parse(req.body);
    const { refreshToken } = data;

    if (!prisma) {
      return res.status(503).json({
        success: false,
        error: 'Database service is not connected.',
      });
    }

    const tokenHash = hashRefreshToken(refreshToken);

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: tokenHash },
      include: { user: true },
    });

    if (!storedToken || storedToken.expiresAt <= new Date()) {
      if (storedToken) {
        await prisma.refreshToken.delete({
          where: { id: storedToken.id },
        });
      }

      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token',
      });
    }

    // Refresh Token Rotation: Delete consumed refresh token and issue a fresh pair
    await prisma.refreshToken.delete({
      where: { id: storedToken.id },
    });

    const newAccessToken = createAccessToken(storedToken.user);
    const newRefreshToken = createRefreshToken();
    await saveRefreshToken(storedToken.user.id, newRefreshToken);

    return res.status(200).json({
      success: true,
      token: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    if (!prisma) {
      return res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    }

    const { refreshToken } = req.body || {};

    if (refreshToken && typeof refreshToken === 'string') {
      const tokenHash = hashRefreshToken(refreshToken.trim());
      await prisma.refreshToken.deleteMany({
        where: {
          userId: req.user.id,
          token: tokenHash,
        },
      });
    } else {
      // Clear all active sessions for this user
      await prisma.refreshToken.deleteMany({
        where: { userId: req.user.id },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res, next) {
  try {
    if (!prisma) {
      return res.status(200).json({
        success: true,
        user: {
          id: req.user.id,
          email: req.user.email,
          name: 'SpendWise User',
        },
        offlineMode: true,
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        settings: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (err) {
    next(err);
  }
}