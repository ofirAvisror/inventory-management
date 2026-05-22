import type { NextFunction, Response } from "express";
import { env } from "../config/env.js";
import { verifyJwt, safeEqual } from "../services/tokens.js";
import { AUTH_ERROR_CODES, type AuthedRequest } from "../types/auth.js";
import { HttpError } from "./error.js";

function readAccessToken(req: AuthedRequest): string | null {
  const fromCookie = req.cookies?.[env.ACCESS_TOKEN_COOKIE_NAME];
  if (typeof fromCookie === "string" && fromCookie.length > 0) {
    return fromCookie;
  }
  const authHeader = req.header("authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }
  return null;
}

function hasValidAdminHeader(req: AuthedRequest): boolean {
  const provided = req.header(env.ADMIN_HEADER_NAME);
  if (!provided) return false;
  return safeEqual(provided, env.ADMIN_HEADER_VALUE);
}

export function attachAuth(
  req: AuthedRequest,
  _res: Response,
  next: NextFunction
): void {
  const token = readAccessToken(req);
  if (token) {
    try {
      const payload = verifyJwt(token);
      if (payload.type === "access") {
        req.user = { id: payload.sub, role: payload.role };
      }
    } catch {
      // Invalid token is ignored here; requireAuth will enforce.
    }
  }
  req.isAdminByHeader = hasValidAdminHeader(req);
  next();
}

export function requireAuth(
  req: AuthedRequest,
  _res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    throw new HttpError(
      401,
      AUTH_ERROR_CODES.UNAUTHENTICATED,
      "Authentication required"
    );
  }
  next();
}

export function requireAdmin(
  req: AuthedRequest,
  _res: Response,
  next: NextFunction
): void {
  const fromJwt = req.user?.role === "admin";
  const fromHeader = req.isAdminByHeader === true;
  if (!fromJwt && !fromHeader) {
    throw new HttpError(403, AUTH_ERROR_CODES.FORBIDDEN, "Admin access required");
  }
  next();
}
