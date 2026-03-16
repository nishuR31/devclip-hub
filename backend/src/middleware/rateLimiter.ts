import rateLimit from "express-rate-limit";
import { config } from "../config/env";

// General API: 200 requests per 15 minutes
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: "RATE_LIMITED", message: "Too many requests, slow down." },
});

// Auth endpoints: 10 attempts per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: "RATE_LIMITED",
    message: "Too many attempts. Please wait 15 minutes.",
  },
});

// Strict: 5 attempts per hour (magic links, password reset sends)
export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: "RATE_LIMITED",
    message: "Too many requests. Please wait an hour.",
  },
});
