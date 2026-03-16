import { prisma } from "../lib/prisma";

export const userRepository = {
  findUserByIdWithSubscription(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });
  },

  findUserById(userId: string) {
    return prisma.user.findUnique({ where: { id: userId } });
  },

  updateUserProfile(
    userId: string,
    data: { name?: string; avatarUrl?: string },
  ) {
    return prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, name: true, avatarUrl: true, updatedAt: true },
    });
  },

  findSubscriptionByUserId(userId: string) {
    return prisma.subscription.findUnique({ where: { userId } });
  },

  deleteUserById(userId: string) {
    return prisma.user.delete({ where: { id: userId } });
  },
};
