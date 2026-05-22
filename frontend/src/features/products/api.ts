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

function normalizeListKey(query: ListProductsQuery) {
  return {
    search: query.search ?? "",
    status: query.status ?? null,
    customerId: query.customerId ?? "",
    page: query.page ?? 1,
    limit: query.limit ?? 20,
  };
}

function toQueryString(query: ListProductsQuery): string {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.status !== undefined && query.status !== null) {
    params.set("status", String(query.status));
  }
  if (query.customerId) params.set("customerId", query.customerId);
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.limit !== undefined) params.set("limit", String(query.limit));
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
