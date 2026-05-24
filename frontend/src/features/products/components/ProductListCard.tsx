import { useTranslation } from "react-i18next";
import type { PublicProduct } from "../types";
import { RowActionsMenu } from "./RowActionsMenu";
import { StatusBadge } from "./StatusBadge";

type ProductListCardProps = {
  product: PublicProduct;
  selected: boolean;
  lang: string;
  onToggle: () => void;
  onOpen: () => void;
  onChangeStatus: () => void;
  onDelete: () => void;
  onViewAudit: () => void;
};

export function ProductListCard({
  product,
  selected,
  lang,
  onToggle,
  onOpen,
  onChangeStatus,
  onDelete,
  onViewAudit,
}: ProductListCardProps) {
  const { t } = useTranslation();
  const updatedAt = new Date(product.updatedAt).toLocaleString(lang, {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <article
      data-selected={selected || undefined}
      className="rounded-xl border border-zinc-200 bg-white transition dark:border-zinc-800 dark:bg-zinc-900 data-[selected=true]:border-amber-300 data-[selected=true]:bg-amber-50/60 dark:data-[selected=true]:border-amber-800 dark:data-[selected=true]:bg-amber-950/30"
    >
      <div className="flex items-start gap-2 p-3">
        <label
          className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            aria-label={t("products.selection.selectRow")}
            className="h-4 w-4 cursor-pointer accent-zinc-700 dark:accent-zinc-300"
          />
        </label>

        <button
          type="button"
          onClick={onOpen}
          className="flex min-w-0 flex-1 items-start gap-3 text-start"
        >
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt=""
              loading="lazy"
              className="h-12 w-12 shrink-0 rounded-md object-cover ring-1 ring-zinc-200 dark:ring-zinc-800"
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-[10px] uppercase text-zinc-400 ring-1 ring-zinc-200 dark:bg-zinc-950 dark:text-zinc-600 dark:ring-zinc-800">
              {t("products.row.noImage")}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
              {product.name}
            </p>
            <p className="mt-0.5 truncate font-mono text-xs text-zinc-500 dark:text-zinc-400">
              {product.sku}
            </p>
            <div className="mt-2">
              <StatusBadge status={product.status} />
            </div>
          </div>
        </button>

        <div
          className="shrink-0"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <RowActionsMenu
            onChangeStatus={onChangeStatus}
            onDelete={onDelete}
            onViewAudit={onViewAudit}
          />
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-1.5 border-t border-zinc-100 px-3 py-2.5 text-xs dark:border-zinc-800 sm:grid-cols-2">
        <div className="min-w-0">
          <dt className="text-zinc-500 dark:text-zinc-400">
            {t("products.columns.macAddress")}
          </dt>
          <dd className="break-all font-mono text-zinc-800 dark:text-zinc-200">
            {product.macAddress}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-zinc-500 dark:text-zinc-400">
            {t("products.columns.imei")}
          </dt>
          <dd className="break-all font-mono text-zinc-800 dark:text-zinc-200">
            {product.imei ?? "—"}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-zinc-500 dark:text-zinc-400">
            {t("products.columns.customerId")}
          </dt>
          <dd className="break-all text-zinc-800 dark:text-zinc-200">
            {product.customerId ?? "—"}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-zinc-500 dark:text-zinc-400">
            {t("products.columns.updatedAt")}
          </dt>
          <dd className="text-zinc-800 dark:text-zinc-200">{updatedAt}</dd>
        </div>
      </dl>
    </article>
  );
}
