import {
  Schema,
  model,
  Types,
  type InferSchemaType,
  type HydratedDocument,
} from "mongoose";
import { PRODUCT_STATUS_VALUES } from "../types/product.js";

const auditLogSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    fromStatus: {
      type: Number,
      enum: [...PRODUCT_STATUS_VALUES, null] as unknown as number[],
      default: null,
    },
    toStatus: {
      type: Number,
      required: true,
      enum: PRODUCT_STATUS_VALUES as unknown as number[],
    },
    actor: {
      type: String,
      enum: ["admin", "user"],
      required: true,
    },
    actorUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reason: {
      type: String,
      default: null,
      trim: true,
      maxlength: 500,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ productId: 1, createdAt: -1 });

export type AuditLogDoc = HydratedDocument<
  InferSchemaType<typeof auditLogSchema>
>;

export const AuditLog = model("AuditLog", auditLogSchema);

export type AuditLogObjectId = Types.ObjectId;
