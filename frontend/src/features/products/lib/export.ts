import type { TFunction } from "i18next";
import { listProducts } from "../api";
import type {
  ListProductsQuery,
  ProductStatusValue,
  PublicProduct,
} from "../types";

const CHUNK = 100;
const MAX_PAGES = 200; // hard safety cap (20k products)

/**
 * Walk the backend in pages of CHUNK using the same filter the user has
 * applied to the list. The first page tells us totalPages so we know when to
 * stop. We respect MAX_PAGES as a safety cap to avoid runaway exports.
 */
export async function fetchAllForExport(
  query: ListProductsQuery,
): Promise<PublicProduct[]> {
  const baseQuery: ListProductsQuery = { ...query, limit: CHUNK, page: 1 };
  const first = await listProducts(baseQuery);
  const items: PublicProduct[] = [...first.items];
  const pages = Math.min(first.totalPages, MAX_PAGES);

  for (let page = 2; page <= pages; page++) {
    const next = await listProducts({ ...baseQuery, page });
    items.push(...next.items);
  }
  return items;
}

const STATUS_FALLBACK: Record<ProductStatusValue, string> = {
  1: "Stock In",
  2: "Assigned to Customer",
  3: "Configuration In",
  4: "Ready for Delivery",
  5: "Delivered",
};

interface ColumnSpec {
  key: keyof PublicProduct | "statusNumeric";
  header: string;
}

function columns(t: TFunction): ColumnSpec[] {
  return [
    { key: "name", header: t("products.columns.product") },
    { key: "sku", header: t("products.columns.sku") },
    { key: "macAddress", header: t("products.columns.macAddress") },
    { key: "imei", header: t("products.columns.imei") },
    { key: "customerId", header: t("products.columns.customerId") },
    { key: "statusNumeric", header: t("products.columns.status") + " #" },
    { key: "statusLabel", header: t("products.columns.status") },
    { key: "imageUrl", header: t("products.columns.image") },
    { key: "updatedAt", header: t("products.columns.updatedAt") },
  ];
}

function cellValue(row: PublicProduct, key: ColumnSpec["key"]): string {
  if (key === "statusNumeric") return String(row.status);
  const value = row[key as keyof PublicProduct];
  if (value === null || value === undefined) return "";
  return String(value);
}

function statusLabel(t: TFunction, status: ProductStatusValue): string {
  const translated = t(`products.status.${status}`);
  if (!translated || translated === `products.status.${status}`) {
    return STATUS_FALLBACK[status];
  }
  return translated;
}

function csvEscape(value: string): string {
  if (value.includes('"') || value.includes(",") || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildCsv(rows: PublicProduct[], t: TFunction): string {
  const cols = columns(t);
  const header = cols.map((c) => csvEscape(c.header)).join(",");
  const lines = rows.map((row) =>
    cols
      .map((c) => {
        if (c.key === "statusLabel") {
          return csvEscape(statusLabel(t, row.status));
        }
        return csvEscape(cellValue(row, c.key));
      })
      .join(","),
  );
  return [header, ...lines].join("\r\n");
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadCsv(filename: string, csv: string): void {
  // UTF-8 BOM so Excel detects the encoding and renders Hebrew correctly.
  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  downloadBlob(filename, blob);
}

let hebrewFontPromise: Promise<string | null> | null = null;

// jspdf only understands TTF/OTF — it cannot parse WOFF/WOFF2 wrappers. We
// therefore pull the upstream Noto TTF straight from the official notofonts
// release repo via jsDelivr. The font is fetched lazily so the table page
// pays nothing until the user actually exports Hebrew content.
const HEBREW_TTF_URL =
  "https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io/fonts/NotoSansHebrew/hinted/ttf/NotoSansHebrew-Regular.ttf";

async function fetchHebrewFontBase64(): Promise<string | null> {
  if (!hebrewFontPromise) {
    hebrewFontPromise = (async () => {
      try {
        const response = await fetch(HEBREW_TTF_URL);
        if (!response.ok) return null;
        const buffer = await response.arrayBuffer();
        return arrayBufferToBase64(buffer);
      } catch {
        return null;
      }
    })();
  }
  return hebrewFontPromise;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export async function downloadPdf(
  filename: string,
  rows: PublicProduct[],
  t: TFunction,
  language: string,
): Promise<void> {
  // Lazy-load jspdf so the table page does not ship it in the initial chunk.
  const { default: JsPDF } = await import("jspdf");
  const autotable = (await import("jspdf-autotable")).default;

  const doc = new JsPDF({ orientation: "landscape", unit: "pt" });

  const isHebrew = language === "he";
  if (isHebrew) {
    const fontBase64 = await fetchHebrewFontBase64();
    if (fontBase64) {
      doc.addFileToVFS("NotoSansHebrew.ttf", fontBase64);
      doc.addFont("NotoSansHebrew.ttf", "NotoSansHebrew", "normal");
      doc.setFont("NotoSansHebrew");
      doc.setR2L(true);
    }
  }

  const cols = columns(t);
  const head = [cols.map((c) => c.header)];
  const body = rows.map((row) =>
    cols.map((c) => {
      if (c.key === "statusLabel") return statusLabel(t, row.status);
      return cellValue(row, c.key);
    }),
  );

  autotable(doc, {
    head,
    body,
    margin: { top: 60, right: 24, bottom: 36, left: 24 },
    styles: {
      font: isHebrew ? "NotoSansHebrew" : "helvetica",
      fontSize: 8,
      cellPadding: 4,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [39, 39, 42],
      textColor: 255,
      font: isHebrew ? "NotoSansHebrew" : "helvetica",
    },
    didDrawPage: () => {
      doc.setFontSize(12);
      doc.setFont(isHebrew ? "NotoSansHebrew" : "helvetica", "normal");
      doc.text(t("products.title"), 24, 36);
      doc.setFontSize(8);
      doc.text(
        new Date().toLocaleString(isHebrew ? "he-IL" : "en-US"),
        doc.internal.pageSize.getWidth() - 24,
        36,
        { align: "right" },
      );
    },
  });

  doc.save(filename);
}

export function buildExportFilename(
  scope: "selected" | "filtered",
  extension: "csv" | "pdf",
  t: TFunction,
): string {
  const prefix = t("products.export.filenamePrefix");
  const stamp = new Date()
    .toISOString()
    .replace(/[:T]/g, "-")
    .replace(/\..+$/, "");
  return `${prefix}-${scope}-${stamp}.${extension}`;
}
