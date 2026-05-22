import bcrypt from "bcrypt";
import { env } from "../config/env.js";
import { User, type UserDoc } from "../models/User.js";
import { AUTH_ERROR_CODES } from "../types/auth.js";
import { HttpError } from "../middleware/error.js";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "./mailer.js";
import {
  generateOpaqueToken,
  hashToken,
  signAccessToken,
  signRefreshToken,
} from "./tokens.js";

const BCRYPT_ROUNDS = 12;

interface PublicUser {
  id: string;
  email: string;
  role: "admin" | "user";
  isEmailVerified: boolean;
}

function toPublic(user: UserDoc): PublicUser {
  return {
    id: user.id as string,
    email: user.email,
    role: user.role as "admin" | "user",
    isEmailVerified: user.isEmailVerified,
  };
}

export interface RegisterResult {
  user: PublicUser;
}

export async function registerUser(
  email: string,
  password: string
): Promise<RegisterResult> {
  const existing = await User.findOne({ email }).lean();
  if (existing) {
    throw new HttpError(
      409,
      AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS,
      "An account with this email already exists"
    );
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const verificationToken = generateOpaqueToken();
  const verificationTokenHash = hashToken(verificationToken);
  const verificationExpiresAt = new Date(
    Date.now() + env.EMAIL_VERIFICATION_EXPIRE_MINUTES * 60_000
  );

  const user = await User.create({
    email,
    passwordHash,
    role: "user",
    isEmailVerified: false,
    emailVerificationTokenHash: verificationTokenHash,
    emailVerificationExpiresAt: verificationExpiresAt,
  });

  await sendVerificationEmail(email, verificationToken);

  return { user: toPublic(user) };
}

export async function resendVerification(email: string): Promise<void> {
  const user = await User.findOne({ email });
  if (!user || user.isEmailVerified) return;

  const verificationToken = generateOpaqueToken();
  user.emailVerificationTokenHash = hashToken(verificationToken);
  user.emailVerificationExpiresAt = new Date(
    Date.now() + env.EMAIL_VERIFICATION_EXPIRE_MINUTES * 60_000
  );
  await user.save();

  await sendVerificationEmail(email, verificationToken);
}

export async function verifyEmail(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  const user = await User.findOne({ emailVerificationTokenHash: tokenHash });

  if (
    !user ||
    !user.emailVerificationExpiresAt ||
    user.emailVerificationExpiresAt.getTime() < Date.now()
  ) {
    throw new HttpError(
      400,
      AUTH_ERROR_CODES.INVALID_TOKEN,
      "Verification link is invalid or has expired"
    );
  }

  user.isEmailVerified = true;
  user.emailVerificationTokenHash = null;
  user.emailVerificationExpiresAt = null;
  await user.save();
}

export interface LoginTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResult {
  user: PublicUser;
  tokens: LoginTokens;
}

export async function loginUser(
  email: string,
  password: string
): Promise<LoginResult> {
  const user = await User.findOne({ email });
  if (!user) {
    throw new HttpError(
      401,
      AUTH_ERROR_CODES.INVALID_CREDENTIALS,
      "Invalid email or password"
    );
  }

  const passwordOk = await bcrypt.compare(password, user.passwordHash);
  if (!passwordOk) {
    throw new HttpError(
      401,
      AUTH_ERROR_CODES.INVALID_CREDENTIALS,
      "Invalid email or password"
    );
  }

  if (!user.isEmailVerified) {
    throw new HttpError(
      403,
      AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED,
      "Please verify your email before logging in"
    );
  }

  const role = user.role as "admin" | "user";
  const tokens: LoginTokens = {
    accessToken: signAccessToken({ sub: user.id as string, role }),
    refreshToken: signRefreshToken({ sub: user.id as string, role }),
  };

  return { user: toPublic(user), tokens };
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await User.findOne({ email });
  if (!user) return;

  const resetToken = generateOpaqueToken();
  user.passwordResetTokenHash = hashToken(resetToken);
  user.passwordResetExpiresAt = new Date(
    Date.now() + env.PASSWORD_RESET_EXPIRE_MINUTES * 60_000
  );
  await user.save();

  await sendPasswordResetEmail(email, resetToken);
}

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<void> {
  const tokenHash = hashToken(token);
  const user = await User.findOne({ passwordResetTokenHash: tokenHash });

  if (
    !user ||
    !user.passwordResetExpiresAt ||
    user.passwordResetExpiresAt.getTime() < Date.now()
  ) {
    throw new HttpError(
      400,
      AUTH_ERROR_CODES.INVALID_TOKEN,
      "Reset link is invalid or has expired"
    );
  }

  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  user.passwordResetTokenHash = null;
  user.passwordResetExpiresAt = null;
  await user.save();
}

export async function getUserById(userId: string): Promise<PublicUser | null> {
  const user = await User.findById(userId);
  return user ? toPublic(user) : null;
}
