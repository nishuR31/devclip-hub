import { Queue, Worker, Job } from "bullmq";
import { bullRedis } from "../config/redis";
import { handleWebhookEvent } from "../services/payment.service";

export interface RazorpayEventJobData {
  event: any;
}

export const razorpayQueue = new Queue<RazorpayEventJobData>("razorpay-events", {
  connection: bullRedis,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 3000 },
    removeOnComplete: 50,
    removeOnFail: 100,
  },
});

export function startRazorpayWorker() {
  const worker = new Worker<RazorpayEventJobData>(
    "razorpay-events",
    async (job: Job<RazorpayEventJobData>) => {
      await handleWebhookEvent(job.data.event);
    },
    {
      connection: bullRedis,
      concurrency: 1, // one at a time to avoid race conditions
    },
  );

  worker.on("failed", (job, err) => {
    console.error(
      `[RazorpayQueue] Job ${job?.id} (${job?.data?.event?.event}) failed:`,
      err.message,
    );
  });

  return worker;
}
