import { Queue, Worker } from "bullmq";
import { bullRedis } from "../config/redis";
import { prisma } from "../lib/prisma";
import { config } from "../config/env";

export const cleanupQueue = new Queue("cleanup", {
  connection: bullRedis as any,
});

export async function scheduleCleanup() {
  // Run daily at 2am
  await cleanupQueue.add(
    "daily-cleanup",
    {},
    {
      repeat: { pattern: "0 2 * * *" },
      removeOnComplete: 10,
      removeOnFail: 10,
    },
  );
}

export function startCleanupWorker() {
  const worker = new Worker(
    "cleanup",
    async () => {
      const now = new Date();

      // Delete expired email verifications
      await prisma.emailVerification.deleteMany({
        where: { expiresAt: { lt: now } },
      });

      // Delete expired password resets
      await prisma.passwordReset.deleteMany({
        where: { expiresAt: { lt: now } },
      });

      // Delete revoked refresh tokens older than 30 days
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      await prisma.refreshToken.deleteMany({
        where: {
          revokedAt: { not: null, lt: thirtyDaysAgo },
        },
      });

      console.log("[Cleanup] Daily cleanup completed");
    },
    { connection: bullRedis as any },
  );

  worker.on("error", (err) => {
    console.error("[CleanupQueue] Worker connection error:", err.message);
  });

  return worker;
}
