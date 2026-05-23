export const ProductStatus = {
  StockIn: 1,
  AssignedToCustomer: 2,
  ConfigurationIn: 3,
  ReadyForDelivery: 4,
  Delivered: 5,
} as const;

export type ProductStatusValue =
  (typeof ProductStatus)[keyof typeof ProductStatus];

export const PRODUCT_STATUS_VALUES: readonly ProductStatusValue[] = [
  ProductStatus.StockIn,
  ProductStatus.AssignedToCustomer,
  ProductStatus.ConfigurationIn,
  ProductStatus.ReadyForDelivery,
  ProductStatus.Delivered,
];

export const PRODUCT_ERROR_CODES = {
  MAC_INVALID: "MAC_INVALID",
  IMEI_INVALID: "IMEI_INVALID",
  CUSTOMER_REQUIRED: "CUSTOMER_REQUIRED",
  IMAGE_REQUIRED: "IMAGE_REQUIRED",
  STATUS_INVALID: "STATUS_INVALID",
  DEMOTION_FORBIDDEN: "DEMOTION_FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  SKU_DUPLICATE: "SKU_DUPLICATE",
  INVALID_ID: "INVALID_ID",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UPLOAD_FAILED: "UPLOAD_FAILED",
  UPLOAD_REQUIRED: "UPLOAD_REQUIRED",
  UPLOAD_TYPE_INVALID: "UPLOAD_TYPE_INVALID",
} as const;

export type ProductErrorCode =
  (typeof PRODUCT_ERROR_CODES)[keyof typeof PRODUCT_ERROR_CODES];

export interface PublicProduct {
  id: string;
  name: string;
  sku: string;
  macAddress: string;
  imei: string | null;
  customerId: string | null;
  status: ProductStatusValue;
  statusLabel: string;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BulkSuccessItem {
  id: string;
}

export interface BulkFailureItem {
  id: string;
  code: string;
  message: string;
}

export interface BulkResult {
  success: BulkSuccessItem[];
  failed: BulkFailureItem[];
}

export interface ListProductsQuery {
  search?: string;
  status?: ProductStatusValue;
  customerId?: string;
  page?: number;
  limit?: number;
}

export interface ListProductsResult {
  items: PublicProduct[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AuditLogEntry {
  id: string;
  productId: string;
  fromStatus: number | null;
  toStatus: number;
  actor: "admin" | "user";
  actorUserId: string | null;
  reason: string | null;
  createdAt: string;
}

export function isProductErrorCode(value: unknown): value is ProductErrorCode {
  return (
    typeof value === "string" &&
    Object.values(PRODUCT_ERROR_CODES).includes(value as ProductErrorCode)
  );
}

export function isProductStatusValue(
  value: unknown,
): value is ProductStatusValue {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    (PRODUCT_STATUS_VALUES as readonly number[]).includes(value)
  );
}
