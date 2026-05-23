import { useTranslation } from "react-i18next";

type PaginationProps = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  disabled?: boolean;
};

const PAGE_SIZES = [10, 20, 50, 100] as const;

export function Pagination({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
  disabled = false,
}: PaginationProps) {
  const { t } = useTranslation();
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const canPrev = !disabled && page > 1;
  const canNext = !disabled && page < totalPages;

  return (
    <div className="flex flex-col items-stretch gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between sm:px-4">
      <div className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
        <span>{t("products.pagination.rangeSummary", { from, to, total })}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">
            {t("products.pagination.perPage")}
          </span>
          <select
            value={limit}
            onChange={(event) => onLimitChange(Number(event.target.value))}
            disabled={disabled}
            className="h-9 rounded-lg border border-zinc-300 bg-white px-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/30 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <div className="ms-1 inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={!canPrev}
            aria-label={t("products.pagination.previous")}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-300 text-sm transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            <span aria-hidden="true">‹</span>
          </button>
          <span className="px-2 text-sm font-medium tabular-nums">
            {page} / {Math.max(1, totalPages)}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={!canNext}
            aria-label={t("products.pagination.next")}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-300 text-sm transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            <span aria-hidden="true">›</span>
          </button>
        </div>
      </div>
    </div>
  );
}
