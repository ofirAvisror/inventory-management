import type { TFunction } from "i18next";
import type { UseFormSetError } from "react-hook-form";
import { toApiError } from "../../../lib/api";
import { PRODUCT_ERROR_CODES, type ProductErrorCode } from "../types";
import { translateProductErrorCode } from "./errors";
import type { ProductFormValues } from "./productSchema";

type ProductFieldName = keyof ProductFormValues;

const PRODUCT_FIELD_NAMES: ReadonlySet<string> = new Set<ProductFieldName>([
  "name",
  "sku",
  "macAddress",
  "imei",
  "status",
  "customerId",
  "imageUrl",
]);

// Specific backend error codes that map cleanly to a single field. Anything
// not in this map (e.g. UPLOAD_FAILED, NOT_FOUND, network errors) becomes a
// top-level alert above the form.
const CODE_TO_FIELD: Partial<Record<ProductErrorCode, ProductFieldName>> = {
  [PRODUCT_ERROR_CODES.MAC_INVALID]: "macAddress",
  [PRODUCT_ERROR_CODES.IMEI_INVALID]: "imei",
  [PRODUCT_ERROR_CODES.CUSTOMER_REQUIRED]: "customerId",
  [PRODUCT_ERROR_CODES.IMAGE_REQUIRED]: "imageUrl",
  [PRODUCT_ERROR_CODES.SKU_DUPLICATE]: "sku",
  [PRODUCT_ERROR_CODES.STATUS_INVALID]: "status",
};

interface ValidationDetail {
  path?: unknown;
  message?: unknown;
}

function isValidationDetail(value: unknown): value is ValidationDetail {
  return typeof value === "object" && value !== null;
}

function asProductField(path: unknown): ProductFieldName | null {
  if (typeof path !== "string") return null;
  // Backend error paths are produced by ZodError and arrive as
  // dot-separated strings like "imei" or "status". We only honor paths that
  // correspond to actual form fields to keep the mapping safe.
  const head = path.split(".")[0];
  if (!head) return null;
  return PRODUCT_FIELD_NAMES.has(head) ? (head as ProductFieldName) : null;
}

export interface HandleCreateProductErrorResult {
  topLevelMessage: string | null;
}

/**
 * Map a backend create-product failure to the right surface:
 *  - per-field VALIDATION_ERROR details -> react-hook-form `setError`
 *  - single-code errors with a clear owner field -> `setError` on that field
 *  - everything else -> top-level message returned for an <Alert>
 *
 * All messages are routed through i18n via `translateProductErrorCode` so the
 * user never sees raw English from the backend.
 */
export function handleCreateProductError(
  error: unknown,
  setError: UseFormSetError<ProductFormValues>,
  t: TFunction,
): HandleCreateProductErrorResult {
  const fallback = t("products.create.errors.submitFailed");
  const apiError = toApiError(error, fallback);
  const translated = translateProductErrorCode(
    apiError.code,
    apiError.message,
    t,
  );

  // 1) Per-field zod errors come back as `details: [{ path, message }, ...]`.
  if (
    apiError.code === PRODUCT_ERROR_CODES.VALIDATION_ERROR &&
    Array.isArray(apiError.details)
  ) {
    let attachedAny = false;
    for (const raw of apiError.details) {
      if (!isValidationDetail(raw)) continue;
      const field = asProductField(raw.path);
      if (!field) continue;
      const message =
        typeof raw.message === "string" && raw.message.trim().length > 0
          ? raw.message
          : translated;
      setError(field, { type: "server", message });
      attachedAny = true;
    }
    if (attachedAny) {
      return { topLevelMessage: null };
    }
    // No recognisable field paths -> fall through to top-level message so the
    // user sees *something* meaningful instead of a silent failure.
    return { topLevelMessage: translated };
  }

  // 2) Codes that map to exactly one field.
  if (apiError.code) {
    const target = CODE_TO_FIELD[apiError.code as ProductErrorCode];
    if (target) {
      setError(target, { type: "server", message: translated });
      return { topLevelMessage: null };
    }
  }

  // 3) Everything else (UPLOAD_FAILED, UPLOAD_TYPE_INVALID, UPLOAD_REQUIRED,
  // NOT_FOUND, 401/403, network) -> banner.
  return { topLevelMessage: translated };
}
