import { prisma } from "../lib/prisma";

export const subscriptionRepository = {
  findByUserId(userId: string) {
    return prisma.subscription.findUnique({ where: { userId } });
  },

  createFreeForUser(userId: string) {
    return prisma.subscription.create({ data: { userId, plan: "FREE" } });
  },

  updateByUserId(userId: string, data: Record<string, unknown>) {
    return prisma.subscription.update({ where: { userId }, data });
  },

  updateManyByRzpSubscriptionId(
    rzpSubscriptionId: string,
    data: Record<string, unknown>,
  ) {
    return prisma.subscription.updateMany({
      where: { rzpSubscriptionId },
      data,
    });
  },
};
