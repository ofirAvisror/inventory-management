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

export type PdfExportScope = "selected" | "filtered";

export type PdfExportMeta = {
  scope: PdfExportScope;
  filterQuery?: ListProductsQuery;
};

const PDF_MARGIN = 40;
const PDF_BRAND_HEIGHT = 64;
const PDF_ACCENT_HEIGHT = 3;

const PDF_PALETTE = {
  brand: [24, 24, 27] as [number, number, number],
  accent: [59, 130, 246] as [number, number, number],
  headerText: [250, 250, 250] as [number, number, number],
  subtitleText: [161, 161, 170] as [number, number, number],
  metaBg: [244, 244, 245] as [number, number, number],
  metaBorder: [228, 228, 231] as [number, number, number],
  bodyText: [39, 39, 42] as [number, number, number],
  muted: [113, 113, 122] as [number, number, number],
  tableHead: [39, 39, 42] as [number, number, number],
  rowAlt: [250, 250, 250] as [number, number, number],
  footerLine: [228, 228, 231] as [number, number, number],
};

const STATUS_PDF_COLORS: Record<
  ProductStatusValue,
  { bg: [number, number, number]; text: [number, number, number] }
> = {
  1: { bg: [228, 228, 231], text: [39, 39, 42] },
  2: { bg: [224, 242, 254], text: [7, 89, 133] },
  3: { bg: [254, 243, 199], text: [146, 64, 14] },
  4: { bg: [237, 233, 254], text: [91, 33, 182] },
  5: { bg: [209, 250, 229], text: [6, 95, 70] },
};

interface PdfColumnSpec {
  key: keyof PublicProduct | "statusLabel";
  header: string;
  width: number;
}

function pdfColumns(t: TFunction): PdfColumnSpec[] {
  return [
    { key: "name", header: t("products.columns.product"), width: 130 },
    { key: "sku", header: t("products.columns.sku"), width: 88 },
    { key: "macAddress", header: t("products.columns.macAddress"), width: 98 },
    { key: "imei", header: t("products.columns.imei"), width: 92 },
    { key: "customerId", header: t("products.columns.customerId"), width: 88 },
    { key: "statusLabel", header: t("products.columns.status"), width: 108 },
    { key: "updatedAt", header: t("products.columns.updatedAt"), width: 96 },
  ];
}

const EMPTY_CELL = "—";

function formatPdfDate(value: unknown, locale: string): string {
  if (!value) return EMPTY_CELL;
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return EMPTY_CELL;
  return date.toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function pdfCellValue(
  row: PublicProduct,
  key: PdfColumnSpec["key"],
  t: TFunction,
  locale: string,
): string {
  if (key === "statusLabel") return statusLabel(t, row.status);
  if (key === "updatedAt") return formatPdfDate(row.updatedAt, locale);
  const value = row[key as keyof PublicProduct];
  if (value === null || value === undefined || value === "") return EMPTY_CELL;
  return String(value);
}

function buildFilterSummary(
  t: TFunction,
  filterQuery: ListProductsQuery | undefined,
): string {
  if (!filterQuery) return t("products.export.pdfNoFilters");
  const parts: string[] = [];
  if (filterQuery.search?.trim()) {
    parts.push(
      t("products.export.pdfFilterSearch", { value: filterQuery.search.trim() }),
    );
  }
  if (filterQuery.status !== undefined) {
    parts.push(
      t("products.export.pdfFilterStatus", {
        value: statusLabel(t, filterQuery.status),
      }),
    );
  }
  if (filterQuery.customerId?.trim()) {
    parts.push(
      t("products.export.pdfFilterCustomer", {
        value: filterQuery.customerId.trim(),
      }),
    );
  }
  return parts.length > 0 ? parts.join(" · ") : t("products.export.pdfNoFilters");
}

function countByStatus(rows: PublicProduct[]): Map<ProductStatusValue, number> {
  const counts = new Map<ProductStatusValue, number>();
  for (const status of [1, 2, 3, 4, 5] as ProductStatusValue[]) {
    counts.set(status, 0);
  }
  for (const row of rows) {
    counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  }
  return counts;
}

type PdfFont = "NotoSansHebrew" | "helvetica";

interface PdfLayoutContext {
  doc: import("jspdf").jsPDF;
  font: PdfFont;
  isRtl: boolean;
  locale: string;
  t: TFunction;
}

function pageWidth(doc: import("jspdf").jsPDF): number {
  return doc.internal.pageSize.getWidth();
}

function pageHeight(doc: import("jspdf").jsPDF): number {
  return doc.internal.pageSize.getHeight();
}

function textX(ctx: PdfLayoutContext, edge: "start" | "end"): number {
  return edge === "start"
    ? ctx.isRtl
      ? pageWidth(ctx.doc) - PDF_MARGIN
      : PDF_MARGIN
    : ctx.isRtl
      ? PDF_MARGIN
      : pageWidth(ctx.doc) - PDF_MARGIN;
}

function align(ctx: PdfLayoutContext): "left" | "right" {
  return ctx.isRtl ? "right" : "left";
}

function setFont(ctx: PdfLayoutContext, size: number, style: "normal" | "bold" = "normal"): void {
  ctx.doc.setFont(ctx.font, style);
  ctx.doc.setFontSize(size);
}

function drawBrandHeader(ctx: PdfLayoutContext): void {
  const { doc } = ctx;
  const width = pageWidth(doc);

  doc.setFillColor(...PDF_PALETTE.brand);
  doc.rect(0, 0, width, PDF_BRAND_HEIGHT, "F");

  doc.setFillColor(...PDF_PALETTE.accent);
  doc.rect(0, PDF_BRAND_HEIGHT, width, PDF_ACCENT_HEIGHT, "F");

  setFont(ctx, 10, "normal");
  doc.setTextColor(...PDF_PALETTE.subtitleText);
  doc.text(ctx.t("app.brandName"), textX(ctx, "start"), 22, {
    align: align(ctx),
  });

  setFont(ctx, 20, "bold");
  doc.setTextColor(...PDF_PALETTE.headerText);
  doc.text(ctx.t("products.export.pdfReportTitle"), textX(ctx, "start"), 42, {
    align: align(ctx),
  });

  setFont(ctx, 9, "normal");
  doc.setTextColor(...PDF_PALETTE.subtitleText);
  doc.text(ctx.t("products.export.pdfReportSubtitle"), textX(ctx, "start"), 56, {
    align: align(ctx),
  });

  const generated = `${ctx.t("products.export.pdfGenerated")}: ${new Date().toLocaleString(ctx.locale)}`;
  setFont(ctx, 8, "normal");
  doc.text(generated, textX(ctx, "end"), 42, { align: align(ctx) });
}

function drawMetaPanel(
  ctx: PdfLayoutContext,
  y: number,
  rows: PublicProduct[],
  meta: PdfExportMeta,
): number {
  const { doc } = ctx;
  const width = pageWidth(doc);
  const panelX = PDF_MARGIN;
  const panelW = width - PDF_MARGIN * 2;
  const panelH = 52;

  doc.setFillColor(...PDF_PALETTE.metaBg);
  doc.setDrawColor(...PDF_PALETTE.metaBorder);
  doc.setLineWidth(0.75);
  doc.roundedRect(panelX, y, panelW, panelH, 6, 6, "FD");

  const scopeLabel =
    meta.scope === "selected"
      ? ctx.t("products.export.scopeSelected", { count: rows.length })
      : ctx.t("products.export.scopeFiltered");

  const colGap = panelW / 3;
  const labels = [
    ctx.t("products.export.pdfScope"),
    ctx.t("products.export.pdfTotal"),
    ctx.t("products.export.pdfFilters"),
  ];
  const values = [scopeLabel, String(rows.length), buildFilterSummary(ctx.t, meta.filterQuery)];

  labels.forEach((label, index) => {
    const cx = panelX + colGap * index + colGap / 2;
    setFont(ctx, 7, "normal");
    doc.setTextColor(...PDF_PALETTE.muted);
    doc.text(label.toUpperCase(), cx, y + 16, { align: "center" });

    setFont(ctx, 10, "bold");
    doc.setTextColor(...PDF_PALETTE.bodyText);
    const value = values[index];
    const maxWidth = colGap - 16;
    const lines = doc.splitTextToSize(value, maxWidth) as string[];
    doc.text(lines.slice(0, 2), cx, y + 32, { align: "center" });
  });

  return y + panelH;
}

function drawStatusSummary(
  ctx: PdfLayoutContext,
  y: number,
  rows: PublicProduct[],
): number {
  const { doc } = ctx;
  const counts = countByStatus(rows);
  const chipHeight = 22;
  const gap = 8;
  let x = ctx.isRtl ? pageWidth(doc) - PDF_MARGIN : PDF_MARGIN;
  let rowY = y + 10;

  for (const status of [1, 2, 3, 4, 5] as ProductStatusValue[]) {
    const count = counts.get(status) ?? 0;
    if (count === 0) continue;

    const label = `${statusLabel(ctx.t, status)}: ${count}`;
    setFont(ctx, 8, "bold");
    const textW = doc.getTextWidth(label);
    const chipW = textW + 20;

    if (!ctx.isRtl && x + chipW > pageWidth(doc) - PDF_MARGIN) {
      x = PDF_MARGIN;
      rowY += chipHeight + gap;
    }
    if (ctx.isRtl && x - chipW < PDF_MARGIN) {
      x = pageWidth(doc) - PDF_MARGIN;
      rowY += chipHeight + gap;
    }

    const chipX = ctx.isRtl ? x - chipW : x;
    const colors = STATUS_PDF_COLORS[status];
    doc.setFillColor(...colors.bg);
    doc.setDrawColor(...colors.bg);
    doc.roundedRect(chipX, rowY, chipW, chipHeight, chipHeight / 2, chipHeight / 2, "F");
    doc.setTextColor(...colors.text);
    doc.text(label, chipX + chipW / 2, rowY + 14, { align: "center" });

    x = ctx.isRtl ? chipX - gap : chipX + chipW + gap;
  }

  return rowY + chipHeight + 14;
}

function drawCompactPageHeader(ctx: PdfLayoutContext): void {
  const { doc } = ctx;
  const width = pageWidth(doc);
  const height = 36;

  doc.setFillColor(...PDF_PALETTE.brand);
  doc.rect(0, 0, width, height, "F");

  doc.setFillColor(...PDF_PALETTE.accent);
  doc.rect(0, height, width, 2, "F");

  setFont(ctx, 11, "bold");
  doc.setTextColor(...PDF_PALETTE.headerText);
  doc.text(ctx.t("products.export.pdfReportTitle"), textX(ctx, "start"), 22, {
    align: align(ctx),
  });

  setFont(ctx, 8, "normal");
  doc.setTextColor(...PDF_PALETTE.subtitleText);
  doc.text(ctx.t("app.brandName"), textX(ctx, "end"), 22, {
    align: align(ctx),
  });
}

function drawPageFooter(
  ctx: PdfLayoutContext,
  pageNumber: number,
  pageCount: number,
): void {
  const { doc } = ctx;
  const y = pageHeight(doc) - 24;
  const width = pageWidth(doc);

  doc.setDrawColor(...PDF_PALETTE.footerLine);
  doc.setLineWidth(0.5);
  doc.line(PDF_MARGIN, y - 8, width - PDF_MARGIN, y - 8);

  setFont(ctx, 7, "normal");
  doc.setTextColor(...PDF_PALETTE.muted);
  doc.text(ctx.t("products.export.pdfFooter"), width / 2, y, { align: "center" });
  doc.text(
    ctx.t("products.export.pdfPage", { page: pageNumber, pages: pageCount }),
    textX(ctx, "end"),
    y,
    { align: align(ctx) },
  );
}

export async function downloadPdf(
  filename: string,
  rows: PublicProduct[],
  t: TFunction,
  language: string,
  meta?: PdfExportMeta,
): Promise<void> {
  const { default: JsPDF } = await import("jspdf");
  const autotable = (await import("jspdf-autotable")).default;

  const isHebrewLocale = language.toLowerCase().startsWith("he");
  const locale = isHebrewLocale ? "he-IL" : "en-US";
  const doc = new JsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  let tableFont: PdfFont = "helvetica";
  if (isHebrewLocale) {
    const fontBase64 = await fetchHebrewFontBase64();
    if (fontBase64) {
      doc.addFileToVFS("NotoSansHebrew.ttf", fontBase64);
      doc.addFont("NotoSansHebrew.ttf", "NotoSansHebrew", "normal");
      doc.addFont("NotoSansHebrew.ttf", "NotoSansHebrew", "bold");
      doc.setFont("NotoSansHebrew");
      doc.setR2L(true);
      tableFont = "NotoSansHebrew";
    }
  }

  const ctx: PdfLayoutContext = { doc, font: tableFont, isRtl: isHebrewLocale, locale, t };
  const exportMeta: PdfExportMeta = meta ?? { scope: "filtered" };

  drawBrandHeader(ctx);
  let cursorY = PDF_BRAND_HEIGHT + PDF_ACCENT_HEIGHT + 14;
  cursorY = drawMetaPanel(ctx, cursorY, rows, exportMeta);
  cursorY = drawStatusSummary(ctx, cursorY, rows);

  const cols = pdfColumns(t);
  const statusColIndex = cols.findIndex((c) => c.key === "statusLabel");
  const head = [cols.map((c) => c.header)];
  const body = rows.map((row) =>
    cols.map((c) => pdfCellValue(row, c.key, t, locale)),
  );

  autotable(doc, {
    head,
    body,
    startY: cursorY + 4,
    margin: { top: 48, right: PDF_MARGIN, bottom: 44, left: PDF_MARGIN },
    tableWidth: "auto",
    styles: {
      font: tableFont,
      fontSize: 8.5,
      cellPadding: { top: 6, right: 5, bottom: 6, left: 5 },
      overflow: "linebreak",
      lineColor: PDF_PALETTE.metaBorder,
      lineWidth: 0.25,
      textColor: PDF_PALETTE.bodyText,
      valign: "middle",
    },
    headStyles: {
      fillColor: PDF_PALETTE.tableHead,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      cellPadding: { top: 7, right: 5, bottom: 7, left: 5 },
    },
    alternateRowStyles: {
      fillColor: PDF_PALETTE.rowAlt,
    },
    columnStyles: Object.fromEntries(
      cols.map((col, index) => [index, { cellWidth: col.width }]),
    ),
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === statusColIndex) {
        const row = rows[data.row.index];
        if (!row) return;
        const colors = STATUS_PDF_COLORS[row.status];
        data.cell.styles.fillColor = colors.bg;
        data.cell.styles.textColor = colors.text;
        data.cell.styles.fontStyle = "bold";
      }
    },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        drawCompactPageHeader(ctx);
      }
    },
  });

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    drawPageFooter(ctx, page, totalPages);
  }

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
