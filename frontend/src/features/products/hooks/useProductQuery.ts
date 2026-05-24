import { useQuery } from "@tanstack/react-query";
import { getProduct, productKeys } from "../api";
import type { PublicProduct } from "../types";

// Detail-page query for a single product. The list page primes the cache via
// `findProductInLists` for the few rows it already has, but this hook fetches
// authoritatively so deep-links and refreshes still work.
export function useProductQuery(id: string | undefined) {
  return useQuery<PublicProduct>({
    queryKey: id
      ? productKeys.detail(id)
      : (["products", "detail", "none"] as const),
    queryFn: () => {
      if (!id) {
        return Promise.reject(
          new Error("Cannot fetch product without an id"),
        );
      }
      return getProduct(id);
    },
    enabled: Boolean(id),
  });
}
