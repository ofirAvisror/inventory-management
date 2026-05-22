import type { NextFunction, Request, Response } from "express";
import {
  getUserById,
  loginUser,
  registerUser,
  requestPasswordReset,
  resendVerification,
  resetPassword,
  verifyEmail,
} from "../services/authService.js";
import { clearAuthCookies, setAuthCookies } from "../services/cookies.js";
import { AUTH_ERROR_CODES, type AuthedRequest } from "../types/auth.js";
import { HttpError } from "../middleware/error.js";
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResendVerificationInput,
  ResetPasswordInput,
} from "../validators/auth.js";

const GENERIC_FORGOT_RESPONSE = {
  message:
    "If an account exists for this email, a password reset link has been sent.",
};

export async function registerHandler(
  req: Request<unknown, unknown, RegisterInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = req.body;
    const result = await registerUser(email, password);
    res.status(201).json({
      user: result.user,
      message:
        "Account created. Please check your email to verify your address.",
    });
  } catch (err) {
    next(err);
  }
}

export async function loginHandler(
  req: Request<unknown, unknown, LoginInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = req.body;
    const { user, tokens } = await loginUser(email, password, req.ip);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export function logoutHandler(_req: Request, res: Response): void {
  clearAuthCookies(res);
  res.json({ message: "Logged out" });
}

export async function meHandler(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new HttpError(
        401,
        AUTH_ERROR_CODES.UNAUTHENTICATED,
        "Authentication required"
      );
    }
    const user = await getUserById(req.user.id);
    if (!user) {
      throw new HttpError(
        401,
        AUTH_ERROR_CODES.UNAUTHENTICATED,
        "Authentication required"
      );
    }
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function verifyEmailHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.query.token;
    if (typeof token !== "string" || token.length === 0) {
      throw new HttpError(
        400,
        AUTH_ERROR_CODES.INVALID_TOKEN,
        "Missing verification token"
      );
    }
    await verifyEmail(token);
    res.json({ message: "Email verified. You can now log in." });
  } catch (err) {
    next(err);
  }
}

export async function resendVerificationHandler(
  req: Request<unknown, unknown, ResendVerificationInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await resendVerification(req.body.email);
    res.json({
      message:
        "If an unverified account exists for this email, a new verification link has been sent.",
    });
  } catch (err) {
    next(err);
  }
}

export async function forgotPasswordHandler(
  req: Request<unknown, unknown, ForgotPasswordInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await requestPasswordReset(req.body.email);
    res.json(GENERIC_FORGOT_RESPONSE);
  } catch (err) {
    next(err);
  }
}

export async function resetPasswordHandler(
  req: Request<unknown, unknown, ResetPasswordInput>,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await resetPassword(req.body.token, req.body.password);
    res.json({ message: "Password updated. You can now log in." });
  } catch (err) {
    next(err);
  }
}
