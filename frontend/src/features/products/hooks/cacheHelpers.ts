import type { QueryClient } from "@tanstack/react-query";
import { getProduct, productKeys } from "../api";
import type {
  ListProductsResult,
  ProductStatusValue,
  PublicProduct,
} from "../types";

type ListSnapshot = Array<readonly [readonly unknown[], ListProductsResult | undefined]>;

export function snapshotLists(qc: QueryClient): ListSnapshot {
  return qc.getQueriesData<ListProductsResult>({
    queryKey: productKeys.lists(),
  });
}

export function restoreLists(qc: QueryClient, snapshot: ListSnapshot): void {
  for (const [key, data] of snapshot) {
    qc.setQueryData(key, data);
  }
}

// Items-only mutator: rewrite the `items` array of every cached list page
// without touching `total`/`totalPages`. Use this for in-place edits like
// status changes that don't move items between filters in the eyes of the
// list count (the row is still part of the list, just with a new status).
function mutateListItems(
  qc: QueryClient,
  mutator: (items: PublicProduct[]) => PublicProduct[],
): void {
  qc.setQueriesData<ListProductsResult>(
    { queryKey: productKeys.lists() },
    (data) => {
      if (!data) return data;
      const items = mutator(data.items);
      if (items === data.items) return data;
      return { ...data, items };
    },
  );
}

// Build a stable key that identifies a "list variant" — every cached page
// that shares the same filter+limit. We deliberately ignore `page` so that
// removing an item visible on page 2 also corrects the count shown on
// page 1 of the same filter. We DO keep filter+limit so that a delete in
// `status=1` cannot bleed into the `status=2` list's totals.
function variantKeyOf(queryKey: readonly unknown[]): string {
  const params = queryKey[2];
  if (params === null || typeof params !== "object") return "default";
  const raw = params as Record<string, unknown>;
  return JSON.stringify({
    search: raw.search ?? "",
    status: raw.status ?? null,
    customerId: raw.customerId ?? "",
    limit: raw.limit ?? null,
  });
}

export function removeProductsFromLists(qc: QueryClient, ids: string[]): void {
  if (ids.length === 0) return;
  const idSet = new Set(ids);

  // Snapshot once. `getQueriesData` returns plain references, so iterating
  // twice over the same array gives us a consistent picture even though we
  // mutate the cache in pass 2.
  const entries = qc.getQueriesData<ListProductsResult>({
    queryKey: productKeys.lists(),
  });

  // Pass 1: for each variant, gather the distinct IDs from `ids` that
  // actually exist in any of its cached pages. That count is exactly how
  // much the variant's `total` should drop — and it stays at 0 for
  // unrelated variants (e.g. a different status filter), so their counts
  // are not corrupted by deletes that don't apply to them.
  const perVariantDelta = new Map<string, Set<string>>();
  for (const [queryKey, data] of entries) {
    if (!data) continue;
    const key = variantKeyOf(queryKey);
    let bucket = perVariantDelta.get(key);
    if (!bucket) {
      bucket = new Set<string>();
      perVariantDelta.set(key, bucket);
    }
    for (const item of data.items) {
      if (idSet.has(item.id)) bucket.add(item.id);
    }
  }

  // Pass 2: for every cached page, filter items and apply that variant's
  // shared delta to `total`/`totalPages`. All pages of the same variant
  // therefore see the same `total`, no matter which one the user is on.
  for (const [queryKey, data] of entries) {
    if (!data) continue;
    const variantDelta = perVariantDelta.get(variantKeyOf(queryKey))?.size ?? 0;
    const hadMatch = data.items.some((p) => idSet.has(p.id));
    const items = hadMatch
      ? data.items.filter((p) => !idSet.has(p.id))
      : data.items;
    if (!hadMatch && variantDelta === 0) continue;
    const total = Math.max(0, data.total - variantDelta);
    qc.setQueryData<ListProductsResult>(queryKey, {
      ...data,
      items,
      total,
      totalPages: Math.max(1, Math.ceil(total / data.limit)),
    });
  }
}

export function setProductsStatusInLists(
  qc: QueryClient,
  ids: string[],
  status: ProductStatusValue,
  statusLabel: string,
): void {
  if (ids.length === 0) return;
  const idSet = new Set(ids);
  mutateListItems(qc, (items) => {
    let changed = false;
    const next = items.map((p) => {
      if (!idSet.has(p.id) || p.status === status) return p;
      changed = true;
      return { ...p, status, statusLabel };
    });
    return changed ? next : items;
  });
}

export function findProductInLists(
  qc: QueryClient,
  id: string,
): PublicProduct | undefined {
  for (const [, data] of qc.getQueriesData<ListProductsResult>({
    queryKey: productKeys.lists(),
  })) {
    const match = data?.items.find((p) => p.id === id);
    if (match) return match;
  }
  return undefined;
}

export function findProductsInLists(
  qc: QueryClient,
  ids: string[],
): PublicProduct[] {
  const idSet = new Set(ids);
  const map = new Map<string, PublicProduct>();
  for (const [, data] of qc.getQueriesData<ListProductsResult>({
    queryKey: productKeys.lists(),
  })) {
    if (!data) continue;
    for (const item of data.items) {
      if (idSet.has(item.id) && !map.has(item.id)) {
        map.set(item.id, item);
      }
    }
  }
  return Array.from(map.values());
}

export async function invalidateProductLists(qc: QueryClient): Promise<void> {
  await qc.invalidateQueries({ queryKey: productKeys.lists() });
}

export function getCachedProductsByIds(
  qc: QueryClient,
  ids: string[],
): { byId: Map<string, PublicProduct>; missingIds: string[] } {
  const byId = new Map<string, PublicProduct>();
  for (const product of findProductsInLists(qc, ids)) {
    byId.set(product.id, product);
  }
  for (const id of ids) {
    if (byId.has(id)) continue;
    const detail = qc.getQueryData<PublicProduct>(productKeys.detail(id));
    if (detail) byId.set(id, detail);
  }
  const missingIds = ids.filter((id) => !byId.has(id));
  return { byId, missingIds };
}

export function orderProductsByIds(
  ids: string[],
  byId: Map<string, PublicProduct>,
): PublicProduct[] {
  return ids.flatMap((id) => {
    const product = byId.get(id);
    return product ? [product] : [];
  });
}

export async function fetchProductsByIds(
  qc: QueryClient,
  ids: string[],
): Promise<{ fulfilled: PublicProduct[]; rejectedIds: string[] }> {
  if (ids.length === 0) {
    return { fulfilled: [], rejectedIds: [] };
  }

  const results = await Promise.allSettled(
    ids.map((id) =>
      qc.fetchQuery({
        queryKey: productKeys.detail(id),
        queryFn: () => getProduct(id),
      }),
    ),
  );

  const fulfilled: PublicProduct[] = [];
  const rejectedIds: string[] = [];

  results.forEach((result, index) => {
    const id = ids[index];
    if (result.status === "fulfilled") {
      fulfilled.push(result.value);
      return;
    }
    rejectedIds.push(id);
  });

  return { fulfilled, rejectedIds };
}
