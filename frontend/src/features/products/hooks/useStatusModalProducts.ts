import type { QueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { StatusChangeTarget } from "../components/StatusChangeModal";
import type { PublicProduct } from "../types";
import {
  fetchProductsByIds,
  getCachedProductsByIds,
  orderProductsByIds,
} from "./cacheHelpers";

export type StatusModalState =
  | { open: false }
  | { open: true; target: StatusChangeTarget };

export function useStatusModalProducts(
  qc: QueryClient,
  statusModal: StatusModalState,
): {
  products: PublicProduct[];
  isLoading: boolean;
  unresolvedIds: string[];
} {
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [unresolvedIds, setUnresolvedIds] = useState<string[]>([]);

  const modalKey =
    statusModal.open && statusModal.target.mode === "bulk"
      ? statusModal.target.ids.join(",")
      : statusModal.open && statusModal.target.mode === "single"
        ? statusModal.target.product.id
        : null;

  useEffect(() => {
    if (!statusModal.open) {
      setProducts([]);
      setIsLoading(false);
      setUnresolvedIds([]);
      return;
    }

    if (statusModal.target.mode === "single") {
      setProducts([statusModal.target.product]);
      setIsLoading(false);
      setUnresolvedIds([]);
      return;
    }

    const ids = statusModal.target.ids;
    let cancelled = false;

    async function loadBulkProducts(): Promise<void> {
      setIsLoading(true);
      setUnresolvedIds([]);

      const { byId, missingIds } = getCachedProductsByIds(qc, ids);
      const { fulfilled, rejectedIds } = await fetchProductsByIds(qc, missingIds);

      if (cancelled) return;

      for (const product of fulfilled) {
        byId.set(product.id, product);
      }

      setProducts(orderProductsByIds(ids, byId));
      setUnresolvedIds(rejectedIds);
      setIsLoading(false);
    }

    void loadBulkProducts();

    return () => {
      cancelled = true;
    };
  }, [qc, statusModal.open, modalKey]);

  return { products, isLoading, unresolvedIds };
}
