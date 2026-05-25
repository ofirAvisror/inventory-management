import crypto from "node:crypto";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";
import type { AuthRole, JwtPayload } from "../types/auth.js";

interface TokenSubject {
  sub: string;
  role: AuthRole;
}

export function signAccessToken(subject: TokenSubject): string {
  const options: SignOptions = {
    algorithm: env.ALGORITHM,
    expiresIn: `${env.ACCESS_TOKEN_EXPIRE_MINUTES}m`,
  };
  return jwt.sign({ ...subject, type: "access" }, env.SECRET_KEY, options);
}

export function signRefreshToken(subject: TokenSubject): string {
  const options: SignOptions = {
    algorithm: env.ALGORITHM,
    expiresIn: `${env.REFRESH_TOKEN_EXPIRE_DAYS}d`,
  };
  return jwt.sign({ ...subject, type: "refresh" }, env.SECRET_KEY, options);
}

export function verifyJwt(token: string): JwtPayload {
  const payload = jwt.verify(token, env.SECRET_KEY, {
    algorithms: [env.ALGORITHM],
  });
  if (typeof payload === "string") {
    throw new Error("Unexpected JWT payload");
  }
  return payload as JwtPayload;
}

export function generateOpaqueToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}
