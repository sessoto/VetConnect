import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  loginSchema,
  registerClinicSchema,
  refreshSchema,
  type Me,
} from '@vetconnect/shared';
import { prisma } from '../prisma.js';
import { hashPassword, hashRefreshToken, verifyPassword } from '../lib/hash.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../lib/jwt.js';
import { validateBody } from '../lib/validate.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { badRequest, conflict, unauthorized } from '../lib/errors.js';
import { authRequired } from '../middleware/auth.js';
import crypto from 'node:crypto';
import { env } from '../env.js';

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const router: Router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

async function issueTokens(userId: string, clinicId: string, role: 'admin' | 'vet' | 'assistant') {
  const accessToken = signAccessToken({ sub: userId, clinicId, role });
  const jti = crypto.randomUUID();
  const refreshToken = signRefreshToken({ sub: userId, jti });
  await prisma.refreshToken.create({
    data: {
      id: jti,
      userId,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    },
  });
  return { accessToken, refreshToken };
}

router.post(
  '/register-clinic',
  validateBody(registerClinicSchema),
  asyncHandler(async (req, res) => {
    const { clinicName, adminName, email, password } = req.body;
    const existing = await prisma.user.findFirst({ where: { email } });
    if (existing) throw conflict('Email already in use');

    const passwordHash = await hashPassword(password);
    const clinic = await prisma.clinic.create({
      data: {
        name: clinicName,
        users: {
          create: {
            email,
            passwordHash,
            name: adminName,
            role: 'admin',
          },
        },
      },
      include: { users: true },
    });
    const admin = clinic.users[0]!;
    const tokens = await issueTokens(admin.id, clinic.id, admin.role);
    const me: Me = {
      id: admin.id,
      clinicId: clinic.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    };
    res.status(201).json({ ...tokens, user: me });
  }),
);

router.post(
  '/login',
  loginLimiter,
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) throw unauthorized('Invalid credentials');

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw unauthorized('Account temporarily locked. Try again later.');
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      const next = user.failedLogins + 1;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLogins: next,
          lockedUntil:
            next >= MAX_FAILED_LOGINS
              ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000)
              : null,
        },
      });
      throw unauthorized('Invalid credentials');
    }

    if (user.failedLogins > 0 || user.lockedUntil) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLogins: 0, lockedUntil: null },
      });
    }

    const tokens = await issueTokens(user.id, user.clinicId, user.role);
    const me: Me = {
      id: user.id,
      clinicId: user.clinicId,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    res.json({ ...tokens, user: me });
  }),
);

router.post(
  '/refresh',
  validateBody(refreshSchema),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw unauthorized('Invalid refresh token');
    }
    const stored = await prisma.refreshToken.findUnique({
      where: { id: payload.jti },
      include: { user: true },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw unauthorized('Invalid refresh token');
    }
    if (stored.tokenHash !== hashRefreshToken(refreshToken)) {
      throw unauthorized('Invalid refresh token');
    }
    // Rotate
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    const tokens = await issueTokens(
      stored.user.id,
      stored.user.clinicId,
      stored.user.role,
    );
    res.json(tokens);
  }),
);

router.post(
  '/logout',
  authRequired,
  asyncHandler(async (req, res) => {
    const refreshToken = (req.body?.refreshToken as string | undefined) ?? null;
    if (refreshToken) {
      try {
        const payload = verifyRefreshToken(refreshToken);
        await prisma.refreshToken.updateMany({
          where: { id: payload.jti, userId: req.user!.id },
          data: { revokedAt: new Date() },
        });
      } catch {
        // ignore — logout is best-effort
      }
    }
    res.status(204).end();
  }),
);

router.post(
  '/logout-all',
  authRequired,
  asyncHandler(async (req, res) => {
    await prisma.refreshToken.updateMany({
      where: { userId: req.user!.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    res.status(204).end();
  }),
);

router.get(
  '/me',
  authRequired,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw unauthorized();
    const me: Me = {
      id: user.id,
      clinicId: user.clinicId,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    res.json(me);
  }),
);

// Defensive: ensure env is loaded
if (!env.JWT_ACCESS_SECRET) throw badRequest('JWT_ACCESS_SECRET missing');

export default router;
