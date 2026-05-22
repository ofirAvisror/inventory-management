import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import { Alert } from "../../../components/ui/Alert";
import { Spinner } from "../../../components/ui/FullPageSpinner";
import { useAuditLogQuery } from "../hooks/useAuditLogQuery";
import { ProductStatus, type AuditLogEntry, type ProductStatusValue } from "../types";
import { StatusBadge } from "./StatusBadge";

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
  const { t, i18n } = useTranslation();
  const query = useAuditLogQuery(productId, open);

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

  const lang = i18n.language === "he" ? "he-IL" : "en-US";

  const body = (() => {
    if (query.isLoading) {
      return (
        <div className="flex flex-1 items-center justify-center py-12">
          <Spinner className="h-6 w-6" />
        </div>
      );
    }
    if (query.isError) {
      return <Alert variant="error">{t("products.audit.loadError")}</Alert>;
    }
    const entries = query.data ?? [];
    if (entries.length === 0) {
      return (
        <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {t("products.audit.empty")}
        </p>
      );
    }
    return (
      <ol className="flex flex-col gap-3">
        {entries.map((entry) => (
          <AuditEntryItem key={entry.id} entry={entry} lang={lang} />
        ))}
      </ol>
    );
  })();

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("products.audit.title")}
      className="fixed inset-0 z-40 flex"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex-1 bg-black/40 backdrop-blur-[1px]" aria-hidden="true" />
      <aside className="ms-auto flex h-full w-full max-w-md flex-col border-s border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 sm:max-w-md">
        <header className="flex items-start justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-semibold">
              {t("products.audit.title")}
            </h2>
            {productSku ? (
              <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                {t("products.audit.subtitle", { sku: productSku })}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{body}</div>
      </aside>
    </div>,
    document.body,
  );
}

function AuditEntryItem({
  entry,
  lang,
}: {
  entry: AuditLogEntry;
  lang: string;
}) {
  const { t } = useTranslation();
  const when = new Date(entry.createdAt).toLocaleString(lang);
  const actorLabel = t(`products.audit.actor.${entry.actor}`);
  const fromStatus = entry.fromStatus as ProductStatusValue | null;
  const toStatus = entry.toStatus as ProductStatusValue;

  return (
    <li className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-950/40">
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium text-zinc-900 dark:text-zinc-100">
          {actorLabel}
          {entry.actorUserId ? (
            <span
              className="ms-2 font-mono text-[10px] text-zinc-500"
              title={entry.actorUserId}
            >
              {entry.actorUserId.slice(-6)}
            </span>
          ) : null}
        </span>
        <time className="text-xs text-zinc-500 dark:text-zinc-400">{when}</time>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        {fromStatus ? (
          <>
            <span className="text-zinc-500 dark:text-zinc-400">
              {t("products.audit.from")}
            </span>
            <StatusBadge status={fromStatus} size="sm" />
            <span aria-hidden="true" className="text-zinc-400">
              →
            </span>
          </>
        ) : null}
        <span className="text-zinc-500 dark:text-zinc-400">
          {t("products.audit.to")}
        </span>
        <StatusBadge
          status={(toStatus ?? ProductStatus.StockIn) as ProductStatusValue}
          size="sm"
        />
      </div>
      {entry.reason ? (
        <p className="mt-2 text-xs text-zinc-700 dark:text-zinc-300">
          <span className="font-medium">{t("products.audit.reason")}:</span>{" "}
          {entry.reason}
        </p>
      ) : null}
    </li>
  );
}
