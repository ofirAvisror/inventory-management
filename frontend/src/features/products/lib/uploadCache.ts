import { uploadProductImage } from "../api";

// Keyed by `File` reference: when the user picks a new file the dropzone
// produces a fresh `File` instance, so a different cache key. WeakMap entries
// are also cleaned up automatically once the staged file is no longer
// referenced anywhere in the component tree.
export type ImageUploadCache = WeakMap<File, Promise<string>>;

export function createImageUploadCache(): ImageUploadCache {
  return new WeakMap();
}

// Upload a staged image at most once per `File` instance for the lifetime of
// `cache`. Used by status-change flows where a successful upload followed by
// a failed status mutation would otherwise re-upload the exact same bytes on
// every retry, leaving orphan objects in storage.
export async function uploadProductImageOnce(
  cache: ImageUploadCache,
  file: File,
): Promise<string> {
  const cached = cache.get(file);
  if (cached) return cached;

  const pending = uploadProductImage(file)
    .then((uploaded) => uploaded.url)
    .catch((err) => {
      cache.delete(file);
      throw err;
    });
  cache.set(file, pending);
  return pending;
}
