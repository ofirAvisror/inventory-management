import {
  Schema,
  model,
  type InferSchemaType,
  type HydratedDocument,
} from "mongoose";
import {
  PRODUCT_STATUS_VALUES,
  ProductStatus,
} from "../types/product.js";

const MAC_REGEX = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
const IMEI_REGEX = /^\d{14,15}$/;
const URL_REGEX = /^https?:\/\/\S+$/i;

const productSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 120,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      minlength: 1,
      maxlength: 64,
      unique: true,
      index: true,
    },
    macAddress: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      validate: {
        validator: (value: string) => MAC_REGEX.test(value),
        message: "Invalid MAC address format",
      },
    },
    imei: {
      type: String,
      default: null,
      trim: true,
      validate: {
        validator: (value: string | null) =>
          value === null || value === undefined || IMEI_REGEX.test(value),
        message: "IMEI must be 14 or 15 digits",
      },
    },
    customerId: {
      type: String,
      default: null,
      trim: true,
      maxlength: 120,
    },
    status: {
      type: Number,
      required: true,
      enum: PRODUCT_STATUS_VALUES as unknown as number[],
      default: ProductStatus.StockIn,
      index: true,
    },
    imageUrl: {
      type: String,
      default: null,
      trim: true,
      validate: {
        validator: (value: string | null) =>
          value === null || value === undefined || URL_REGEX.test(value),
        message: "imageUrl must be a valid http(s) URL",
      },
    },
  },
  { timestamps: true }
);

productSchema.index({ status: 1, customerId: 1 });
productSchema.index({ name: "text", sku: "text" });

export type ProductDoc = HydratedDocument<InferSchemaType<typeof productSchema>>;

export const Product = model("Product", productSchema);

export { MAC_REGEX, IMEI_REGEX, URL_REGEX };
