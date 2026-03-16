// Shared types across the server

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export interface AuthUser {
  id: string;
  email: string;
  plan: string;
}

export interface SafeUser {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  avatarUrl: string | null;
  twoFactorEnabled: boolean;
  plan: string;
  createdAt: Date;
}
