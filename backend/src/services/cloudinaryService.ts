import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { env } from "../config/env.js";
import { ALLOWED_IMAGE_MIME_TYPES } from "../config/uploadLimits.js";
import { HttpError } from "../middleware/error.js";
import { PRODUCT_ERROR_CODES } from "../types/product.js";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface UploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

function toHttpError(err: unknown, fallbackMessage: string): HttpError {
  if (err instanceof HttpError) return err;
  const message =
    err instanceof Error && err.message ? err.message : fallbackMessage;
  return new HttpError(500, PRODUCT_ERROR_CODES.UPLOAD_FAILED, message);
}

export async function uploadProductImage(
  buffer: Buffer,
  mimetype: string
): Promise<UploadResult> {
  if (!ALLOWED_IMAGE_MIME_TYPES.has(mimetype)) {
    throw new HttpError(
      400,
      PRODUCT_ERROR_CODES.UPLOAD_TYPE_INVALID,
      `Unsupported image type: ${mimetype}`
    );
  }
  if (buffer.byteLength > env.MAX_UPLOAD_BYTES) {
    throw new HttpError(
      400,
      PRODUCT_ERROR_CODES.UPLOAD_FAILED,
      `Image exceeds ${env.MAX_UPLOAD_BYTES} byte limit`
    );
  }

  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    let settled = false;
    const finish = (err: HttpError | null, value?: UploadApiResponse): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutHandle);
      if (err) reject(err);
      else if (value) resolve(value);
    };

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: env.CLOUDINARY_UPLOAD_FOLDER,
        resource_type: "image",
        overwrite: false,
      },
      (error, uploaded) => {
        if (error) {
          finish(toHttpError(error, "Cloudinary upload failed"));
          return;
        }
        if (!uploaded) {
          finish(
            new HttpError(
              500,
              PRODUCT_ERROR_CODES.UPLOAD_FAILED,
              "Cloudinary returned no response"
            )
          );
          return;
        }
        finish(null, uploaded);
      }
    );

    const timeoutHandle = setTimeout(() => {
      try {
        stream.destroy();
      } catch {
        // ignore — best-effort cleanup
      }
      finish(
        new HttpError(
          504,
          PRODUCT_ERROR_CODES.UPLOAD_FAILED,
          `Cloudinary upload timed out after ${env.CLOUDINARY_UPLOAD_TIMEOUT_MS}ms`
        )
      );
    }, env.CLOUDINARY_UPLOAD_TIMEOUT_MS);

    stream.on("error", (err) => {
      finish(toHttpError(err, "Cloudinary stream error"));
    });

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
