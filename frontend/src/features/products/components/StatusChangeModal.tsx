import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Alert } from "../../../components/ui/Alert";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { useAdmin } from "../../../contexts/AdminContext";
import { toApiError } from "../../../lib/api";
import { paths } from "../../../routes/paths";
import { translateProductErrorCode } from "../lib/errors";
import {
  PRODUCT_STATUS_VALUES,
  ProductStatus,
  type ProductStatusValue,
  type PublicProduct,
} from "../types";
import { StatusBadge } from "./StatusBadge";

export type StatusChangeTarget =
  | { mode: "single"; product: PublicProduct }
  | { mode: "bulk"; ids: string[]; total: number };

type StatusChangeModalProps = {
  open: boolean;
  target: StatusChangeTarget | null;
  pending: boolean;
  serverError: unknown | null;
  onCancel: () => void;
  onSubmit: (status: ProductStatusValue, reason: string | undefined) => void;
};

export function StatusChangeModal({
  open,
  target,
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

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus(initialStatus);
      setReason("");
    }
  }, [open, initialStatus]);

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

  const warnings = collectWarnings({
    mode: target.mode,
    product: target.mode === "single" ? target.product : null,
    targetStatus: status,
    isEffectiveAdmin,
  });

  const apiError = serverError
    ? toApiError(serverError, t("products.errors.statusChangeFailed"))
    : null;
  const errorMessage = apiError
    ? translateProductErrorCode(apiError.code, apiError.message, t)
    : null;

  const submitDisabled = pending || isNoChange;

  return (
    <Modal
      open={open}
      onClose={pending ? () => undefined : onCancel}
      title={title}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={pending}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="primary"
            onClick={() => onSubmit(status, reason.trim() || undefined)}
            loading={pending}
            disabled={submitDisabled}
          >
            {pending
              ? t("products.statusModal.submitting")
              : t("products.statusModal.submit")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {target.mode === "single" && currentStatus ? (
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
              setStatus(Number(event.target.value) as ProductStatusValue)
            }
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
            placeholder={t("products.statusModal.reasonPlaceholder")}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/30 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>

        {target.mode === "bulk" ? (
          <Alert variant="success">{t("products.statusModal.bulkNote")}</Alert>
        ) : null}

        {warnings.map((warning) => (
          <Alert key={warning.kind} variant="error" title={t("common.error")}>
            <div className="flex flex-col gap-1">
              <span>{t(`products.statusModal.warnings.${warning.kind}`)}</span>
              {warning.linkTo ? (
                <Link
                  to={warning.linkTo}
                  className="text-xs font-medium underline-offset-2 hover:underline"
                >
                  {t("products.statusModal.editProductCta")}
                </Link>
              ) : null}
            </div>
          </Alert>
        ))}

        {errorMessage ? (
          <Alert variant="error" title={t("common.error")}>
            {errorMessage}
          </Alert>
        ) : null}
      </div>
    </Modal>
  );
}

type Warning = {
  kind: "customerMissing" | "imageMissing" | "demotion";
  linkTo?: string;
};

function collectWarnings(input: {
  mode: "single" | "bulk";
  product: PublicProduct | null;
  targetStatus: ProductStatusValue;
  isEffectiveAdmin: boolean;
}): Warning[] {
  const out: Warning[] = [];
  const { mode, product, targetStatus, isEffectiveAdmin } = input;

  if (mode === "single" && product) {
    if (
      targetStatus >= ProductStatus.AssignedToCustomer &&
      !product.customerId
    ) {
      out.push({
        kind: "customerMissing",
        linkTo: paths.productDetail(product.id),
      });
    }
    if (
      targetStatus >= ProductStatus.ReadyForDelivery &&
      !product.imageUrl
    ) {
      out.push({
        kind: "imageMissing",
        linkTo: paths.productDetail(product.id),
      });
    }
    if (
      product.status === ProductStatus.Delivered &&
      targetStatus < ProductStatus.Delivered &&
      !isEffectiveAdmin
    ) {
      out.push({ kind: "demotion" });
    }
  } else if (mode === "bulk") {
    if (
      targetStatus < ProductStatus.Delivered &&
      targetStatus !== ProductStatus.Delivered &&
      !isEffectiveAdmin
    ) {
      // Cannot know upfront, but warn the operator that mixed batches with
      // currently-Delivered items will need admin.
    }
  }

  return out;
}
