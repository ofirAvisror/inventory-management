import type { Request } from "express";

export type AuthRole = "admin" | "user";

export interface JwtPayload {
  sub: string;
  role: AuthRole;
  type: "access" | "refresh";
  iat?: number;
  exp?: number;
}

export interface AuthedUser {
  id: string;
  role: AuthRole;
}

export interface AuthedRequest extends Request {
  user?: AuthedUser;
  isAdminByHeader?: boolean;
}

export const AUTH_ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  EMAIL_ALREADY_EXISTS: "EMAIL_ALREADY_EXISTS",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED",
  INVALID_TOKEN: "INVALID_TOKEN",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  UNAUTHENTICATED: "UNAUTHENTICATED",
  FORBIDDEN: "FORBIDDEN",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL: "INTERNAL",
} as const;

export type AuthErrorCode =
  (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES];
