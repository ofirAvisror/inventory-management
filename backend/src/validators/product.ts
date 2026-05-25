import { z } from "zod";
import { PRODUCT_STATUS_VALUES } from "../types/product.js";

const MAC_REGEX = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
const IMEI_REGEX = /^\d{14,15}$/;
const OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/;
const HTTP_URL_REGEX = /^https?:\/\//i;

// Strict 24-char hex match. `mongoose.Types.ObjectId.isValid` is permissive
// (it accepts any 12-char string, numbers, Buffers, etc.) which lets invalid
// ids reach the service layer and surface as NOT_FOUND instead of INVALID_ID.
export const objectIdSchema = z
  .string()
  .regex(OBJECT_ID_REGEX, "Invalid id");

const statusSchema = z
  .union([z.number(), z.string()])
  .transform((value) => (typeof value === "number" ? value : Number(value)))
  .refine(
    (value) =>
      Number.isInteger(value) &&
      (PRODUCT_STATUS_VALUES as readonly number[]).includes(value),
    { message: "status must be one of 1, 2, 3, 4, 5" }
  );

const macSchema = z
  .string()
  .trim()
  .regex(MAC_REGEX, "Invalid MAC address format")
  .transform((value) => value.toUpperCase().replace(/-/g, ":"));

const imeiSchema = z
  .string()
  .trim()
  .regex(IMEI_REGEX, "IMEI must be 14 or 15 digits");

const customerIdSchema = z
  .string()
  .trim()
  .min(1, "customerId must not be empty")
  .max(120, "customerId is too long");

// Restrict to http(s) explicitly. Zod's `.url()` accepts `data:`, `file:`,
// `javascript:`, `ftp:` etc., which would pass validation here but then fail
// the model validator in `Product.ts` (and could be an XSS vector if rendered).
const imageUrlSchema = z
  .string()
  .trim()
  .url("imageUrl must be a valid URL")
  .regex(HTTP_URL_REGEX, "imageUrl must use http or https")
  .max(2048, "imageUrl is too long");

const nullableImei = z.union([imeiSchema, z.null()]);
const nullableCustomerId = z.union([customerIdSchema, z.null()]);
const nullableImageUrl = z.union([imageUrlSchema, z.null()]);

export const createProductSchema = z.object({
  name: z.string().trim().min(1, "name is required").max(120),
  sku: z
    .string()
    .trim()
    .min(1, "sku is required")
    .max(64)
    .transform((value) => value.toUpperCase()),
  macAddress: macSchema,
  imei: imeiSchema.optional(),
  customerId: customerIdSchema.optional(),
  status: statusSchema.optional(),
  imageUrl: imageUrlSchema.optional(),
});

export const updateProductSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    sku: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .transform((value) => value.toUpperCase())
      .optional(),
    macAddress: macSchema.optional(),
    imei: nullableImei.optional(),
    customerId: nullableCustomerId.optional(),
    status: statusSchema.optional(),
    imageUrl: nullableImageUrl.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const changeStatusSchema = z.object({
  status: statusSchema,
  reason: z.string().trim().max(500).optional(),
  customerId: customerIdSchema.optional(),
  imageUrl: imageUrlSchema.optional(),
});

export const bulkIdsSchema = z.object({
  ids: z
    .array(objectIdSchema)
    .min(1, "ids must not be empty")
    .max(200, "Too many ids in one request"),
});

const bulkStatusItemSchema = z.object({
  customerId: customerIdSchema.optional(),
  imageUrl: imageUrlSchema.optional(),
});

export const bulkStatusSchema = z.object({
  ids: z
    .array(objectIdSchema)
    .min(1, "ids must not be empty")
    .max(200, "Too many ids in one request"),
  status: statusSchema,
  reason: z.string().trim().max(500).optional(),
  // Optional per-id supplements applied inside the same transaction as the
  // status change. Keys must be valid product ids; entries for ids not in
  // `ids` are ignored by the service.
  supplements: z.record(objectIdSchema, bulkStatusItemSchema).optional(),
});

export const listQuerySchema = z.object({
  search: z.string().trim().min(1).max(120).optional(),
  status: statusSchema.optional(),
  customerId: z.string().trim().min(1).max(120).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const idParamSchema = z.object({
  id: objectIdSchema,
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;
export type BulkIdsInput = z.infer<typeof bulkIdsSchema>;
export type BulkStatusInput = z.infer<typeof bulkStatusSchema>;
export type ListQueryInput = z.infer<typeof listQuerySchema>;
export type IdParamInput = z.infer<typeof idParamSchema>;
