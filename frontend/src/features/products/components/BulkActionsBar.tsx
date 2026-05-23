import { useTranslation } from "react-i18next";
import { Button } from "../../../components/ui/Button";

type BulkActionsBarProps = {
  count: number;
  onChangeStatus: () => void;
  onDelete: () => void;
  onClear: () => void;
  disabled?: boolean;
};

export function BulkActionsBar({
  count,
  onChangeStatus,
  onDelete,
  onClear,
  disabled = false,
}: BulkActionsBarProps) {
  const { t } = useTranslation();

  if (count === 0) return null;

  return (
    <div
      role="region"
      aria-label={t("products.bulkBar.countSelected", { count })}
      className="sticky top-[64px] z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/50"
    >
      <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
        {t("products.bulkBar.countSelected", { count })}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={onChangeStatus}
          disabled={disabled}
        >
          {t("products.bulkBar.changeStatus")}
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={onDelete}
          disabled={disabled}
        >
          {t("products.bulkBar.delete")}
        </Button>
        <Button variant="ghost" size="sm" onClick={onClear} disabled={disabled}>
          {t("products.bulkBar.clearSelection")}
        </Button>
      </div>
    </div>
  );
}
