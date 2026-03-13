import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";
import { AppError } from "../types";

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const authHeader = req.headers.authorization || req.cookies.devClip;
    if (!authHeader?.startsWith("Bearer ")) {
      throw new AppError("No token provided", 401, "UNAUTHORIZED");
    }
    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);

    // Lookup current plan (may differ from token if subscription changed)
    const sub = await prisma.subscription.findUnique({
      where: { userId: payload.sub },
      select: { plan: true },
    });

    req.user = {
      id: payload.sub,
      email: payload.email,
      plan: sub?.plan ?? "FREE",
    };
    next();
  } catch (err: any) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return next(
        new AppError("Invalid or expired token", 401, "UNAUTHORIZED"),
      );
    }
    next(err);
  }
}
