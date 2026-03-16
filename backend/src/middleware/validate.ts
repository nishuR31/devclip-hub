import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { sendError } from "../utils/response";

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = (result.error as ZodError).flatten();
      return sendError(res, "Validation failed", 422, {
        code: "VALIDATION_ERROR",
        errors: errors.fieldErrors,
      });
    }
    req.body = result.data;
    next();
  };
}
