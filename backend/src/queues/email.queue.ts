import { Queue, Worker, Job } from "bullmq";
import { bullRedis } from "../config/redis";
import {
  sendEmail,
  verificationEmailHtml,
  passwordResetEmailHtml,
  magicLinkEmailHtml,
  welcomeEmailHtml,
} from "../lib/email";
import { config } from "../config/env";

export type EmailJobData =
  | { type: "verification"; to: string; name: string; otp: string }
  | { type: "password_reset"; to: string; name: string; otp: string }
  | { type: "magic_link"; to: string; name: string; magicUrl: string }
  | { type: "welcome"; to: string; name: string };

export const emailQueue = new Queue<EmailJobData, unknown, string>("email", {
  connection: bullRedis as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

export function startEmailWorker() {
  const worker = new Worker<EmailJobData, unknown, string>(
    "email",
    async (job: Job<EmailJobData>) => {
      const { type } = job.data;

      if (type === "verification") {
        await sendEmail({
          to: job.data.to,
          subject: "Verify your DevClipboard Hub account",
          html: verificationEmailHtml(job.data.name, job.data.otp),
        });
      } else if (type === "password_reset") {
        await sendEmail({
          to: job.data.to,
          subject: "Reset your DevClipboard Hub password",
          html: passwordResetEmailHtml(job.data.name, job.data.otp),
        });
      } else if (type === "magic_link") {
        await sendEmail({
          to: job.data.to,
          subject: "Your DevClipboard Hub magic sign-in link",
          html: magicLinkEmailHtml(job.data.name, job.data.magicUrl),
        });
      } else if (type === "welcome") {
        await sendEmail({
          to: job.data.to,
          subject: "Welcome to DevClipboard Hub!",
          html: welcomeEmailHtml(job.data.name),
        });
      }
    },
    {
      connection: bullRedis as any,
      concurrency: 5,
    },
  );

  worker.on("failed", (job, err) => {
    console.error(`[EmailQueue] Job ${job?.id} failed:`, err.message);

    if (config.NODE_ENV !== "production") {
      console.warn(
        `[EmailQueue] Non-production mode: verify SMTP creds or set EMAIL_ENABLED=false for local testing.`,
      );
    }
  });

  worker.on("error", (err) => {
    console.error("[EmailQueue] Worker connection error:", err.message);
  });

  return worker;
}

export function enqueueEmail(job: EmailJobData) {
  return emailQueue.add("send" as any, job as any);
}
