import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import { AuditLogList } from "./AuditLogList";

type AuditLogDrawerProps = {
  open: boolean;
  productId: string | null;
  productSku: string | null;
  onClose: () => void;
};

export function AuditLogDrawer({
  open,
  productId,
  productSku,
  onClose,
}: AuditLogDrawerProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("products.audit.title")}
      className="fixed inset-0 z-40 flex flex-col justify-end sm:flex-row"
    >
      <button
        type="button"
        onMouseDown={onClose}
        aria-label={t("common.close")}
        tabIndex={-1}
        className="absolute inset-0 cursor-default bg-black/40 backdrop-blur-[1px] sm:relative sm:flex-1"
      />
      <aside className="relative z-10 flex max-h-[min(90vh,100%)] w-full flex-col overflow-hidden rounded-t-2xl border-t border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 sm:ms-auto sm:h-full sm:max-h-none sm:max-w-md sm:rounded-none sm:border-s sm:border-t-0">
        <header className="flex items-start justify-between gap-3 border-b border-zinc-200 px-4 py-4 dark:border-zinc-800 sm:px-5">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">
              {t("products.audit.title")}
            </h2>
            {productSku ? (
              <p className="mt-0.5 truncate text-sm text-zinc-600 dark:text-zinc-400">
                {t("products.audit.subtitle", { sku: productSku })}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          <AuditLogList productId={productId} enabled={open} />
        </div>
      </aside>
    </div>,
    document.body,
  );
}
