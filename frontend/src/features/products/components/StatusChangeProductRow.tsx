import { useTranslation } from "react-i18next";
import { TextField } from "../../../components/ui/TextField";
import type { ProductSupplement, StatusGaps } from "../lib/statusRequirements";
import type { PublicProduct } from "../types";
import { StatusBadge } from "./StatusBadge";
import { ImageDropzone } from "./ImageDropzone";

type StatusChangeProductRowProps = {
  product: PublicProduct;
  gaps: StatusGaps;
  supplement: ProductSupplement;
  onSupplementChange: (next: ProductSupplement) => void;
  expanded: boolean;
  onToggle: () => void;
  disabled?: boolean;
  uploading?: boolean;
};

export function StatusChangeProductRow({
  product,
  gaps,
  supplement,
  onSupplementChange,
  expanded,
  onToggle,
  disabled = false,
  uploading = false,
}: StatusChangeProductRowProps) {
  const { t } = useTranslation();
  const isMissing = gaps.needsCustomer || gaps.needsImage;
  const displayName = product.name?.trim() || product.id;
  const displaySku = product.sku?.trim() || product.id;

  const rowLabel = isMissing
    ? t("products.statusModal.rowMissing")
    : t("products.statusModal.rowOk");

  const toggleAria = expanded
    ? t("products.statusModal.collapseRow", { name: displayName })
    : t("products.statusModal.expandRow", { name: displayName });

  return (
    <div
      className={`overflow-hidden rounded-lg border transition ${
        isMissing
          ? "border-red-300 bg-red-50/60 dark:border-red-800 dark:bg-red-950/25"
          : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-expanded={expanded}
        aria-label={toggleAria}
        className="flex min-h-11 w-full items-center gap-3 px-3 py-2.5 text-start transition hover:bg-zinc-50/80 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-zinc-900/60"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
          <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {displaySku}
          </span>
          <span className="truncate text-xs text-zinc-600 dark:text-zinc-400">
            {displayName}
          </span>
        </div>
        <StatusBadge status={product.status} />
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
            isMissing
              ? "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-200"
              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
          }`}
        >
          {rowLabel}
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {expanded && isMissing ? (
        <div className="flex flex-col gap-4 border-t border-red-200/80 px-3 py-3 dark:border-red-900/50">
          {gaps.needsCustomer ? (
            <TextField
              name={`status-supplement-customer-${product.id}`}
              label={t("products.create.fields.customerId")}
              required
              requiredTooltip={t("products.create.hints.customerRequired")}
              placeholder={t("products.create.placeholders.customerId")}
              autoComplete="off"
              value={supplement.customerId}
              onChange={(event) =>
                onSupplementChange({
                  ...supplement,
                  customerId: event.target.value,
                })
              }
              disabled={disabled || uploading}
            />
          ) : null}
          {gaps.needsImage ? (
            <ImageDropzone
              value={supplement.image}
              onChange={(image) => onSupplementChange({ ...supplement, image })}
              uploading={uploading}
              disabled={disabled}
              label={t("products.create.fields.image")}
              hint={t("products.create.hints.imageRequired")}
              required
              requiredTooltip={t("products.create.hints.imageRequired")}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
