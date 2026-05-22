import { z } from "zod";
import type { TFunction } from "i18next";

export function buildEmailSchema(t: TFunction) {
  return z
    .string()
    .min(1, t("auth.errors.emailRequired"))
    .email(t("auth.errors.emailInvalid"));
}

export function buildPasswordSchema(t: TFunction) {
  return z
    .string()
    .min(8, t("auth.errors.passwordMin"))
    .regex(/[a-z]/, t("auth.errors.passwordLowercase"))
    .regex(/[A-Z]/, t("auth.errors.passwordUppercase"))
    .regex(/[0-9]/, t("auth.errors.passwordDigit"));
}
