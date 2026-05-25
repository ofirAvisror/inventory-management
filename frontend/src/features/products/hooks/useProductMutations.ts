import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  bulkChangeStatus,
  bulkDelete,
  changeStatus,
  createProduct,
  deleteProduct,
  productKeys,
  updateProduct,
  uploadProductImage,
  type BulkChangeStatusInput,
  type BulkStatusSupplement,
  type ChangeStatusInput,
  type CreateProductInput,
  type UpdateProductInput,
  type UploadImageResult,
} from "../api";
import type {
  BulkResult,
  ProductStatusValue,
  PublicProduct,
} from "../types";
import {
  invalidateProductLists,
  removeProductsFromLists,
  restoreLists,
  setProductsStatusInLists,
  snapshotLists,
} from "./cacheHelpers";

interface ListSnapshotCtx {
  previous: ReturnType<typeof snapshotLists>;
}

export function useCreateProductMutation() {
  const qc = useQueryClient();
  return useMutation<PublicProduct, unknown, CreateProductInput>({
    mutationFn: (input) => createProduct(input),
    onSuccess: () => {
      void invalidateProductLists(qc);
    },
  });
}

export function useUploadProductImageMutation() {
  return useMutation<UploadImageResult, unknown, File>({
    mutationFn: (file) => uploadProductImage(file),
  });
}

export function useUpdateProductMutation() {
  const qc = useQueryClient();
  return useMutation<
    PublicProduct,
    unknown,
    { id: string; input: UpdateProductInput }
  >({
    mutationFn: ({ id, input }) => updateProduct(id, input),
    onSuccess: (product, variables) => {
      // Seed the detail cache with the freshly-saved product so the detail
      // page reflects the change without an extra round-trip. The list cache
      // is invalidated separately because list rows expose a subset of fields
      // and would need a different patch strategy.
      qc.setQueryData(productKeys.detail(variables.id), product);
      void invalidateProductLists(qc);
    },
  });
}

export function useDeleteProductMutation() {
  const qc = useQueryClient();
  return useMutation<void, unknown, string, ListSnapshotCtx>({
    mutationFn: (id) => deleteProduct(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: productKeys.lists() });
      const previous = snapshotLists(qc);
      removeProductsFromLists(qc, [id]);
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx) restoreLists(qc, ctx.previous);
    },
    onSettled: () => {
      void invalidateProductLists(qc);
    },
  });
}

interface SingleStatusVars {
  id: string;
  status: ProductStatusValue;
  reason?: string;
  customerId?: string;
  imageUrl?: string;
  previousStatus: ProductStatusValue;
  previousStatusLabel: string;
}

export function useChangeStatusMutation() {
  const qc = useQueryClient();
  return useMutation<PublicProduct, unknown, SingleStatusVars, ListSnapshotCtx>({
    mutationFn: ({ id, status, reason, customerId, imageUrl, previousStatus }) => {
      const input: ChangeStatusInput = {
        status,
        expectedStatus: previousStatus,
        reason,
        customerId,
        imageUrl,
      };
      return changeStatus(id, input);
    },
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: productKeys.lists() });
      const previous = snapshotLists(qc);
      // Optimistically apply with a placeholder label; the real label is
      // overwritten by the server response (and by the eventual invalidate).
      setProductsStatusInLists(qc, [id], status, String(status));
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx) restoreLists(qc, ctx.previous);
    },
    onSettled: () => {
      void invalidateProductLists(qc);
    },
  });
}

interface BulkDeleteVars {
  ids: string[];
}

export function useBulkDeleteMutation() {
  const qc = useQueryClient();
  return useMutation<BulkResult, unknown, BulkDeleteVars, ListSnapshotCtx>({
    mutationFn: ({ ids }) => bulkDelete(ids),
    onMutate: async ({ ids }) => {
      await qc.cancelQueries({ queryKey: productKeys.lists() });
      const previous = snapshotLists(qc);
      removeProductsFromLists(qc, ids);
      return { previous };
    },
    onSuccess: (result, _vars, ctx) => {
      // Re-insert items that failed to delete by rolling the whole list back
      // and then removing only the successful ids. This is simpler and safer
      // than patching individual pages.
      if (result.failed.length > 0 && ctx) {
        restoreLists(qc, ctx.previous);
        removeProductsFromLists(
          qc,
          result.success.map((s) => s.id),
        );
      }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx) restoreLists(qc, ctx.previous);
    },
    onSettled: () => {
      void invalidateProductLists(qc);
    },
  });
}

interface BulkStatusVars {
  ids: string[];
  status: ProductStatusValue;
  reason?: string;
  supplements?: Record<string, BulkStatusSupplement>;
  expectedStatuses: Record<string, ProductStatusValue>;
}

export function useBulkStatusMutation() {
  const qc = useQueryClient();
  return useMutation<BulkResult, unknown, BulkStatusVars, ListSnapshotCtx>({
    mutationFn: ({
      ids,
      status,
      reason,
      supplements,
      expectedStatuses,
    }: BulkStatusVars) => {
      const input: BulkChangeStatusInput = {
        ids,
        status,
        reason,
        supplements,
        expectedStatuses,
      };
      return bulkChangeStatus(input);
    },
    onMutate: async ({ ids, status }) => {
      await qc.cancelQueries({ queryKey: productKeys.lists() });
      const previous = snapshotLists(qc);
      setProductsStatusInLists(qc, ids, status, String(status));
      return { previous };
    },
    onSuccess: (result, vars, ctx) => {
      // Revert items whose update was rejected by the backend. We roll the
      // whole cache back, then re-apply the optimistic change to only the
      // successful ids; the eventual invalidate corrects status labels.
      if (result.failed.length > 0 && ctx) {
        restoreLists(qc, ctx.previous);
        setProductsStatusInLists(
          qc,
          result.success.map((s) => s.id),
          vars.status,
          String(vars.status),
        );
      }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx) restoreLists(qc, ctx.previous);
    },
    onSettled: () => {
      void invalidateProductLists(qc);
    },
  });
}
