import type { TFunction } from "i18next";
import { z } from "zod";
import { ProductStatus, type ProductStatusValue } from "../types";

// Regex mirror of the backend validators (see backend/src/validators/product.ts).
// Backend remains the source of truth; this only powers instant client-side
// feedback so users do not have to wait for a round-trip to discover format
// problems.
const MAC_REGEX = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
const IMEI_REGEX = /^\d{14,15}$/;
const HTTP_URL_REGEX = /^https?:\/\/\S+$/i;

const NAME_MAX = 120;
const SKU_MAX = 64;
const CUSTOMER_ID_MAX = 120;

// The form binds all inputs to plain strings to keep `useForm<ProductFormValues>`
// happy (RHF's input type must match the resolver's input type). Optional
// fields use "" as their "empty" sentinel and we treat empty as "not provided"
// in the refinements below. The page maps these values into the API payload.
export type ProductFormValues = {
  name: string;
  sku: string;
  macAddress: string;
  imei: string;
  status: ProductStatusValue;
  customerId: string;
  imageUrl: string;
};

function isEmpty(value: string): boolean {
  return value.trim().length === 0;
}

export function buildProductFormSchema(t: TFunction) {
  return z
    .object({
      name: z
        .string()
        .trim()
        .min(1, t("products.create.errors.nameRequired"))
        .max(NAME_MAX, t("products.create.errors.nameTooLong")),
      sku: z
        .string()
        .trim()
        .min(1, t("products.create.errors.skuRequired"))
        .max(SKU_MAX, t("products.create.errors.skuTooLong")),
      macAddress: z
        .string()
        .trim()
        .min(1, t("products.create.errors.macRequired"))
        .regex(MAC_REGEX, t("products.errors.MAC_INVALID")),
      imei: z
        .string()
        .refine(
          (value) => isEmpty(value) || IMEI_REGEX.test(value.trim()),
          { message: t("products.errors.IMEI_INVALID") },
        ),
      // Use a literal union (not z.number().refine) so the schema's input
      // type is exactly `1 | 2 | 3 | 4 | 5` (= ProductStatusValue), which
      // keeps `useForm<ProductFormValues>` generics happy.
      status: z.union([
        z.literal(ProductStatus.StockIn),
        z.literal(ProductStatus.AssignedToCustomer),
        z.literal(ProductStatus.ConfigurationIn),
        z.literal(ProductStatus.ReadyForDelivery),
        z.literal(ProductStatus.Delivered),
      ], { message: t("products.errors.STATUS_INVALID") }),
      customerId: z
        .string()
        .max(CUSTOMER_ID_MAX, t("products.create.errors.customerIdTooLong")),
      imageUrl: z
        .string()
        .refine(
          (value) => isEmpty(value) || HTTP_URL_REGEX.test(value.trim()),
          { message: t("products.create.errors.imageUrlInvalid") },
        ),
    })
    .superRefine((value, ctx) => {
      // Mirror backend's `assertStatusRequirements`:
      // status >= 2 (Assigned to Customer) requires a customerId.
      if (
        value.status >= ProductStatus.AssignedToCustomer &&
        isEmpty(value.customerId)
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["customerId"],
          message: t("products.errors.CUSTOMER_REQUIRED"),
        });
      }

      // status >= 4 (Ready for Delivery) requires an image. On the client
      // this means an `imageUrl` must already be populated by the upload
      // step before submit.
      if (
        value.status >= ProductStatus.ReadyForDelivery &&
        isEmpty(value.imageUrl)
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["imageUrl"],
          message: t("products.errors.IMAGE_REQUIRED"),
        });
      }
    });
}

// Backend expects MAC uppercased with ":" separators and SKU uppercased. We
// normalize at submit time (instead of via Zod transforms) so the form's
// input and output types stay identical, which keeps RHF + zodResolver
// generics simple. Empty optional strings are dropped so they don't fail the
// backend's "non-empty if present" rules.
export function normalizeProductFormValues(
  values: ProductFormValues,
): {
  name: string;
  sku: string;
  macAddress: string;
  status: ProductStatusValue;
  imei?: string;
  customerId?: string;
  imageUrl?: string;
} {
  const macAddress = values.macAddress.trim().toUpperCase().replace(/-/g, ":");
  const sku = values.sku.trim().toUpperCase();
  const imei = values.imei.trim();
  const customerId = values.customerId.trim();
  const imageUrl = values.imageUrl.trim();

  return {
    name: values.name.trim(),
    sku,
    macAddress,
    status: values.status,
    ...(imei.length > 0 ? { imei } : {}),
    ...(customerId.length > 0 ? { customerId } : {}),
    ...(imageUrl.length > 0 ? { imageUrl } : {}),
  };
}
