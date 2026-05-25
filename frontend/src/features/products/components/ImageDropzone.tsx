import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { useTranslation } from "react-i18next";
import { RequiredMark } from "../../../components/ui/RequiredMark";

// Must stay in sync with backend's ALLOWED_IMAGE_MIME_TYPES
// (backend/src/config/uploadLimits.ts) so the user is rejected here BEFORE
// wasting an upload round-trip on a file the server will refuse anyway.
const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
] as const;

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

function readMaxBytes(): number {
  const raw = import.meta.env.VITE_MAX_UPLOAD_BYTES;
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return DEFAULT_MAX_BYTES;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_MAX_BYTES;
  }
  return parsed;
}

function formatMegabytes(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

export interface ImageDropzoneValue {
  file: File | null;
  url: string | null;
}

interface ImageDropzoneProps {
  value: ImageDropzoneValue;
  onChange: (next: ImageDropzoneValue) => void;
  uploading?: boolean;
  disabled?: boolean;
  error?: string;
  label: string;
  hint?: string;
  required?: boolean;
  requiredTooltip?: string;
}

export function ImageDropzone({
  value,
  onChange,
  uploading = false,
  disabled = false,
  error,
  label,
  hint,
  required = false,
  requiredTooltip,
}: ImageDropzoneProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const maxBytes = useMemo(() => readMaxBytes(), []);

  // Derive the object URL from the staged file with `useMemo` so we never
  // call `setState` from inside an effect (which the project's React
  // Compiler-aware lint disallows). The companion effect only handles
  // cleanup of the URL so we don't leak browser memory.
  const previewUrl = useMemo(
    () => (value.file ? URL.createObjectURL(value.file) : null),
    [value.file],
  );
  useEffect(() => {
    if (!previewUrl) return;
    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const displayUrl = previewUrl ?? value.url;

  const validateAndStage = useCallback(
    (file: File) => {
      if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
        setLocalError(t("products.create.image.badType"));
        return;
      }
      if (file.size > maxBytes) {
        setLocalError(
          t("products.create.image.tooLarge", {
            max: formatMegabytes(maxBytes),
          }),
        );
        return;
      }
      setLocalError(null);
      onChange({ file, url: null });
    },
    [maxBytes, onChange, t],
  );

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) validateAndStage(file);
    // Reset so the same filename can be re-selected after a remove.
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    if (disabled || uploading) return;
    const file = event.dataTransfer.files?.[0];
    if (file) validateAndStage(file);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (disabled || uploading) return;
    setDragActive(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
  };

  const openPicker = () => {
    if (disabled || uploading) return;
    inputRef.current?.click();
  };

  const handleRemove = () => {
    if (disabled || uploading) return;
    setLocalError(null);
    onChange({ file: null, url: null });
  };

  const visibleError = localError ?? error;
  const fieldId = "product-image-input";
  const describedBy = visibleError ? `${fieldId}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="inline-flex items-center text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
        {required && requiredTooltip ? (
          <RequiredMark tooltip={requiredTooltip} />
        ) : required ? (
          <span
            aria-hidden="true"
            className="ms-0.5 text-orange-500 dark:text-orange-400"
          >
            *
          </span>
        ) : null}
      </span>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`flex flex-col items-stretch gap-3 rounded-lg border-2 border-dashed p-4 transition sm:flex-row sm:items-center ${
          dragActive
            ? "border-zinc-500 bg-zinc-50 dark:border-zinc-400 dark:bg-zinc-900"
            : visibleError
              ? "border-red-400 bg-red-50/40 dark:border-red-500 dark:bg-red-950/20"
              : "border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-950"
        } ${disabled || uploading ? "opacity-60" : ""}`}
      >
        {displayUrl ? (
          <img
            src={displayUrl}
            alt=""
            className="h-24 w-24 flex-none rounded-md object-cover ring-1 ring-zinc-200 dark:ring-zinc-800"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-24 w-24 flex-none items-center justify-center rounded-md bg-zinc-100 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-600"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-8 w-8"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-5-5-9 9" />
            </svg>
          </div>
        )}

        <div className="flex flex-1 flex-col gap-2 text-sm">
          {uploading ? (
            <p className="font-medium text-zinc-700 dark:text-zinc-200">
              {t("products.create.image.uploading")}
            </p>
          ) : displayUrl ? (
            <p className="font-medium text-zinc-700 dark:text-zinc-200">
              {value.file?.name ?? t("products.create.image.uploaded")}
            </p>
          ) : (
            <p className="text-zinc-600 dark:text-zinc-400">
              {t("products.create.image.drop")}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openPicker}
              disabled={disabled || uploading}
              aria-describedby={describedBy}
              className="inline-flex h-11 min-h-11 items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              {displayUrl
                ? t("products.create.image.replace")
                : t("products.create.image.browse")}
            </button>
            {displayUrl ? (
              <button
                type="button"
                onClick={handleRemove}
                disabled={disabled || uploading}
                className="inline-flex h-11 min-h-11 items-center justify-center rounded-lg px-3 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                {t("products.create.image.remove")}
              </button>
            ) : null}
          </div>

          {hint ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {hint}
            </p>
          ) : null}
        </div>

        <input
          ref={inputRef}
          id={fieldId}
          type="file"
          accept={ALLOWED_MIME_TYPES.join(",")}
          onChange={handleInputChange}
          disabled={disabled || uploading}
          className="sr-only"
        />
      </div>

      {visibleError ? (
        <p
          id={describedBy}
          className="text-xs text-red-600 dark:text-red-400"
        >
          {visibleError}
        </p>
      ) : null}
    </div>
  );
}
