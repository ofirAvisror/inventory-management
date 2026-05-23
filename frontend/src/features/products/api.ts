import { api } from "../../lib/api";
import type {
  AuditLogEntry,
  BulkResult,
  ListProductsQuery,
  ListProductsResult,
  ProductStatusValue,
  PublicProduct,
} from "./types";

const BASE = "/api/products";

export const productKeys = {
  all: ["products"] as const,
  lists: () => [...productKeys.all, "list"] as const,
  list: (query: ListProductsQuery) =>
    [...productKeys.lists(), normalizeListKey(query)] as const,
  detail: (id: string) => [...productKeys.all, "detail", id] as const,
  audit: (id: string) => [...productKeys.all, "audit", id] as const,
};

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

function normalizeListKey(query: ListProductsQuery) {
  return {
    search: query.search ?? "",
    status: query.status ?? null,
    customerId: query.customerId ?? "",
    page: query.page ?? DEFAULT_PAGE,
    limit: query.limit ?? DEFAULT_LIMIT,
  };
}

// Always serialize `page` and `limit` so the network request matches the
// React Query cache key produced by `normalizeListKey` (which also fills in
// defaults). Without this, an undefined `page`/`limit` would produce a cache
// key of {page:1,limit:20} but a query string with neither, causing the cache
// and the server result for "page 1" to diverge.
function toQueryString(query: ListProductsQuery): string {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.status !== undefined && query.status !== null) {
    params.set("status", String(query.status));
  }
  if (query.customerId) params.set("customerId", query.customerId);
  params.set("page", String(query.page ?? DEFAULT_PAGE));
  params.set("limit", String(query.limit ?? DEFAULT_LIMIT));
  const s = params.toString();
  return s.length > 0 ? `?${s}` : "";
}

export async function listProducts(
  query: ListProductsQuery,
): Promise<ListProductsResult> {
  const { data } = await api.get<ListProductsResult>(
    `${BASE}${toQueryString(query)}`,
  );
  return data;
}

export async function getProduct(id: string): Promise<PublicProduct> {
  const { data } = await api.get<{ product: PublicProduct }>(`${BASE}/${id}`);
  return data.product;
}

export interface CreateProductInput {
  name: string;
  sku: string;
  macAddress: string;
  imei?: string;
  customerId?: string;
  status?: ProductStatusValue;
  imageUrl?: string;
}

export async function createProduct(
  input: CreateProductInput,
): Promise<PublicProduct> {
  const { data } = await api.post<{ product: PublicProduct }>(BASE, input);
  return data.product;
}

export interface UploadImageResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

// Axios automatically sets the multipart boundary in `Content-Type` when the
// request body is a `FormData` instance, so we do not set it manually here.
export async function uploadProductImage(
  file: File,
): Promise<UploadImageResult> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post<UploadImageResult>(`${BASE}/upload`, form);
  return data;
}

export async function deleteProduct(id: string): Promise<void> {
  await api.delete(`${BASE}/${id}`);
}

export async function bulkDelete(ids: string[]): Promise<BulkResult> {
  const { data } = await api.post<BulkResult>(`${BASE}/bulk-delete`, { ids });
  return data;
}

export interface ChangeStatusInput {
  status: ProductStatusValue;
  reason?: string;
}

export async function changeStatus(
  id: string,
  input: ChangeStatusInput,
): Promise<PublicProduct> {
  const { data } = await api.patch<{ product: PublicProduct }>(
    `${BASE}/${id}/status`,
    input,
  );
  return data.product;
}

export interface BulkChangeStatusInput {
  ids: string[];
  status: ProductStatusValue;
  reason?: string;
}

export async function bulkChangeStatus(
  input: BulkChangeStatusInput,
): Promise<BulkResult> {
  const { data } = await api.post<BulkResult>(`${BASE}/bulk-status`, input);
  return data;
}

export async function getAuditLog(id: string): Promise<AuditLogEntry[]> {
  const { data } = await api.get<{ entries: AuditLogEntry[] }>(
    `${BASE}/${id}/audit-log`,
  );
  return data.entries;
}
