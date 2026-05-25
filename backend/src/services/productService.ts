import mongoose, { Types } from "mongoose";
import { HttpError } from "../middleware/error.js";
import { Product, type ProductDoc } from "../models/Product.js";
import {
  PRODUCT_ERROR_CODES,
  ProductStatus,
  type ProductStatusValue,
  type PublicProduct,
  PRODUCT_STATUS_LABELS,
  type BulkResult,
} from "../types/product.js";
import type {
  CreateProductInput,
  ListQueryInput,
  UpdateProductInput,
} from "../validators/product.js";
import { writeAuditEntry } from "./auditService.js";
import { notifyInventoryEvent } from "./slackNotifier.js";

export interface ActorContext {
  userId: string | null;
  isAdmin: boolean;
  reason?: string;
}

function toPublic(product: ProductDoc): PublicProduct {
  const status = product.status as ProductStatusValue;
  return {
    id: product.id as string,
    name: product.name,
    sku: product.sku,
    macAddress: product.macAddress,
    imei: product.imei ?? null,
    customerId: product.customerId ?? null,
    status,
    statusLabel: PRODUCT_STATUS_LABELS[status],
    imageUrl: product.imageUrl ?? null,
    createdAt: (product as unknown as { createdAt: Date }).createdAt,
    updatedAt: (product as unknown as { updatedAt: Date }).updatedAt,
  };
}

interface FieldSnapshot {
  customerId: string | null;
  imageUrl: string | null;
}

function assertStatusRequirements(
  nextStatus: ProductStatusValue,
  fields: FieldSnapshot
): void {
  if (
    nextStatus >= ProductStatus.AssignedToCustomer &&
    (!fields.customerId || fields.customerId.length === 0)
  ) {
    throw new HttpError(
      400,
      PRODUCT_ERROR_CODES.CUSTOMER_REQUIRED,
      "customerId is required for status 2 (Assigned to Customer) and above"
    );
  }

  if (
    nextStatus >= ProductStatus.ReadyForDelivery &&
    (!fields.imageUrl || fields.imageUrl.length === 0)
  ) {
    throw new HttpError(
      400,
      PRODUCT_ERROR_CODES.IMAGE_REQUIRED,
      "imageUrl is required for status 4 (Ready for Delivery) and above"
    );
  }
}

function assertDemotionAllowed(
  currentStatus: ProductStatusValue,
  nextStatus: ProductStatusValue,
  isAdmin: boolean
): void {
  if (
    currentStatus === ProductStatus.Delivered &&
    nextStatus < ProductStatus.Delivered &&
    !isAdmin
  ) {
    throw new HttpError(
      403,
      PRODUCT_ERROR_CODES.DEMOTION_FORBIDDEN,
      "Only an Admin can move a product out of Delivered"
    );
  }
}

function actorLabel(ctx: ActorContext): "admin" | "user" {
  return ctx.isAdmin ? "admin" : "user";
}

function mapDuplicateKeyError(err: unknown): HttpError | null {
  if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: number }).code === 11000
  ) {
    return new HttpError(
      409,
      PRODUCT_ERROR_CODES.SKU_DUPLICATE,
      "A product with this SKU already exists"
    );
  }
  return null;
}

export async function createProduct(
  input: CreateProductInput,
  ctx: ActorContext
): Promise<PublicProduct> {
  const targetStatus = (input.status ?? ProductStatus.StockIn) as ProductStatusValue;

  assertStatusRequirements(targetStatus, {
    customerId: input.customerId ?? null,
    imageUrl: input.imageUrl ?? null,
  });

  const session = await mongoose.startSession();
  try {
    let createdProduct: ProductDoc | null = null;
    await session.withTransaction(async () => {
      const docs = await Product.create(
        [
          {
            name: input.name,
            sku: input.sku,
            macAddress: input.macAddress,
            imei: input.imei ?? null,
            customerId: input.customerId ?? null,
            status: targetStatus,
            imageUrl: input.imageUrl ?? null,
          },
        ],
        { session }
      );
      createdProduct = docs[0];

      await writeAuditEntry(
        {
          productId: createdProduct._id,
          fromStatus: null,
          toStatus: targetStatus,
          actor: actorLabel(ctx),
          actorUserId: ctx.userId,
          reason: ctx.reason ?? null,
        },
        session
      );
    });

    if (!createdProduct) {
      throw new HttpError(
        500,
        PRODUCT_ERROR_CODES.VALIDATION_ERROR,
        "Failed to create product"
      );
    }

    const created: ProductDoc = createdProduct;

    void notifyInventoryEvent({
      kind: "status_op",
      productId: created.id as string,
      sku: created.sku,
      fromStatus: null,
      toStatus: targetStatus,
      actor: actorLabel(ctx),
      actorUserId: ctx.userId ?? undefined,
    });

    return toPublic(created);
  } catch (err) {
    const duplicate = mapDuplicateKeyError(err);
    if (duplicate) throw duplicate;
    throw err;
  } finally {
    await session.endSession();
  }
}

export async function getProduct(id: string): Promise<PublicProduct> {
  if (!Types.ObjectId.isValid(id)) {
    throw new HttpError(
      400,
      PRODUCT_ERROR_CODES.INVALID_ID,
      "Invalid product id"
    );
  }
  const product = await Product.findById(id);
  if (!product) {
    throw new HttpError(
      404,
      PRODUCT_ERROR_CODES.NOT_FOUND,
      "Product not found"
    );
  }
  return toPublic(product);
}

export interface ListProductsResult {
  items: PublicProduct[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export async function listProducts(
  query: ListQueryInput
): Promise<ListProductsResult> {
  const filter: Record<string, unknown> = {};

  if (query.status !== undefined) {
    filter.status = query.status;
  }
  if (query.customerId) {
    filter.customerId = query.customerId;
  }
  if (query.search) {
    const safe = query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(safe, "i");
    filter.$or = [
      { name: regex },
      { sku: regex },
      { macAddress: regex },
      { imei: regex },
      { customerId: regex },
    ];
  }

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    Product.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit),
    Product.countDocuments(filter),
  ]);

  return {
    items: items.map(toPublic),
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
  };
}

export async function updateProduct(
  id: string,
  input: UpdateProductInput,
  ctx: ActorContext
): Promise<PublicProduct> {
  if (!Types.ObjectId.isValid(id)) {
    throw new HttpError(
      400,
      PRODUCT_ERROR_CODES.INVALID_ID,
      "Invalid product id"
    );
  }

  const product = await Product.findById(id);
  if (!product) {
    throw new HttpError(
      404,
      PRODUCT_ERROR_CODES.NOT_FOUND,
      "Product not found"
    );
  }

  const currentStatus = product.status as ProductStatusValue;
  const nextStatus = (input.status ?? currentStatus) as ProductStatusValue;
  const nextCustomerId =
    input.customerId === undefined
      ? (product.customerId ?? null)
      : input.customerId;
  const nextImageUrl =
    input.imageUrl === undefined
      ? (product.imageUrl ?? null)
      : input.imageUrl;

  if (nextStatus !== currentStatus) {
    assertDemotionAllowed(currentStatus, nextStatus, ctx.isAdmin);
  }
  assertStatusRequirements(nextStatus, {
    customerId: nextCustomerId,
    imageUrl: nextImageUrl,
  });

  const session = await mongoose.startSession();
  try {
    let saved: ProductDoc | null = null;
    await session.withTransaction(async () => {
      if (input.name !== undefined) product.name = input.name;
      if (input.sku !== undefined) product.sku = input.sku;
      if (input.macAddress !== undefined) product.macAddress = input.macAddress;
      if (input.imei !== undefined) product.imei = input.imei;
      if (input.customerId !== undefined) product.customerId = input.customerId;
      if (input.imageUrl !== undefined) product.imageUrl = input.imageUrl;
      if (input.status !== undefined) product.status = nextStatus;

      saved = await product.save({ session });

      if (nextStatus !== currentStatus) {
        await writeAuditEntry(
          {
            productId: saved._id,
            fromStatus: currentStatus,
            toStatus: nextStatus,
            actor: actorLabel(ctx),
            actorUserId: ctx.userId,
            reason: ctx.reason ?? null,
          },
          session
        );
      }
    });

    if (!saved) {
      throw new HttpError(
        500,
        PRODUCT_ERROR_CODES.VALIDATION_ERROR,
        "Failed to update product"
      );
    }

    const updated: ProductDoc = saved;

    if (nextStatus !== currentStatus) {
      void notifyInventoryEvent({
        kind: "status_op",
        productId: updated.id as string,
        sku: updated.sku,
        fromStatus: currentStatus,
        toStatus: nextStatus,
        actor: actorLabel(ctx),
        actorUserId: ctx.userId ?? undefined,
      });

      if (
        currentStatus === ProductStatus.Delivered &&
        nextStatus < ProductStatus.Delivered
      ) {
        void notifyInventoryEvent({
          kind: "audit_override",
          productId: updated.id as string,
          sku: updated.sku,
          fromStatus: currentStatus,
          toStatus: nextStatus,
          actor: actorLabel(ctx),
          actorUserId: ctx.userId ?? undefined,
          reason: ctx.reason,
        });
      }
    }

    return toPublic(updated);
  } catch (err) {
    const duplicate = mapDuplicateKeyError(err);
    if (duplicate) throw duplicate;
    throw err;
  } finally {
    await session.endSession();
  }
}

export interface DeleteOptions {
  // When true, the per-item Slack notification is suppressed. Callers
  // performing batch operations (bulkDelete) set this so we don't spam Slack
  // with N notifications in addition to the aggregate bulk_action one.
  silent?: boolean;
}

export async function deleteProduct(
  id: string,
  ctx: ActorContext,
  options: DeleteOptions = {}
): Promise<void> {
  if (!Types.ObjectId.isValid(id)) {
    throw new HttpError(
      400,
      PRODUCT_ERROR_CODES.INVALID_ID,
      "Invalid product id"
    );
  }
  const result = await Product.findByIdAndDelete(id);
  if (!result) {
    throw new HttpError(
      404,
      PRODUCT_ERROR_CODES.NOT_FOUND,
      "Product not found"
    );
  }

  if (!options.silent) {
    void notifyInventoryEvent({
      kind: "bulk_action",
      action: "delete",
      total: 1,
      successCount: 1,
      failureCount: 0,
      actor: actorLabel(ctx),
      actorUserId: ctx.userId ?? undefined,
    });
  }
}

export interface ChangeStatusInputCtx {
  status: ProductStatusValue;
  expectedStatus: ProductStatusValue;
  reason?: string;
  // Optional supplements applied inside the same transaction as the status
  // change. Used by the UI to fill `customerId` / `imageUrl` gaps when moving
  // to a status that requires them, so callers no longer need a separate PUT
  // before the PATCH (which would leave a non-atomic mid-state on failure).
  customerId?: string;
  imageUrl?: string;
}

export async function changeStatus(
  id: string,
  input: ChangeStatusInputCtx,
  ctx: ActorContext
): Promise<PublicProduct> {
  if (!Types.ObjectId.isValid(id)) {
    throw new HttpError(
      400,
      PRODUCT_ERROR_CODES.INVALID_ID,
      "Invalid product id"
    );
  }

  const expectedStatus = input.expectedStatus;
  const nextStatus = input.status;

  if (expectedStatus === nextStatus) {
    const unchanged = await Product.findOne({ _id: id, status: expectedStatus });
    if (!unchanged) {
      throw new HttpError(
        409,
        PRODUCT_ERROR_CODES.STATUS_CONFLICT,
        "Product status was changed by another user. Refresh and try again."
      );
    }
    return toPublic(unchanged);
  }

  const session = await mongoose.startSession();
  try {
    let saved: ProductDoc | null = null;
    let auditFromStatus: ProductStatusValue = expectedStatus;

    await session.withTransaction(async () => {
      const product = await Product.findOne({
        _id: id,
        status: expectedStatus,
      }).session(session);

      if (!product) {
        throw new HttpError(
          409,
          PRODUCT_ERROR_CODES.STATUS_CONFLICT,
          "Product status was changed by another user. Refresh and try again."
        );
      }

      const nextCustomerId =
        input.customerId !== undefined
          ? input.customerId
          : (product.customerId ?? null);
      const nextImageUrl =
        input.imageUrl !== undefined
          ? input.imageUrl
          : (product.imageUrl ?? null);

      assertDemotionAllowed(expectedStatus, nextStatus, ctx.isAdmin);
      assertStatusRequirements(nextStatus, {
        customerId: nextCustomerId,
        imageUrl: nextImageUrl,
      });

      if (input.customerId !== undefined) {
        product.customerId = input.customerId;
      }
      if (input.imageUrl !== undefined) product.imageUrl = input.imageUrl;
      product.status = nextStatus;
      saved = await product.save({ session });

      await writeAuditEntry(
        {
          productId: saved._id,
          fromStatus: expectedStatus,
          toStatus: nextStatus,
          actor: actorLabel(ctx),
          actorUserId: ctx.userId,
          reason: input.reason ?? ctx.reason ?? null,
        },
        session
      );
    });

    if (!saved) {
      throw new HttpError(
        500,
        PRODUCT_ERROR_CODES.VALIDATION_ERROR,
        "Failed to change status"
      );
    }

    const updated: ProductDoc = saved;

    void notifyInventoryEvent({
      kind: "status_op",
      productId: updated.id as string,
      sku: updated.sku,
      fromStatus: auditFromStatus,
      toStatus: nextStatus,
      actor: actorLabel(ctx),
      actorUserId: ctx.userId ?? undefined,
    });

    if (
      expectedStatus === ProductStatus.Delivered &&
      nextStatus < ProductStatus.Delivered
    ) {
      void notifyInventoryEvent({
        kind: "audit_override",
        productId: updated.id as string,
        sku: updated.sku,
        fromStatus: expectedStatus,
        toStatus: nextStatus,
        actor: actorLabel(ctx),
        actorUserId: ctx.userId ?? undefined,
        reason: input.reason ?? ctx.reason,
      });
    }

    return toPublic(updated);
  } finally {
    await session.endSession();
  }
}

function describeError(err: unknown): { code: string; message: string } {
  if (err instanceof HttpError) {
    return {
      code: typeof err.code === "string" ? err.code : "ERROR",
      message: err.message,
    };
  }
  if (err instanceof Error) {
    return { code: PRODUCT_ERROR_CODES.VALIDATION_ERROR, message: err.message };
  }
  return {
    code: PRODUCT_ERROR_CODES.VALIDATION_ERROR,
    message: "Unknown error",
  };
}

export async function bulkDelete(
  ids: string[],
  ctx: ActorContext
): Promise<BulkResult> {
  const result: BulkResult = { success: [], failed: [] };

  for (const id of ids) {
    try {
      await deleteProduct(id, ctx, { silent: true });
      result.success.push({ id });
    } catch (err) {
      const { code, message } = describeError(err);
      result.failed.push({ id, code, message });
    }
  }

  void notifyInventoryEvent({
    kind: "bulk_action",
    action: "delete",
    total: ids.length,
    successCount: result.success.length,
    failureCount: result.failed.length,
    actor: actorLabel(ctx),
    actorUserId: ctx.userId ?? undefined,
  });

  return result;
}

export interface BulkStatusSupplement {
  customerId?: string;
  imageUrl?: string;
}

export async function bulkChangeStatus(
  ids: string[],
  status: ProductStatusValue,
  ctx: ActorContext,
  reason?: string,
  supplementsById?: Record<string, BulkStatusSupplement>,
  expectedStatuses?: Record<string, ProductStatusValue>
): Promise<BulkResult> {
  const result: BulkResult = { success: [], failed: [] };

  for (const id of ids) {
    try {
      const supplement = supplementsById?.[id];
      const expectedStatus = expectedStatuses?.[id];
      if (expectedStatus === undefined) {
        throw new HttpError(
          400,
          PRODUCT_ERROR_CODES.VALIDATION_ERROR,
          "expectedStatuses must include an entry for every id"
        );
      }
      await changeStatus(
        id,
        {
          status,
          expectedStatus,
          reason,
          customerId: supplement?.customerId,
          imageUrl: supplement?.imageUrl,
        },
        ctx
      );
      result.success.push({ id });
    } catch (err) {
      const { code, message } = describeError(err);
      result.failed.push({ id, code, message });
    }
  }

  void notifyInventoryEvent({
    kind: "bulk_action",
    action: "status_change",
    total: ids.length,
    successCount: result.success.length,
    failureCount: result.failed.length,
    toStatus: status,
    actor: actorLabel(ctx),
    actorUserId: ctx.userId ?? undefined,
  });

  return result;
}
