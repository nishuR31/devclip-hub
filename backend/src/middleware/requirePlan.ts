import { Request, Response, NextFunction } from "express";
import { AppError } from "../types";

const PLAN_HIERARCHY: Record<string, number> = {
  FREE: 0,
  STARTER: 1,
  PRO: 2,
  TEAM: 3,
};

export function requirePlan(minPlan: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userPlan = req.user?.plan ?? "FREE";
    const userLevel = PLAN_HIERARCHY[userPlan] ?? 0;
    const requiredLevel = PLAN_HIERARCHY[minPlan] ?? 99;

    if (userLevel >= requiredLevel) {
      return next();
    }

    return next(
      new AppError(
        `This feature requires ${minPlan} plan or higher`,
        403,
        "UPGRADE_REQUIRED",
      ),
    );
  };
}
