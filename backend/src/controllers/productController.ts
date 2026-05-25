import type { NextFunction, Response } from "express";
import { HttpError } from "../middleware/error.js";
import {
  getValidatedParams,
  getValidatedQuery,
} from "../middleware/validate.js";
import { listAuditForProduct } from "../services/auditService.js";
import { uploadProductImage } from "../services/cloudinaryService.js";
import {
  type ActorContext,
  bulkChangeStatus,
  bulkDelete,
  changeStatus,
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  updateProduct,
} from "../services/productService.js";
import { type AuthedRequest } from "../types/auth.js";
import {
  PRODUCT_ERROR_CODES,
  type ProductStatusValue,
} from "../types/product.js";
import type {
  BulkIdsInput,
  BulkStatusInput,
  ChangeStatusInput,
  CreateProductInput,
  IdParamInput,
  ListQueryInput,
  UpdateProductInput,
} from "../validators/product.js";

function actorContext(req: AuthedRequest, reason?: string): ActorContext {
  const isAdmin =
    req.user?.role === "admin" || req.isAdminByHeader === true;
  return {
    userId: req.user?.id ?? null,
    isAdmin,
    reason,
  };
}

export async function listProductsHandler(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = getValidatedQuery<ListQueryInput>(req);
    const result = await listProducts(query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getProductHandler(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = getValidatedParams<IdParamInput>(req);
    const product = await getProduct(id);
    res.json({ product });
  } catch (err) {
    next(err);
  }
}

export async function createProductHandler(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = req.body as CreateProductInput;
    const product = await createProduct(body, actorContext(req));
    res.status(201).json({ product });
  } catch (err) {
    next(err);
  }
}

export async function updateProductHandler(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = getValidatedParams<IdParamInput>(req);
    const body = req.body as UpdateProductInput;
    const product = await updateProduct(id, body, actorContext(req));
    res.json({ product });
  } catch (err) {
    next(err);
  }
}

export async function deleteProductHandler(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = getValidatedParams<IdParamInput>(req);
    await deleteProduct(id, actorContext(req));
    res.json({ message: "Product deleted" });
  } catch (err) {
    next(err);
  }
}

export async function changeStatusHandler(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = getValidatedParams<IdParamInput>(req);
    const body = req.body as ChangeStatusInput;
    const product = await changeStatus(
      id,
      {
        status: body.status as ProductStatusValue,
        expectedStatus: body.expectedStatus as ProductStatusValue,
        reason: body.reason,
        customerId: body.customerId,
        imageUrl: body.imageUrl,
      },
      actorContext(req, body.reason)
    );
    res.json({ product });
  } catch (err) {
    next(err);
  }
}

export async function bulkDeleteHandler(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = req.body as BulkIdsInput;
    const result = await bulkDelete(body.ids, actorContext(req));
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function bulkStatusHandler(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = req.body as BulkStatusInput;
    const result = await bulkChangeStatus(
      body.ids,
      body.status as ProductStatusValue,
      actorContext(req, body.reason),
      body.reason,
      body.supplements,
      body.expectedStatuses as Record<string, ProductStatusValue>
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function listAuditLogHandler(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = getValidatedParams<IdParamInput>(req);
    await getProduct(id);
    const entries = await listAuditForProduct(id);
    res.json({ entries });
  } catch (err) {
    next(err);
  }
}

export async function uploadImageHandler(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const file = req.file;
    if (!file) {
      throw new HttpError(
        400,
        PRODUCT_ERROR_CODES.UPLOAD_REQUIRED,
        "Missing file field. Send multipart/form-data with field name 'file'."
      );
    }
    const result = await uploadProductImage(file.buffer, file.mimetype);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}
