import type { QueryClient } from "@tanstack/react-query";
import { productKeys } from "../api";
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

function mutateLists(
  qc: QueryClient,
  mutator: (items: PublicProduct[]) => PublicProduct[],
  options?: { totalDelta?: number },
): void {
  // We apply the same `totalDelta` to every cached page of the same list so
  // that paginating between pages doesn't surface inconsistent counts. The
  // caller is responsible for computing the global delta exactly once (e.g.
  // how many distinct products actually exist in any cached page).
  const totalDelta = options?.totalDelta ?? 0;
  qc.setQueriesData<ListProductsResult>(
    { queryKey: productKeys.lists() },
    (data) => {
      if (!data) return data;
      const items = mutator(data.items);
      const itemsChanged = items !== data.items;
      if (!itemsChanged && totalDelta === 0) return data;
      const total = Math.max(0, data.total + totalDelta);
      return {
        ...data,
        items,
        total,
        totalPages: Math.max(1, Math.ceil(total / data.limit)),
      };
    },
  );
}

export function removeProductsFromLists(qc: QueryClient, ids: string[]): void {
  if (ids.length === 0) return;
  const idSet = new Set(ids);
  // Count the IDs that actually exist somewhere in the cache so we don't
  // double-count when a user deletes the same product from multiple cached
  // pages (which shouldn't happen, but be defensive) and don't subtract for
  // IDs that were never in the cache at all.
  const cachedIds = new Set<string>();
  for (const [, data] of qc.getQueriesData<ListProductsResult>({
    queryKey: productKeys.lists(),
  })) {
    if (!data) continue;
    for (const item of data.items) {
      if (idSet.has(item.id)) cachedIds.add(item.id);
    }
  }
  // If we have no signal from the cache (e.g. nothing was pre-loaded yet),
  // fall back to the requested count so the total still moves in the right
  // direction; the next invalidate will reconcile.
  const totalDelta = -(cachedIds.size > 0 ? cachedIds.size : ids.length);
  mutateLists(
    qc,
    (items) => {
      if (!items.some((p) => idSet.has(p.id))) return items;
      return items.filter((p) => !idSet.has(p.id));
    },
    { totalDelta },
  );
}

export function setProductsStatusInLists(
  qc: QueryClient,
  ids: string[],
  status: ProductStatusValue,
  statusLabel: string,
): void {
  if (ids.length === 0) return;
  const idSet = new Set(ids);
  mutateLists(qc, (items) => {
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
