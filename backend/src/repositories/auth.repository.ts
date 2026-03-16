import { prisma } from "../lib/prisma";

export const authRepository = {
  findUserByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  findUserById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  createUserWithFreePlan(data: {
    name?: string | null;
    email: string;
    passwordHash?: string;
    emailVerified?: boolean;
  }) {
    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
        emailVerified: data.emailVerified ?? false,
        subscription: { create: { plan: "FREE" } },
      },
    });
  },

  updateUser(id: string, data: Record<string, unknown>) {
    return prisma.user.update({ where: { id }, data });
  },

  findUserPlan(userId: string) {
    return prisma.subscription.findUnique({
      where: { userId },
      select: { plan: true },
    });
  },

  createRefreshToken(data: {
    userId: string;
    tokenHash: string;
    family: string;
    userAgent?: string | null;
    ip?: string | null;
    expiresAt: Date;
  }) {
    return prisma.refreshToken.create({ data });
  },

  findRefreshTokenByHash(tokenHash: string) {
    return prisma.refreshToken.findUnique({ where: { tokenHash } });
  },

  revokeRefreshTokensByHash(tokenHash: string) {
    return prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });
  },

  revokeRefreshTokenById(id: string) {
    return prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  },

  revokeRefreshTokenFamily(userId: string, family: string) {
    return prisma.refreshToken.updateMany({
      where: { userId, family },
      data: { revokedAt: new Date() },
    });
  },

  revokeActiveRefreshTokensByUser(userId: string) {
    return prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  revokeOtherActiveRefreshTokens(userId: string, currentHash: string) {
    return prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
        tokenHash: { not: currentHash },
      },
      data: { revokedAt: new Date() },
    });
  },
};
