import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Spinner } from "../../../components/ui/FullPageSpinner";
import type { ListProductsQuery, PublicProduct } from "../types";
import {
  buildCsv,
  buildExportFilename,
  downloadCsv,
  downloadPdf,
  fetchAllForExport,
} from "../lib/export";

type ExportFormat = "csv" | "pdf";
type ExportScope = "selected" | "filtered";

type ExportMenuProps = {
  filterQuery: ListProductsQuery;
  selectedProducts: PublicProduct[];
  disabled?: boolean;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
};

export function ExportMenu({
  filterQuery,
  selectedProducts,
  disabled = false,
  onError,
  onSuccess,
}: ExportMenuProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const hasSelection = selectedProducts.length > 0;

  const runExport = async (format: ExportFormat, scope: ExportScope) => {
    setOpen(false);
    setBusy(true);
    try {
      let rows: PublicProduct[];
      if (scope === "selected") {
        rows = selectedProducts;
      } else {
        rows = await fetchAllForExport(filterQuery);
      }

      if (rows.length === 0) {
        onError(t("products.export.noItems"));
        return;
      }

      const filename = buildExportFilename(scope, format, t);
      if (format === "csv") {
        downloadCsv(filename, buildCsv(rows, t));
        onSuccess(t("products.export.successCsv"));
      } else {
        await downloadPdf(filename, rows, t, i18n.language);
        onSuccess(t("products.export.successPdf"));
      }
    } catch {
      onError(t("products.export.failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={disabled || busy}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-11 items-center gap-2 rounded-lg border border-zinc-300 px-3 text-sm font-medium transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        {busy ? <Spinner className="h-4 w-4" /> : null}
        <span>{busy ? t("products.export.preparing") : t("products.export.label")}</span>
        <span aria-hidden="true" className="text-xs opacity-70">
          ▾
        </span>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute end-0 top-full z-30 mt-1 min-w-[14rem] overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
        >
          {hasSelection ? (
            <ExportSection
              title={t("products.export.scopeSelected", {
                count: selectedProducts.length,
              })}
              onCsv={() => void runExport("csv", "selected")}
              onPdf={() => void runExport("pdf", "selected")}
            />
          ) : null}
          <ExportSection
            title={t("products.export.scopeFiltered")}
            onCsv={() => void runExport("csv", "filtered")}
            onPdf={() => void runExport("pdf", "filtered")}
          />
        </div>
      ) : null}
    </div>
  );
}

function ExportSection({
  title,
  onCsv,
  onPdf,
}: {
  title: string;
  onCsv: () => void;
  onPdf: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="px-1 py-1">
      <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {title}
      </p>
      <button
        type="button"
        role="menuitem"
        onClick={onCsv}
        className="flex w-full items-center px-3 py-2 text-start text-sm transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        {t("products.export.csv")}
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={onPdf}
        className="flex w-full items-center px-3 py-2 text-start text-sm transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        {t("products.export.pdf")}
      </button>
    </div>
  );
}
