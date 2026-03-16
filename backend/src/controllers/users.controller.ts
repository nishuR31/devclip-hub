import { Request, Response } from "express";
import * as userService from "../services/user.service";
import { sendSuccess } from "../utils/response";

export async function getMe(req: Request, res: Response) {
  const profile = await userService.getProfile(req.user!.id);
  return sendSuccess(res, "Profile fetched", 200, profile);
}

export async function updateMe(req: Request, res: Response) {
  const updated = await userService.updateProfile(req.user!.id, req.body);
  return sendSuccess(res, "Profile updated", 200, updated);
}

export async function deleteMe(req: Request, res: Response) {
  await userService.deleteAccount(req.user!.id, req.body.password);
  res.clearCookie("refreshToken", { path: "/api/auth" });
  return sendSuccess(res, "Account deleted", 200);
}
