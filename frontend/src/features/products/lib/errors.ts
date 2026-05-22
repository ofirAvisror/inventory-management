import type { TFunction } from "i18next";
import { isProductErrorCode } from "../types";

/**
 * Translate a backend failure code to a user-facing string.
 * Backend codes live in PRODUCT_ERROR_CODES; we map each to a localized
 * sentence in `products.errors.<CODE>`. Unknown codes fall back to the raw
 * server message (which is finite per the backend definition, but covers
 * forward-compat / unexpected errors).
 */
export function translateProductErrorCode(
  code: string | null | undefined,
  fallbackMessage: string,
  t: TFunction,
): string {
  if (code && isProductErrorCode(code)) {
    return t(`products.errors.${code}`);
  }
  if (fallbackMessage && fallbackMessage.length > 0) {
    return fallbackMessage;
  }
  return t("products.errors.unknown");
}
