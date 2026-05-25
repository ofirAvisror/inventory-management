import { useTranslation } from "react-i18next";
import { PRODUCT_STATUS_VALUES, type ProductStatusValue } from "../types";

export type ProductFiltersState = {
  search: string;
  status: ProductStatusValue | "";
  customerId: string;
};

type ProductsFiltersProps = {
  value: ProductFiltersState;
  onChange: (next: ProductFiltersState) => void;
  onClear: () => void;
};

export function ProductsFilters({
  value,
  onChange,
  onClear,
}: ProductsFiltersProps) {
  const { t } = useTranslation();

  const hasAnyFilter =
    value.search.length > 0 || value.status !== "" || value.customerId.length > 0;

  return (
    <div className="grid grid-cols-1 items-end gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-[2fr_1fr_1.5fr_auto] sm:p-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          {t("products.filters.searchLabel")}
        </span>
        <input
          type="search"
          value={value.search}
          onChange={(event) =>
            onChange({ ...value, search: event.target.value })
          }
          placeholder={t("products.filters.searchPlaceholder")}
          className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/30 dark:border-zinc-700 dark:bg-zinc-950"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          {t("products.filters.statusLabel")}
        </span>
        <select
          value={value.status === "" ? "" : String(value.status)}
          onChange={(event) =>
            onChange({
              ...value,
              status:
                event.target.value === ""
                  ? ""
                  : (Number(event.target.value) as ProductStatusValue),
            })
          }
          className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/30 dark:border-zinc-700 dark:bg-zinc-950"
        >
          <option value="">{t("products.filters.statusAll")}</option>
          {PRODUCT_STATUS_VALUES.map((status) => (
            <option key={status} value={status}>
              {t(`products.status.${status}`)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          {t("products.filters.customerLabel")}
        </span>
        <input
          type="text"
          value={value.customerId}
          onChange={(event) =>
            onChange({ ...value, customerId: event.target.value })
          }
          placeholder={t("products.filters.customerPlaceholder")}
          className="h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/30 dark:border-zinc-700 dark:bg-zinc-950"
        />
      </label>

      <button
        type="button"
        onClick={onClear}
        disabled={!hasAnyFilter}
        className="inline-flex h-11 items-center justify-center rounded-lg border border-zinc-300 px-3 text-sm font-medium transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        {t("products.filters.clear")}
      </button>
    </div>
  );
}
