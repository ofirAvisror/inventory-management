import { useTranslation } from "react-i18next";
import { Alert } from "../../../components/ui/Alert";
import { Spinner } from "../../../components/ui/FullPageSpinner";
import { useAuditLogQuery } from "../hooks/useAuditLogQuery";
import {
  ProductStatus,
  type AuditLogEntry,
  type ProductStatusValue,
} from "../types";
import { StatusBadge } from "./StatusBadge";

type AuditLogListProps = {
  productId: string | null;
  // Drawers fetch lazily via their open state; the inline detail-page view
  // always wants the data, so callers control `enabled` directly.
  enabled?: boolean;
};

export function AuditLogList({ productId, enabled = true }: AuditLogListProps) {
  const { t, i18n } = useTranslation();
  const query = useAuditLogQuery(productId, enabled);

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

  const lang = i18n.language.startsWith("he") ? "he-IL" : "en-US";

  return (
    <ol className="flex flex-col gap-3">
      {entries.map((entry) => (
        <AuditEntryItem key={entry.id} entry={entry} lang={lang} />
      ))}
    </ol>
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
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <span className="font-medium text-zinc-900 dark:text-zinc-100">
          {actorLabel}
          {entry.actorUserId ? (
            <span
              className="ms-2 break-all font-mono text-[10px] text-zinc-500 sm:break-normal"
              title={entry.actorUserId}
            >
              {entry.actorUserId.slice(-6)}
            </span>
          ) : null}
        </span>
        <time className="text-xs text-zinc-500 dark:text-zinc-400">{when}</time>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-2 text-xs">
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
