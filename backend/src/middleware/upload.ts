import type { Request } from "express";
import multer, { MulterError, type FileFilterCallback } from "multer";
import { HttpError } from "./error.js";
import { PRODUCT_ERROR_CODES } from "../types/product.js";

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

const MAX_BYTES = 5 * 1024 * 1024;

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
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
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter,
}).single("file");

export function isMulterError(err: unknown): err is MulterError {
  return err instanceof MulterError;
}
