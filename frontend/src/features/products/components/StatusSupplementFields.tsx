import { useTranslation } from "react-i18next";
import { TextField } from "../../../components/ui/TextField";
import type { ProductSupplement, StatusGaps } from "../lib/statusRequirements";
import { ImageDropzone } from "./ImageDropzone";

type StatusSupplementFieldsProps = {
  productId: string;
  gaps: StatusGaps;
  supplement: ProductSupplement;
  onSupplementChange: (next: ProductSupplement) => void;
  disabled?: boolean;
  uploading?: boolean;
};

export function StatusSupplementFields({
  productId,
  gaps,
  supplement,
  onSupplementChange,
  disabled = false,
  uploading = false,
}: StatusSupplementFieldsProps) {
  const { t } = useTranslation();

  if (!gaps.needsCustomer && !gaps.needsImage) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      {gaps.needsCustomer ? (
        <TextField
          name={`status-supplement-customer-${productId}`}
          label={t("products.create.fields.customerId")}
          required
          requiredTooltip={t("products.create.hints.customerRequired")}
          placeholder={t("products.create.placeholders.customerId")}
          autoComplete="off"
          value={supplement.customerId}
          onChange={(event) =>
            onSupplementChange({
              ...supplement,
              customerId: event.target.value,
            })
          }
          disabled={disabled || uploading}
        />
      ) : null}
      {gaps.needsImage ? (
        <ImageDropzone
          value={supplement.image}
          onChange={(image) => onSupplementChange({ ...supplement, image })}
          uploading={uploading}
          disabled={disabled}
          label={t("products.create.fields.image")}
          hint={t("products.create.hints.imageRequired")}
          required
          requiredTooltip={t("products.create.hints.imageRequired")}
        />
      ) : null}
    </div>
  );
}
