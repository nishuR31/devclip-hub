import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { config } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";

// Routes
import authRouter from "./routes/auth";
import usersRouter from "./routes/users";
import subscriptionsRouter from "./routes/subscriptions";
import paymentsRouter from "./routes/payments";
import webhooksRouter from "./routes/webhooks";
import clipboardRouter from "./routes/clipboard";
import snippetsRouter from "./routes/snippets";
import workspaceRouter from "./routes/workspace";
import guestRouter from "./routes/guest";

// Queues
import { startEmailWorker } from "./queues/email.queue";
import { startRazorpayWorker } from "./queues/razorpay.queue";
import { startCleanupWorker, scheduleCleanup } from "./queues/cleanup.queue";

const app = express();

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: config.FRONTEND_URL,
    credentials: true,
  }),
);

// ── Webhooks (MUST be before express.json — needs raw body) ──────────────────
app.use(
  "/api/webhooks",
  express.raw({ type: "application/json" }),
  webhooksRouter,
);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.status(200).json({ message: "Running" });
});
// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/subscriptions", subscriptionsRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/clipboard", clipboardRouter);
app.use("/api/snippets", snippetsRouter);
app.use("/api/workspace", workspaceRouter);
app.use("/api/guest", guestRouter);

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Error handler (must be last) ──────────────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = config.PORT;
app.listen(PORT, () => {
  console.log(
    `[Server] Running on http://localhost:${PORT} (${config.NODE_ENV})`,
  );

  // Start BullMQ workers
  startEmailWorker();
  startRazorpayWorker();
  startCleanupWorker();
  scheduleCleanup().catch((err) =>
    console.error("[Cleanup] Failed to schedule cron:", err),
  );
});

export default app;
