import type { Response } from "express";
import { env } from "../config/env.js";

const REFRESH_COOKIE_NAME = "refresh_token";

const baseCookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: "lax" as const,
  path: "/",
};

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string
): void {
  res.cookie(env.ACCESS_TOKEN_COOKIE_NAME, accessToken, {
    ...baseCookieOptions,
    maxAge: env.ACCESS_TOKEN_EXPIRE_MINUTES * 60_000,
  });
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    ...baseCookieOptions,
    maxAge: env.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60_000,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(env.ACCESS_TOKEN_COOKIE_NAME, baseCookieOptions);
  res.clearCookie(REFRESH_COOKIE_NAME, baseCookieOptions);
}
