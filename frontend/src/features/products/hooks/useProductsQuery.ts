import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listProducts, productKeys } from "../api";
import type { ListProductsQuery, ListProductsResult } from "../types";

export function useProductsQuery(query: ListProductsQuery) {
  return useQuery<ListProductsResult>({
    queryKey: productKeys.list(query),
    queryFn: () => listProducts(query),
    placeholderData: keepPreviousData,
  });
}
