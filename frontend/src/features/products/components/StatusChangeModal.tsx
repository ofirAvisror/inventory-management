import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "../../../components/ui/Alert";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { useAdmin } from "../../../contexts/AdminContext";
import { toApiError } from "../../../lib/api";
import { translateProductErrorCode } from "../lib/errors";
import {
  buildInitialSupplements,
  canSubmitStatusChange,
  countIncompleteProducts,
  countProductsNeedingDetails,
  emptySupplement,
  getStatusGaps,
  hasAnyGap,
  isDemotionBlocked,
  type ProductSupplement,
  type StatusChangeSubmitPayload,
} from "../lib/statusRequirements";
import {
  PRODUCT_STATUS_VALUES,
  ProductStatus,
  type ProductStatusValue,
  type PublicProduct,
} from "../types";
import { StatusBadge } from "./StatusBadge";
import { StatusChangeProductRow } from "./StatusChangeProductRow";
import { StatusSupplementFields } from "./StatusSupplementFields";

export type StatusChangeTarget =
  | { mode: "single"; product: PublicProduct }
  | { mode: "bulk"; ids: string[]; total: number };

type StatusChangeModalProps = {
  open: boolean;
  target: StatusChangeTarget | null;
  products: PublicProduct[];
  pending: boolean;
  serverError: unknown | null;
  onCancel: () => void;
  onSubmit: (payload: StatusChangeSubmitPayload) => void;
};

export function StatusChangeModal({
  open,
  target,
  products,
  pending,
  serverError,
  onCancel,
  onSubmit,
}: StatusChangeModalProps) {
  const { t } = useTranslation();
  const { isEffectiveAdmin } = useAdmin();

  const initialStatus = useMemo<ProductStatusValue>(() => {
    if (target?.mode === "single") {
      const current = target.product.status;
      const next = PRODUCT_STATUS_VALUES.find((s) => s !== current);
      return next ?? current;
    }
    return ProductStatus.StockIn;
  }, [target]);

  const [status, setStatus] = useState<ProductStatusValue>(initialStatus);
  const [reason, setReason] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [supplements, setSupplements] = useState<
    Record<string, ProductSupplement>
  >({});

  const prevOpenRef = useRef(false);

  useEffect(() => {
    const justOpened = open && !prevOpenRef.current;
    prevOpenRef.current = open;
    if (!justOpened) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus(initialStatus);
    setReason("");
    setExpandedId(null);
    setSupplements(buildInitialSupplements(products, initialStatus));
  }, [open, initialStatus, products]);

  const handleStatusChange = (nextStatus: ProductStatusValue) => {
    setStatus(nextStatus);
    setSupplements(buildInitialSupplements(products, nextStatus));
    const firstIncomplete = products.find((p) => {
      const gaps = getStatusGaps(p, nextStatus);
      return hasAnyGap(gaps);
    });
    setExpandedId(firstIncomplete?.id ?? null);
  };

  if (!target) {
    return (
      <Modal open={open} onClose={onCancel}>
        <p />
      </Modal>
    );
  }

  const title =
    target.mode === "single"
      ? t("products.statusModal.singleTitle")
      : t("products.statusModal.bulkTitle", { count: target.total });

  const currentStatus =
    target.mode === "single" ? target.product.status : null;
  const isNoChange =
    target.mode === "single" && currentStatus === status;

  const demotionBlocked = isDemotionBlocked(
    products,
    status,
    isEffectiveAdmin,
  );

  const needsDetailsCount = countProductsNeedingDetails(products, status);
  const incompleteCount = countIncompleteProducts(products, status, supplements);

  const isSingle = target.mode === "single";
  const singleProduct = isSingle ? target.product : null;
  const singleGaps = singleProduct
    ? getStatusGaps(singleProduct, status)
    : null;
  const singleHasGaps = singleGaps ? hasAnyGap(singleGaps) : false;
  const singleSupplement = singleProduct
    ? (supplements[singleProduct.id] ?? emptySupplement())
    : emptySupplement();

  const submitDisabled =
    pending ||
    !canSubmitStatusChange({
      products,
      targetStatus: status,
      supplements,
      isNoChange,
      demotionBlocked,
    });

  const apiError = serverError
    ? toApiError(serverError, t("products.errors.statusChangeFailed"))
    : null;
  const errorMessage = apiError
    ? translateProductErrorCode(apiError.code, apiError.message, t)
    : null;

  const handleSubmit = () => {
    onSubmit({
      status,
      reason: reason.trim() || undefined,
      supplements,
    });
  };

  const updateSupplement = (id: string, next: ProductSupplement) => {
    setSupplements((current) => ({ ...current, [id]: next }));
  };

  const showBulkSummary = !isSingle && needsDetailsCount > 0;
  const showBulkProductList = !isSingle && products.length > 0;

  return (
    <Modal
      open={open}
      onClose={pending ? () => undefined : onCancel}
      title={title}
      size="lg"
      footer={
        <>
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={pending}
            className="w-full sm:w-auto"
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={pending}
            disabled={submitDisabled}
            className="w-full sm:w-auto"
          >
            {pending
              ? t("products.statusModal.submitting")
              : t("products.statusModal.submit")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {isSingle && currentStatus ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">
              {t("products.statusModal.currentLabel")}:
            </span>
            <StatusBadge status={currentStatus} />
          </div>
        ) : null}

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {t("products.statusModal.targetLabel")}
          </span>
          <select
            value={status}
            onChange={(event) =>
              handleStatusChange(
                Number(event.target.value) as ProductStatusValue,
              )
            }
            disabled={pending}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/30 dark:border-zinc-700 dark:bg-zinc-950"
          >
            {PRODUCT_STATUS_VALUES.map((s) => (
              <option key={s} value={s}>
                {s}. {t(`products.status.${s}`)}
              </option>
            ))}
          </select>
        </label>

        {isNoChange ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {t("products.statusModal.noChange")}
          </p>
        ) : null}

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {t("products.statusModal.reasonLabel")}
          </span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            maxLength={500}
            disabled={pending}
            placeholder={t("products.statusModal.reasonPlaceholder")}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/30 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>

        {isSingle && singleProduct && singleHasGaps && singleGaps ? (
          <StatusSupplementFields
            productId={singleProduct.id}
            gaps={singleGaps}
            supplement={singleSupplement}
            onSupplementChange={(next) =>
              updateSupplement(singleProduct.id, next)
            }
            disabled={pending}
          />
        ) : null}

        {showBulkSummary ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {t("products.statusModal.summaryNeedsCompletion", {
              incomplete: incompleteCount,
              total: needsDetailsCount,
            })}
          </p>
        ) : null}

        {showBulkProductList ? (
          <div className="flex flex-col gap-2">
            {products.map((product) => {
              const gaps = getStatusGaps(product, status);
              const supplement = supplements[product.id] ?? emptySupplement();
              const isExpanded = expandedId === product.id;
              return (
                <StatusChangeProductRow
                  key={product.id}
                  product={product}
                  gaps={gaps}
                  supplement={supplement}
                  onSupplementChange={(next) =>
                    updateSupplement(product.id, next)
                  }
                  expanded={isExpanded}
                  onToggle={() =>
                    setExpandedId((current) =>
                      current === product.id ? null : product.id,
                    )
                  }
                  disabled={pending}
                />
              );
            })}
          </div>
        ) : null}

        {target.mode === "bulk" ? (
          <Alert variant="success">{t("products.statusModal.bulkNote")}</Alert>
        ) : null}

        {demotionBlocked ? (
          <Alert variant="error" title={t("common.error")}>
            {t("products.statusModal.warnings.demotion")}
          </Alert>
        ) : null}

        {errorMessage ? (
          <Alert variant="error" title={t("common.error")}>
            {errorMessage}
          </Alert>
        ) : null}
      </div>
    </Modal>
  );
}
