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
): void {
  qc.setQueriesData<ListProductsResult>(
    { queryKey: productKeys.lists() },
    (data) => {
      if (!data) return data;
      const items = mutator(data.items);
      if (items === data.items) return data;
      const removed = data.items.length - items.length;
      const total = removed > 0 ? Math.max(0, data.total - removed) : data.total;
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
  mutateLists(qc, (items) => {
    if (!items.some((p) => idSet.has(p.id))) return items;
    return items.filter((p) => !idSet.has(p.id));
  });
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
