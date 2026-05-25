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

export const PRODUCT_STATUS_LABELS: Record<ProductStatusValue, string> = {
  [ProductStatus.StockIn]: "Stock In",
  [ProductStatus.AssignedToCustomer]: "Assigned to Customer",
  [ProductStatus.ConfigurationIn]: "Configuration In",
  [ProductStatus.ReadyForDelivery]: "Ready for Delivery",
  [ProductStatus.Delivered]: "Delivered",
};

export const PRODUCT_ERROR_CODES = {
  MAC_INVALID: "MAC_INVALID",
  IMEI_INVALID: "IMEI_INVALID",
  CUSTOMER_REQUIRED: "CUSTOMER_REQUIRED",
  IMAGE_REQUIRED: "IMAGE_REQUIRED",
  STATUS_INVALID: "STATUS_INVALID",
  STATUS_CONFLICT: "STATUS_CONFLICT",
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
  createdAt: Date;
  updatedAt: Date;
}
