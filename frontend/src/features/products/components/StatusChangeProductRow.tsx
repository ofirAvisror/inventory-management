import { useTranslation } from "react-i18next";
import type { ProductSupplement, StatusGaps } from "../lib/statusRequirements";
import type { PublicProduct } from "../types";
import { StatusBadge } from "./StatusBadge";
import { StatusSupplementFields } from "./StatusSupplementFields";

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
      className={`rounded-lg border transition ${
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
        className="flex min-h-11 w-full items-center gap-2 px-3 py-2.5 text-start transition hover:bg-zinc-50/80 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-zinc-900/60"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {displaySku}
          </span>
          <span className="hidden truncate text-xs text-zinc-600 min-[360px]:inline dark:text-zinc-400">
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
          <StatusSupplementFields
            productId={product.id}
            gaps={gaps}
            supplement={supplement}
            onSupplementChange={onSupplementChange}
            disabled={disabled}
            uploading={uploading}
          />
        </div>
      ) : null}
    </div>
  );
}
