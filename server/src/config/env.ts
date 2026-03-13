import { z } from "zod";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "../../.env") });

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3001),
  FRONTEND_URL: z.string().default("http://localhost:8080"),

  DATABASE_URL: z.string({ required_error: "DATABASE_URL is required" }),
  REDIS_URL: z.string().default("redis://localhost:6379"),

  ACCESS_TOKEN_SECRET: z
    .string({ required_error: "ACCESS_TOKEN_SECRET is required" })
    .min(32),
  REFRESH_TOKEN_SECRET: z
    .string({ required_error: "REFRESH_TOKEN_SECRET is required" })
    .min(32),
  TWO_FACTOR_TOKEN_SECRET: z
    .string({ required_error: "TWO_FACTOR_TOKEN_SECRET is required" })
    .min(32),
  TOTP_ENCRYPTION_KEY: z
    .string({ required_error: "TOTP_ENCRYPTION_KEY is required" })
    .min(32),

  // Email — Gmail SMTP with App Password
  EMAIL_FROM: z.string().default("noreply@gmail.com"),
  EMAIL_FROM_NAME: z.string().default("DevClipboard Hub"),
  EMAIL_FROM_PASS: z.string({ required_error: "EMAIL_FROM_PASS is required" }),

  // Razorpay
  RAZORPAY_KEY_ID: z.string().default(""),
  RAZORPAY_KEY_SECRET: z.string().default(""),
  RAZORPAY_WEBHOOK_SECRET: z.string().default(""),
  RAZORPAY_STARTER_MONTHLY_PLAN_ID: z.string().default(""),
  RAZORPAY_STARTER_YEARLY_PLAN_ID: z.string().default(""),
  RAZORPAY_PRO_MONTHLY_PLAN_ID: z.string().default(""),
  RAZORPAY_PRO_YEARLY_PLAN_ID: z.string().default(""),
  RAZORPAY_TEAM_MONTHLY_PLAN_ID: z.string().default(""),
  RAZORPAY_TEAM_YEARLY_PLAN_ID: z.string().default(""),

  BCRYPT_ROUNDS: z.coerce.number().default(12),
  OTP_EXPIRES_SECONDS: z.coerce.number().default(600),
  MAGIC_LINK_EXPIRES_SECONDS: z.coerce.number().default(900),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
