// Single source of truth for the image-upload whitelist.
// Both the multer middleware and the Cloudinary service import from here.

export const ALLOWED_IMAGE_MIME_TYPES: ReadonlySet<string> = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);
