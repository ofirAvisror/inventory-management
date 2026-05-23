import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Alert } from "../../../components/ui/Alert";
import { Spinner } from "../../../components/ui/FullPageSpinner";
import { paths } from "../../../routes/paths";
import type { PublicProduct } from "../types";
import { ProductListCard } from "./ProductListCard";
import { RowActionsMenu } from "./RowActionsMenu";
import { StatusBadge } from "./StatusBadge";

export type ProductsTableProps = {
  items: PublicProduct[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  selectedIds: ReadonlySet<string>;
  onToggleOne: (id: string) => void;
  onToggleAll: (ids: string[], checked: boolean) => void;
  onChangeStatus: (product: PublicProduct) => void;
  onDelete: (product: PublicProduct) => void;
  onViewAudit: (product: PublicProduct) => void;
};

export function ProductsTable({
  items,
  isLoading,
  isError,
  onRetry,
  selectedIds,
  onToggleOne,
  onToggleAll,
  onChangeStatus,
  onDelete,
  onViewAudit,
}: ProductsTableProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = i18n.language === "he" ? "he-IL" : "en-US";

  const allOnPageSelected = useMemo(
    () => items.length > 0 && items.every((p) => selectedIds.has(p.id)),
    [items, selectedIds],
  );
  const someOnPageSelected = useMemo(
    () => items.some((p) => selectedIds.has(p.id)),
    [items, selectedIds],
  );

  if (isError) {
    return (
      <Alert variant="error" title={t("products.table.errorTitle")}>
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 inline-flex h-11 items-center rounded-lg border border-red-300 px-3 text-sm font-medium text-red-800 transition hover:bg-red-100 dark:border-red-700 dark:text-red-200 dark:hover:bg-red-950/60"
        >
          {t("products.table.errorRetry")}
        </button>
      </Alert>
    );
  }

  const mobileSelectAllBar =
    items.length > 0 ? (
      <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950/40 md:hidden">
        <label className="inline-flex h-11 cursor-pointer items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={allOnPageSelected}
            ref={(el) => {
              if (el)
                el.indeterminate = !allOnPageSelected && someOnPageSelected;
            }}
            onChange={(event) =>
              onToggleAll(
                items.map((p) => p.id),
                event.target.checked,
              )
            }
            aria-label={t("products.selection.selectAll")}
            className="h-4 w-4 cursor-pointer accent-zinc-700 dark:accent-zinc-300"
          />
          {t("products.selection.selectAll")}
        </label>
      </div>
    ) : null;

  const mobileList = (
    <div className="flex flex-col gap-3 md:hidden">
      {mobileSelectAllBar}
      {isLoading && items.length === 0 ? (
        <div className="flex justify-center rounded-xl border border-zinc-200 bg-white py-12 dark:border-zinc-800 dark:bg-zinc-900">
          <Spinner className="h-6 w-6" />
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-zinc-200 bg-white px-3 py-12 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          {t("products.table.empty")}
        </p>
      ) : (
        items.map((product) => (
          <ProductListCard
            key={product.id}
            product={product}
            selected={selectedIds.has(product.id)}
            lang={lang}
            onToggle={() => onToggleOne(product.id)}
            onOpen={() => navigate(paths.productDetail(product.id))}
            onChangeStatus={() => onChangeStatus(product)}
            onDelete={() => onDelete(product)}
            onViewAudit={() => onViewAudit(product)}
          />
        ))
      )}
    </div>
  );

  const desktopTable = (
    <div className="hidden overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 md:block">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-600 dark:bg-zinc-950/60 dark:text-zinc-400">
          <tr>
            <th scope="col" className="w-[44px] px-3 py-3 text-center">
              <input
                type="checkbox"
                checked={allOnPageSelected}
                ref={(el) => {
                  if (el)
                    el.indeterminate =
                      !allOnPageSelected && someOnPageSelected;
                }}
                onChange={(event) =>
                  onToggleAll(
                    items.map((p) => p.id),
                    event.target.checked,
                  )
                }
                aria-label={t("products.selection.selectAll")}
                className="h-4 w-4 cursor-pointer accent-zinc-700 dark:accent-zinc-300"
              />
            </th>
            <th scope="col" className="hidden px-3 py-3 text-start md:table-cell">
              {t("products.columns.image")}
            </th>
            <th scope="col" className="px-3 py-3 text-start">
              {t("products.columns.product")}
            </th>
            <th
              scope="col"
              className="hidden px-3 py-3 text-start sm:table-cell"
            >
              {t("products.columns.sku")}
            </th>
            <th
              scope="col"
              className="hidden px-3 py-3 text-start lg:table-cell"
            >
              {t("products.columns.macAddress")}
            </th>
            <th
              scope="col"
              className="hidden px-3 py-3 text-start lg:table-cell"
            >
              {t("products.columns.imei")}
            </th>
            <th
              scope="col"
              className="hidden px-3 py-3 text-start md:table-cell"
            >
              {t("products.columns.customerId")}
            </th>
            <th scope="col" className="px-3 py-3 text-start">
              {t("products.columns.status")}
            </th>
            <th
              scope="col"
              className="hidden px-3 py-3 text-start md:table-cell"
            >
              {t("products.columns.updatedAt")}
            </th>
            <th scope="col" className="w-[56px] px-2 py-3 text-end">
              <span className="sr-only">{t("common.actions")}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {isLoading && items.length === 0 ? (
            <tr>
              <td
                colSpan={10}
                className="px-3 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400"
              >
                <Spinner className="mx-auto h-6 w-6" />
              </td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td
                colSpan={10}
                className="px-3 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400"
              >
                {t("products.table.empty")}
              </td>
            </tr>
          ) : (
            items.map((product) => {
              const selected = selectedIds.has(product.id);
              const updatedAt = new Date(product.updatedAt).toLocaleString(
                lang,
                {
                  dateStyle: "short",
                  timeStyle: "short",
                },
              );
              return (
                <tr
                  key={product.id}
                  data-selected={selected || undefined}
                  className="border-t border-zinc-200 transition hover:bg-zinc-50 data-[selected=true]:bg-amber-50/60 dark:border-zinc-800 dark:hover:bg-zinc-950/40 dark:data-[selected=true]:bg-amber-950/30"
                  onClick={(event) => {
                    if (event.defaultPrevented) return;
                    navigate(paths.productDetail(product.id));
                  }}
                  role="link"
                  tabIndex={-1}
                >
                  <td
                    className="w-[44px] px-3 py-3 text-center align-middle"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => onToggleOne(product.id)}
                      aria-label={t("products.selection.selectRow")}
                      className="h-4 w-4 cursor-pointer accent-zinc-700 dark:accent-zinc-300"
                    />
                  </td>
                  <td className="hidden px-3 py-2 align-middle md:table-cell">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt=""
                        loading="lazy"
                        className="h-10 w-10 rounded-md object-cover ring-1 ring-zinc-200 dark:ring-zinc-800"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-zinc-100 text-[10px] uppercase text-zinc-400 ring-1 ring-zinc-200 dark:bg-zinc-950 dark:text-zinc-600 dark:ring-zinc-800">
                        {t("products.row.noImage")}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                        {product.name}
                      </span>
                      <span className="truncate font-mono text-[11px] text-zinc-500 sm:hidden">
                        {product.sku}
                      </span>
                    </div>
                  </td>
                  <td className="hidden px-3 py-3 align-middle font-mono text-xs text-zinc-700 dark:text-zinc-300 sm:table-cell">
                    {product.sku}
                  </td>
                  <td className="hidden px-3 py-3 align-middle font-mono text-xs text-zinc-700 dark:text-zinc-300 lg:table-cell">
                    {product.macAddress}
                  </td>
                  <td className="hidden px-3 py-3 align-middle font-mono text-xs text-zinc-700 dark:text-zinc-300 lg:table-cell">
                    {product.imei ?? "—"}
                  </td>
                  <td className="hidden px-3 py-3 align-middle text-xs text-zinc-700 dark:text-zinc-300 md:table-cell">
                    {product.customerId ?? "—"}
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <StatusBadge status={product.status} />
                  </td>
                  <td className="hidden px-3 py-3 align-middle text-xs text-zinc-500 dark:text-zinc-400 md:table-cell">
                    {updatedAt}
                  </td>
                  <td
                    className="w-[56px] px-2 py-2 align-middle"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="flex justify-end">
                      <RowActionsMenu
                        onChangeStatus={() => onChangeStatus(product)}
                        onDelete={() => onDelete(product)}
                        onViewAudit={() => onViewAudit(product)}
                      />
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      {mobileList}
      {desktopTable}
    </>
  );
}
