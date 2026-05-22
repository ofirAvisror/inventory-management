import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { translateProductErrorCode } from "../lib/errors";
import type { BulkResult, PublicProduct } from "../types";

export type BulkActionKind = "delete" | "status";

export type BulkResultPayload = {
  result: BulkResult;
  action: BulkActionKind;
  participants: PublicProduct[];
};

type BulkResultModalProps = {
  open: boolean;
  payload: BulkResultPayload | null;
  onClose: () => void;
  onRetry: (failedIds: string[]) => void;
};

export function BulkResultModal({
  open,
  payload,
  onClose,
  onRetry,
}: BulkResultModalProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [showAllSuccess, setShowAllSuccess] = useState(false);

  // Reset transient UI state whenever a new payload (or open state) arrives,
  // so the next bulk result doesn't start with stale "copied" / "show more"
  // values from the previous one.
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCopied(false);
    setShowAllSuccess(false);
  }, [open, payload]);

  const participantsById = useMemo(() => {
    const map = new Map<string, PublicProduct>();
    payload?.participants.forEach((p) => map.set(p.id, p));
    return map;
  }, [payload]);

  if (!payload) {
    return (
      <Modal open={open} onClose={onClose}>
        <p />
      </Modal>
    );
  }

  const { result } = payload;
  const ok = result.success.length;
  const failed = result.failed.length;
  const total = ok + failed;
  const allOk = failed === 0;

  const labelFor = (id: string): string => {
    const product = participantsById.get(id);
    if (!product) return id;
    return t("products.bulkResult.failedLine", {
      sku: product.sku,
      name: product.name,
    });
  };

  const handleCopy = async () => {
    const lines: string[] = [];
    lines.push(t("products.bulkResult.summary", { ok, failed }));
    if (ok > 0) {
      lines.push("");
      lines.push(t("products.bulkResult.successHeader", { count: ok }));
      result.success.forEach((s) => lines.push(`  - ${labelFor(s.id)}`));
    }
    if (failed > 0) {
      lines.push("");
      lines.push(t("products.bulkResult.failureHeader", { count: failed }));
      result.failed.forEach((f) =>
        lines.push(
          `  - ${labelFor(f.id)}: ${translateProductErrorCode(f.code, f.message, t)}`,
        ),
      );
    }
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Best-effort copy; do not surface clipboard errors.
    }
  };

  const visibleSuccesses =
    showAllSuccess || result.success.length <= 10
      ? result.success
      : result.success.slice(0, 10);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={t("products.bulkResult.title")}
      footer={
        <>
          <Button variant="secondary" onClick={handleCopy}>
            {copied ? t("products.bulkResult.copied") : t("products.bulkResult.copy")}
          </Button>
          {failed > 0 ? (
            <Button
              variant="primary"
              onClick={() => onRetry(result.failed.map((f) => f.id))}
            >
              {t("products.bulkResult.retry")}
            </Button>
          ) : null}
          <Button variant="secondary" onClick={onClose}>
            {t("common.close")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p
          className={`rounded-lg border px-3 py-2 text-sm font-medium ${
            allOk
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
              : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
          }`}
        >
          {allOk
            ? t("products.bulkResult.allOk", { ok: total })
            : t("products.bulkResult.summary", { ok, failed })}
        </p>

        {ok > 0 ? (
          <section className="rounded-lg border border-emerald-200 bg-emerald-50/50 px-3 py-3 text-sm dark:border-emerald-900/60 dark:bg-emerald-950/30">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-200">
              {t("products.bulkResult.successHeader", { count: ok })}
            </h3>
            <ul className="mt-2 flex flex-col gap-1 text-zinc-800 dark:text-zinc-200">
              {visibleSuccesses.map((s) => (
                <li key={s.id} className="text-xs">
                  {labelFor(s.id)}
                </li>
              ))}
            </ul>
            {result.success.length > 10 ? (
              <button
                type="button"
                onClick={() => setShowAllSuccess((v) => !v)}
                className="mt-2 text-xs font-medium text-emerald-800 underline-offset-2 hover:underline dark:text-emerald-200"
              >
                {showAllSuccess
                  ? t("common.previous")
                  : `+${result.success.length - 10}`}
              </button>
            ) : null}
          </section>
        ) : null}

        {failed > 0 ? (
          <section className="rounded-lg border border-red-200 bg-red-50/60 px-3 py-3 text-sm dark:border-red-900/60 dark:bg-red-950/30">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-red-800 dark:text-red-200">
              {t("products.bulkResult.failureHeader", { count: failed })}
            </h3>
            <ul className="mt-2 flex flex-col gap-2">
              {result.failed.map((f) => (
                <li
                  key={f.id}
                  className="flex flex-col gap-0.5 text-zinc-900 dark:text-zinc-100"
                >
                  <span className="text-xs font-medium">{labelFor(f.id)}</span>
                  <span
                    className="text-xs text-red-700 dark:text-red-300"
                    title={f.message}
                  >
                    {translateProductErrorCode(f.code, f.message, t)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </Modal>
  );
}
