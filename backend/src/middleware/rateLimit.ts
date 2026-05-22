import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";
import { AUTH_ERROR_CODES } from "../types/auth.js";

export const authRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_PERIOD * 1000,
  limit: env.RATE_LIMIT_REQUESTS,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    code: AUTH_ERROR_CODES.RATE_LIMITED,
    message: "Too many requests. Please try again in a moment.",
  },
});
