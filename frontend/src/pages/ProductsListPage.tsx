import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { Button } from "../components/ui/Button";
import { useToast } from "../contexts/ToastContext";
import { AuditLogDrawer } from "../features/products/components/AuditLogDrawer";
import {
  BulkResultModal,
  type BulkActionKind,
  type BulkResultPayload,
} from "../features/products/components/BulkResultModal";
import { BulkActionsBar } from "../features/products/components/BulkActionsBar";
import {
  DeleteConfirmModal,
  type DeleteTarget,
} from "../features/products/components/DeleteConfirmModal";
import { ExportMenu } from "../features/products/components/ExportMenu";
import { Pagination } from "../features/products/components/Pagination";
import {
  ProductsFilters,
  type ProductFiltersState,
} from "../features/products/components/ProductsFilters";
import { ProductsTable } from "../features/products/components/ProductsTable";
import {
  StatusChangeModal,
  type StatusChangeTarget,
} from "../features/products/components/StatusChangeModal";
import {
  findProductInLists,
  findProductsInLists,
} from "../features/products/hooks/cacheHelpers";
import {
  useBulkDeleteMutation,
  useBulkStatusMutation,
  useChangeStatusMutation,
  useDeleteProductMutation,
} from "../features/products/hooks/useProductMutations";
import { useProductsQuery } from "../features/products/hooks/useProductsQuery";
import { translateProductErrorCode } from "../features/products/lib/errors";
import { reconcileSelectionAfterBulk } from "../features/products/lib/selection";
import type {
  BulkResult,
  ListProductsQuery,
  ProductStatusValue,
  PublicProduct,
} from "../features/products/types";
import { toApiError } from "../lib/api";
import { useDebouncedValue } from "../lib/useDebouncedValue";
import { paths } from "../routes/paths";
import { useQueryClient } from "@tanstack/react-query";

type StatusModalState =
  | { open: false }
  | { open: true; target: StatusChangeTarget };

type DeleteModalState =
  | { open: false }
  | { open: true; target: DeleteTarget };

export function ProductsListPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get("search") ?? "";
  const statusParam = searchParams.get("status");
  const status: ProductStatusValue | "" =
    statusParam && !Number.isNaN(Number(statusParam))
      ? (Number(statusParam) as ProductStatusValue)
      : "";
  const customerId = searchParams.get("customerId") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = Math.max(
    1,
    Math.min(100, Number(searchParams.get("limit") ?? "20")),
  );

  // Debounce the search & customerId text inputs to avoid hammering the API
  // on every keystroke. Status select is applied immediately.
  const debouncedSearch = useDebouncedValue(search, 300);
  const debouncedCustomerId = useDebouncedValue(customerId, 300);

  const query: ListProductsQuery = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      status: status === "" ? undefined : status,
      customerId: debouncedCustomerId || undefined,
      page,
      limit,
    }),
    [debouncedSearch, status, debouncedCustomerId, page, limit],
  );

  const productsQuery = useProductsQuery(query);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusModal, setStatusModal] = useState<StatusModalState>({
    open: false,
  });
  const [statusServerError, setStatusServerError] = useState<unknown>(null);
  const [deleteModal, setDeleteModal] = useState<DeleteModalState>({
    open: false,
  });
  const [auditDrawer, setAuditDrawer] = useState<{
    open: boolean;
    productId: string | null;
    productSku: string | null;
  }>({ open: false, productId: null, productSku: null });
  const [bulkResult, setBulkResult] = useState<BulkResultPayload | null>(null);

  const items = productsQuery.data?.items ?? [];
  const total = productsQuery.data?.total ?? 0;
  const totalPages = productsQuery.data?.totalPages ?? 1;

  const selectedProducts = useMemo(
    () => findProductsInLists(qc, Array.from(selectedIds)),
    [qc, selectedIds],
  );

  const filtersValue: ProductFiltersState = {
    search,
    status,
    customerId,
  };

  const patchParams = (
    patch: Record<string, string | number | null | undefined>,
  ) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(patch)) {
          if (value === null || value === undefined || value === "") {
            next.delete(key);
          } else {
            next.set(key, String(value));
          }
        }
        return next;
      },
      { replace: true },
    );
  };

  const onFiltersChange = (next: ProductFiltersState) => {
    patchParams({
      search: next.search,
      status: next.status === "" ? null : next.status,
      customerId: next.customerId,
      page: 1,
    });
  };

  const onFiltersClear = () => {
    patchParams({ search: null, status: null, customerId: null, page: 1 });
  };

  const onPageChange = (nextPage: number) => patchParams({ page: nextPage });
  const onLimitChange = (nextLimit: number) =>
    patchParams({ limit: nextLimit, page: 1 });

  const toggleOne = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = (ids: string[], checked: boolean) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) ids.forEach((id) => next.add(id));
      else ids.forEach((id) => next.delete(id));
      return next;
    });

  const clearSelection = () => setSelectedIds(new Set());

  const deleteOne = useDeleteProductMutation();
  const changeStatusOne = useChangeStatusMutation();
  const bulkDelete = useBulkDeleteMutation();
  const bulkStatus = useBulkStatusMutation();

  const openStatusModal = (target: StatusChangeTarget) => {
    setStatusServerError(null);
    setStatusModal({ open: true, target });
  };

  const closeStatusModal = () => {
    setStatusModal({ open: false });
    setStatusServerError(null);
  };

  const openDeleteModal = (target: DeleteTarget) =>
    setDeleteModal({ open: true, target });

  const closeDeleteModal = () => setDeleteModal({ open: false });

  const openAudit = (product: PublicProduct) =>
    setAuditDrawer({
      open: true,
      productId: product.id,
      productSku: product.sku,
    });

  const closeAudit = () =>
    setAuditDrawer((state) => ({ ...state, open: false }));

  const submitStatusChange = (
    targetStatus: ProductStatusValue,
    reason: string | undefined,
  ) => {
    if (!statusModal.open) return;
    const target = statusModal.target;
    setStatusServerError(null);

    if (target.mode === "single") {
      const product = target.product;
      changeStatusOne.mutate(
        {
          id: product.id,
          status: targetStatus,
          reason,
          previousStatus: product.status,
          previousStatusLabel: product.statusLabel,
        },
        {
          onSuccess: () => {
            toast({
              variant: "success",
              title: t("products.success.statusChanged"),
            });
            closeStatusModal();
          },
          onError: (error) => setStatusServerError(error),
        },
      );
    } else {
      const ids = target.ids;
      const participants = findProductsInLists(qc, ids);
      bulkStatus.mutate(
        { ids, status: targetStatus, reason },
        {
          onSuccess: (result) => {
            handleBulkResult({
              action: "status",
              ids,
              participants,
              result,
              successMessage: t("products.success.bulkStatusChanged", {
                count: result.success.length,
              }),
            });
            closeStatusModal();
          },
          onError: (error) => setStatusServerError(error),
        },
      );
    }
  };

  const submitDelete = () => {
    if (!deleteModal.open) return;
    const target = deleteModal.target;
    if (target.mode === "single") {
      deleteOne.mutate(target.product.id, {
        onSuccess: () => {
          toast({ variant: "success", title: t("products.success.deleted") });
          setSelectedIds((prev) => {
            if (!prev.has(target.product.id)) return prev;
            const next = new Set(prev);
            next.delete(target.product.id);
            return next;
          });
          closeDeleteModal();
        },
        onError: (error) => {
          const apiError = toApiError(
            error,
            t("products.errors.deleteFailed"),
          );
          toast({
            variant: "error",
            title: t("products.errors.deleteFailed"),
            description: translateProductErrorCode(
              apiError.code,
              apiError.message,
              t,
            ),
          });
        },
      });
    } else {
      const ids = target.ids;
      const participants = findProductsInLists(qc, ids);
      bulkDelete.mutate(
        { ids },
        {
          onSuccess: (result) => {
            handleBulkResult({
              action: "delete",
              ids,
              participants,
              result,
              successMessage: t("products.success.bulkDeleted", {
                count: result.success.length,
              }),
            });
            closeDeleteModal();
          },
          onError: (error) => {
            const apiError = toApiError(
              error,
              t("products.errors.deleteFailed"),
            );
            toast({
              variant: "error",
              title: t("products.errors.deleteFailed"),
              description: translateProductErrorCode(
                apiError.code,
                apiError.message,
                t,
              ),
            });
          },
        },
      );
    }
  };

  const handleBulkResult = ({
    action,
    participants,
    result,
    successMessage,
  }: {
    action: BulkActionKind;
    ids: string[];
    participants: PublicProduct[];
    result: BulkResult;
    successMessage: string;
  }) => {
    setSelectedIds((prev) => reconcileSelectionAfterBulk(prev, result));

    const payload: BulkResultPayload = { result, action, participants };

    if (result.failed.length === 0) {
      toast({ variant: "success", title: successMessage });
      return;
    }
    setBulkResult(payload);
    toast({
      variant: "warning",
      title: t("products.errors.bulkPartial", {
        ok: result.success.length,
        failed: result.failed.length,
      }),
      durationMs: 8_000,
      action: {
        label: t("common.confirm"),
        onClick: () => setBulkResult(payload),
      },
    });
  };

  const onRetryFailed = (failedIds: string[]) => {
    if (!bulkResult) return;
    if (bulkResult.action === "delete") {
      setBulkResult(null);
      openDeleteModal({
        mode: "bulk",
        ids: failedIds,
        total: failedIds.length,
      });
    } else {
      setBulkResult(null);
      openStatusModal({
        mode: "bulk",
        ids: failedIds,
        total: failedIds.length,
      });
    }
  };

  const onRowChangeStatus = (product: PublicProduct) =>
    openStatusModal({ mode: "single", product });
  const onRowDelete = (product: PublicProduct) =>
    openDeleteModal({ mode: "single", product });

  const bulkChangeStatusClick = () => {
    if (selectedIds.size === 0) return;
    openStatusModal({
      mode: "bulk",
      ids: Array.from(selectedIds),
      total: selectedIds.size,
    });
  };
  const bulkDeleteClick = () => {
    if (selectedIds.size === 0) return;
    openDeleteModal({
      mode: "bulk",
      ids: Array.from(selectedIds),
      total: selectedIds.size,
    });
  };

  const isBulkPending = bulkDelete.isPending || bulkStatus.isPending;

  const closeBulkResult = () => setBulkResult(null);

  const statusModalTarget = statusModal.open ? statusModal.target : null;
  const statusPending =
    (statusModalTarget?.mode === "single" && changeStatusOne.isPending) ||
    (statusModalTarget?.mode === "bulk" && bulkStatus.isPending);

  const deleteModalTarget = deleteModal.open ? deleteModal.target : null;
  const deletePending =
    (deleteModalTarget?.mode === "single" && deleteOne.isPending) ||
    (deleteModalTarget?.mode === "bulk" && bulkDelete.isPending);

  const auditTargetSku = (() => {
    if (!auditDrawer.productId) return null;
    if (auditDrawer.productSku) return auditDrawer.productSku;
    return findProductInLists(qc, auditDrawer.productId)?.sku ?? null;
  })();

  return (
    <AppLayout>
      <div className="flex flex-col gap-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {t("products.title")}
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {t("products.subtitle")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ExportMenu
              filterQuery={query}
              selectedProducts={selectedProducts}
              disabled={productsQuery.isLoading}
              onError={(message) =>
                toast({ variant: "error", title: message })
              }
              onSuccess={(message) =>
                toast({ variant: "success", title: message })
              }
            />
            <Link to={paths.productNew}>
              <Button variant="primary">{t("products.createCta")}</Button>
            </Link>
          </div>
        </header>

        <ProductsFilters
          value={filtersValue}
          onChange={onFiltersChange}
          onClear={onFiltersClear}
        />

        <BulkActionsBar
          count={selectedIds.size}
          onChangeStatus={bulkChangeStatusClick}
          onDelete={bulkDeleteClick}
          onClear={clearSelection}
          disabled={isBulkPending}
        />

        <ProductsTable
          items={items}
          isLoading={productsQuery.isLoading || productsQuery.isFetching}
          isError={productsQuery.isError}
          onRetry={() => void productsQuery.refetch()}
          selectedIds={selectedIds}
          onToggleOne={toggleOne}
          onToggleAll={toggleAll}
          onChangeStatus={onRowChangeStatus}
          onDelete={onRowDelete}
          onViewAudit={openAudit}
        />

        <Pagination
          page={page}
          limit={limit}
          total={total}
          totalPages={totalPages}
          onPageChange={onPageChange}
          onLimitChange={onLimitChange}
          disabled={productsQuery.isLoading}
        />
      </div>

      <StatusChangeModal
        open={statusModal.open}
        target={statusModalTarget}
        pending={statusPending}
        serverError={statusServerError}
        onCancel={closeStatusModal}
        onSubmit={submitStatusChange}
      />

      <DeleteConfirmModal
        open={deleteModal.open}
        target={deleteModalTarget}
        pending={deletePending}
        onCancel={closeDeleteModal}
        onConfirm={submitDelete}
      />

      <BulkResultModal
        open={Boolean(bulkResult)}
        payload={bulkResult}
        onClose={closeBulkResult}
        onRetry={onRetryFailed}
      />

      <AuditLogDrawer
        open={auditDrawer.open}
        productId={auditDrawer.productId}
        productSku={auditTargetSku}
        onClose={closeAudit}
      />
    </AppLayout>
  );
}
