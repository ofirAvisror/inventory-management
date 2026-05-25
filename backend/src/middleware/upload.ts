import type { Request } from "express";
import multer, { MulterError, type FileFilterCallback } from "multer";
import { env } from "../config/env.js";
import { ALLOWED_IMAGE_MIME_TYPES } from "../config/uploadLimits.js";
import { HttpError } from "./error.js";
import { PRODUCT_ERROR_CODES } from "../types/product.js";

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void {
  if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
    cb(
      new HttpError(
        400,
        PRODUCT_ERROR_CODES.UPLOAD_TYPE_INVALID,
        `Unsupported image type: ${file.mimetype}`
      )
    );
    return;
  }
  cb(null, true);
}

const storage = multer.memoryStorage();

export const uploadSingleImage = multer({
  storage,
  limits: { fileSize: env.MAX_UPLOAD_BYTES, files: 1 },
  fileFilter,
}).single("file");

export function isMulterError(err: unknown): err is MulterError {
  return err instanceof MulterError;
}
