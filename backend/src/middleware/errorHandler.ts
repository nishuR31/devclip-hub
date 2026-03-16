import { Request, Response, NextFunction } from "express";
import { AppError } from "../types";
import { Prisma } from "@prisma/client";
import { config } from "../config/env";
import { sendError } from "../utils/response";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // Known application errors
  if (err instanceof AppError) {
    return sendError(res, err.message, err.statusCode, {
      code: err.code ?? "ERROR",
    });
  }

  // Prisma unique constraint violation
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return sendError(res, "A record with that value already exists.", 409, {
        code: "ALREADY_EXISTS",
      });
    }
    if (err.code === "P2025") {
      return sendError(res, "Record not found.", 404, {
        code: "NOT_FOUND",
      });
    }
  }

  // JWT errors (caught earlier but safety net)
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return sendError(res, "Invalid or expired token", 401, {
      code: "UNAUTHORIZED",
    });
  }

  // Unknown errors
  console.error("[Server Error]", err);
  const message =
    config.NODE_ENV === "development" ? err.message : "Internal server error";

  return sendError(res, message, 500, { code: "INTERNAL_ERROR" });
}
