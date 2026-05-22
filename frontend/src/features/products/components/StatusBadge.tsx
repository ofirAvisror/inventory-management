import { useTranslation } from "react-i18next";
import { ProductStatus, type ProductStatusValue } from "../types";

const statusStyles: Record<ProductStatusValue, string> = {
  [ProductStatus.StockIn]:
    "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100",
  [ProductStatus.AssignedToCustomer]:
    "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200",
  [ProductStatus.ConfigurationIn]:
    "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200",
  [ProductStatus.ReadyForDelivery]:
    "bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-200",
  [ProductStatus.Delivered]:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200",
};

type StatusBadgeProps = {
  status: ProductStatusValue;
  size?: "sm" | "md";
};

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const { t } = useTranslation();
  const label = t(`products.status.${status}`);
  const sizing =
    size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full font-medium ${statusStyles[status]} ${sizing}`}
    >
      {label}
    </span>
  );
}
