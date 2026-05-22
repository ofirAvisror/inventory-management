import { Router } from "express";
import {
  forgotPasswordHandler,
  loginHandler,
  logoutHandler,
  meHandler,
  registerHandler,
  resendVerificationHandler,
  resetPasswordHandler,
  verifyEmailHandler,
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import { authRateLimiter } from "../middleware/rateLimit.js";
import { validateBody } from "../middleware/validate.js";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
} from "../validators/auth.js";

const router = Router();

router.post(
  "/register",
  authRateLimiter,
  validateBody(registerSchema),
  registerHandler
);

router.get("/verify-email", verifyEmailHandler);

router.post(
  "/resend-verification",
  authRateLimiter,
  validateBody(resendVerificationSchema),
  resendVerificationHandler
);

router.post(
  "/login",
  authRateLimiter,
  validateBody(loginSchema),
  loginHandler
);

router.post("/logout", logoutHandler);

router.get("/me", requireAuth, meHandler);

router.post(
  "/forgot-password",
  authRateLimiter,
  validateBody(forgotPasswordSchema),
  forgotPasswordHandler
);

router.post(
  "/reset-password",
  authRateLimiter,
  validateBody(resetPasswordSchema),
  resetPasswordHandler
);

export default router;
