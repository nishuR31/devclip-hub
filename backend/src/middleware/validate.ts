import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = (result.error as ZodError).flatten();
      return res.status(422).json({
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        errors: errors.fieldErrors,
      });
    }
    req.body = result.data;
    next();
  };
}
