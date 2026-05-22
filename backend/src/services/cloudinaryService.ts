import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { env } from "../config/env.js";
import { HttpError } from "../middleware/error.js";
import { PRODUCT_ERROR_CODES } from "../types/product.js";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

const MAX_BYTES = 5 * 1024 * 1024;

export interface UploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export async function uploadProductImage(
  buffer: Buffer,
  mimetype: string
): Promise<UploadResult> {
  if (!ALLOWED_MIME_TYPES.has(mimetype)) {
    throw new HttpError(
      400,
      PRODUCT_ERROR_CODES.UPLOAD_TYPE_INVALID,
      `Unsupported image type: ${mimetype}`
    );
  }
  if (buffer.byteLength > MAX_BYTES) {
    throw new HttpError(
      400,
      PRODUCT_ERROR_CODES.UPLOAD_FAILED,
      "Image exceeds 5MB limit"
    );
  }

  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "guru-inventory/products",
        resource_type: "image",
        overwrite: false,
      },
      (error, uploaded) => {
        if (error || !uploaded) {
          reject(
            error ??
              new HttpError(
                500,
                PRODUCT_ERROR_CODES.UPLOAD_FAILED,
                "Cloudinary returned no response"
              )
          );
          return;
        }
        resolve(uploaded);
      }
    );
    stream.end(buffer);
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format,
    bytes: result.bytes,
  };
}
