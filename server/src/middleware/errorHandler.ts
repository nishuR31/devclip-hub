import { Request, Response, NextFunction } from "express";
import { AppError } from "../types";
import { Prisma } from "@prisma/client";
import { config } from "../config/env";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Known application errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      code: err.code ?? "ERROR",
      message: err.message,
    });
  }

  // Prisma unique constraint violation
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({
        code: "ALREADY_EXISTS",
        message: "A record with that value already exists.",
      });
    }
    if (err.code === "P2025") {
      return res.status(404).json({
        code: "NOT_FOUND",
        message: "Record not found.",
      });
    }
  }

  // JWT errors (caught earlier but safety net)
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return res.status(401).json({
      code: "UNAUTHORIZED",
      message: "Invalid or expired token",
    });
  }

  // Unknown errors
  console.error("[Server Error]", err);
  const message =
    config.NODE_ENV === "development" ? err.message : "Internal server error";

  return res.status(500).json({ code: "INTERNAL_ERROR", message });
}
