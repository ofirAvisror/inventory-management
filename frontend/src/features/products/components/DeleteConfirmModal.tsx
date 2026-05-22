import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import type { PublicProduct } from "../types";

export type DeleteTarget =
  | { mode: "single"; product: PublicProduct }
  | { mode: "bulk"; ids: string[]; total: number };

type DeleteConfirmModalProps = {
  open: boolean;
  target: DeleteTarget | null;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

const TYPE_TO_CONFIRM_THRESHOLD = 5;

export function DeleteConfirmModal({
  open,
  target,
  pending,
  onCancel,
  onConfirm,
}: DeleteConfirmModalProps) {
  const { t } = useTranslation();
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTyped("");
    }
  }, [open]);

  if (!target) {
    return (
      <Modal open={open} onClose={onCancel} title={t("products.deleteModal.singleTitle")}>
        <p />
      </Modal>
    );
  }

  const title =
    target.mode === "single"
      ? t("products.deleteModal.singleTitle")
      : t("products.deleteModal.bulkTitle", { count: target.total });
  const body =
    target.mode === "single"
      ? t("products.deleteModal.singleBody", { name: target.product.name })
      : t("products.deleteModal.bulkBody", { count: target.total });

  const needsTypeConfirm =
    target.mode === "bulk" && target.total >= TYPE_TO_CONFIRM_THRESHOLD;
  const typeConfirmed = !needsTypeConfirm || typed.trim().toUpperCase() === "DELETE";
  const disabled = pending || !typeConfirmed;

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
            variant="danger"
            onClick={onConfirm}
            loading={pending}
            disabled={disabled}
          >
            {pending
              ? t("products.deleteModal.submitting")
              : t("products.deleteModal.submit")}
          </Button>
        </>
      }
    >
      <p className="text-sm text-zinc-700 dark:text-zinc-300">{body}</p>

      {needsTypeConfirm ? (
        <label className="mt-4 flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {t("products.deleteModal.confirmTypeLabel")}
          </span>
          <input
            type="text"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoFocus
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm font-mono uppercase tracking-wider shadow-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 dark:border-zinc-700 dark:bg-zinc-950"
            placeholder="DELETE"
          />
        </label>
      ) : null}
    </Modal>
  );
}
