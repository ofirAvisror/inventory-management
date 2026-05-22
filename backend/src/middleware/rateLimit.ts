import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";
import { notifySecurityAlert } from "../services/slackNotifier.js";
import { AUTH_ERROR_CODES } from "../types/auth.js";

const rateLimitedBody = {
  code: AUTH_ERROR_CODES.RATE_LIMITED,
  message: "Too many requests. Please try again in a moment.",
};

export const authRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_PERIOD * 1000,
  limit: env.RATE_LIMIT_REQUESTS,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: rateLimitedBody,
});

export const loginRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_PERIOD * 1000,
  limit: env.RATE_LIMIT_REQUESTS,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (req, res) => {
    const body = req.body as { email?: unknown } | undefined;
    const email =
      body && typeof body.email === "string" ? body.email : undefined;

    void notifySecurityAlert({
      kind: "rate_limit",
      endpoint: "POST /api/auth/login",
      ip: req.ip ?? "unknown",
      email,
    });

    res.status(429).json(rateLimitedBody);
  },
});
