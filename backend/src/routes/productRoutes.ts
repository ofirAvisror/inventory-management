import { Router } from "express";
import {
  bulkDeleteHandler,
  bulkStatusHandler,
  changeStatusHandler,
  createProductHandler,
  deleteProductHandler,
  getProductHandler,
  listAuditLogHandler,
  listProductsHandler,
  updateProductHandler,
  uploadImageHandler,
} from "../controllers/productController.js";
import { requireAuth } from "../middleware/auth.js";
import { uploadSingleImage } from "../middleware/upload.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middleware/validate.js";
import {
  bulkIdsSchema,
  bulkStatusSchema,
  changeStatusSchema,
  createProductSchema,
  idParamSchema,
  listQuerySchema,
  updateProductSchema,
} from "../validators/product.js";

const router = Router();

router.use(requireAuth);

router.get("/", validateQuery(listQuerySchema), listProductsHandler);

router.post("/", validateBody(createProductSchema), createProductHandler);

router.post(
  "/bulk-delete",
  validateBody(bulkIdsSchema),
  bulkDeleteHandler
);

router.post(
  "/bulk-status",
  validateBody(bulkStatusSchema),
  bulkStatusHandler
);

router.post("/upload", uploadSingleImage, uploadImageHandler);

router.get(
  "/:id",
  validateParams(idParamSchema),
  getProductHandler
);

router.put(
  "/:id",
  validateParams(idParamSchema),
  validateBody(updateProductSchema),
  updateProductHandler
);

router.delete(
  "/:id",
  validateParams(idParamSchema),
  deleteProductHandler
);

router.patch(
  "/:id/status",
  validateParams(idParamSchema),
  validateBody(changeStatusSchema),
  changeStatusHandler
);

router.get(
  "/:id/audit-log",
  validateParams(idParamSchema),
  listAuditLogHandler
);

export default router;
