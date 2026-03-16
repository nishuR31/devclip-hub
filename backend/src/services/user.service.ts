import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma";
import { AppError, SafeUser } from "../types";
import { config } from "../config/env";
import { rzp } from "../config/razorpay";

export async function getProfile(
  userId: string,
): Promise<SafeUser & { subscription: any }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true },
  });
  if (!user) throw new AppError("User not found", 404, "NOT_FOUND");

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    emailVerified: user.emailVerified,
    avatarUrl: user.avatarUrl,
    twoFactorEnabled: user.twoFactorEnabled,
    plan: user.subscription?.plan ?? "FREE",
    createdAt: user.createdAt,
    subscription:
      user.subscription ?
        {
          plan: user.subscription.plan,
          status: user.subscription.status,
          currentPeriodEnd: user.subscription.currentPeriodEnd,
          cancelAtPeriodEnd: user.subscription.cancelAtPeriodEnd,
          billingInterval: user.subscription.billingInterval,
        }
      : null,
  };
}

export async function updateProfile(
  userId: string,
  data: { name?: string; avatarUrl?: string },
) {
  return prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, name: true, avatarUrl: true, updatedAt: true },
  });
}

export async function deleteAccount(userId: string, password: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404, "NOT_FOUND");

  // If user has a password, verify it
  if (user.passwordHash) {
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid)
      throw new AppError("Invalid password", 401, "INVALID_CREDENTIALS");
  }

  // Cancel Razorpay subscription if active
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (sub?.rzpSubscriptionId) {
    try {
      await (rzp.subscriptions.cancel as Function)(sub.rzpSubscriptionId, false);
    } catch {
      // Don't block account deletion if Razorpay fails
    }
  }

  // Delete user (cascades to all related records)
  await prisma.user.delete({ where: { id: userId } });
}
