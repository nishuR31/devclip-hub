import { Response } from "express";

export function sendSuccess<T>(
  res: Response,
  message: string,
  code: number,
  payload?: T,
) {
  const isPlainObject =
    payload !== null &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    !(payload instanceof Date);

  return res.status(code).json({
    success: true,
    message,
    ...(payload === undefined ? {}
    : isPlainObject ? (payload as object)
    : { data: payload }),
  });
}

export function sendError(
  res: Response,
  message: string,
  code: number,
  payload?: Record<string, unknown>,
) {
  return res.status(code).json({
    success: false,
    message,
    ...(payload ? payload : {}),
  });
}
