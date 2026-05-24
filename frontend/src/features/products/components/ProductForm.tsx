import { useState, type FormEventHandler } from "react";
import {
  Controller,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Alert } from "../../../components/ui/Alert";
import { Button } from "../../../components/ui/Button";
import { SubmitButton } from "../../../components/ui/SubmitButton";
import { TextField } from "../../../components/ui/TextField";
import { paths } from "../../../routes/paths";
import type { ProductFormValues } from "../lib/productSchema";
import {
  PRODUCT_STATUS_VALUES,
  ProductStatus,
  type ProductStatusValue,
} from "../types";
import { ImageDropzone, type ImageDropzoneValue } from "./ImageDropzone";

export type ProductFormMode = "create" | "edit";

interface ProductFormProps {
  register: UseFormRegister<ProductFormValues>;
  control: Control<ProductFormValues>;
  errors: FieldErrors<ProductFormValues>;
  status: ProductStatusValue;
  image: ImageDropzoneValue;
  onImageChange: (next: ImageDropzoneValue) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  submitting: boolean;
  uploading: boolean;
  serverError: string | null;
  // "create" is the default and renders the original new-product flow.
  // "edit" hides the status select (status changes are a separate, audited
  // action) and uses edit-flavored submit/cancel labels. The cancel button
  // still falls back to a Link to /products unless `onCancel` is provided.
  mode?: ProductFormMode;
  onCancel?: () => void;
  // When the parent already opens the advanced section by default (e.g. an
  // edit page that wants the customer/image fields visible), this overrides
  // the default collapsed state.
  defaultAdvancedOpen?: boolean;
}

export function ProductForm({
  register,
  control,
  errors,
  status,
  image,
  onImageChange,
  onSubmit,
  submitting,
  uploading,
  serverError,
  mode = "create",
  onCancel,
  defaultAdvancedOpen,
}: ProductFormProps) {
  const { t } = useTranslation();
  const isEdit = mode === "edit";
  // Edit mode keeps the optional fields visible by default so users don't
  // have to discover the toggle to change a customer ID or image.
  const [advancedOpen, setAdvancedOpen] = useState(
    defaultAdvancedOpen ?? isEdit,
  );

  const needsCustomer = status >= ProductStatus.AssignedToCustomer;
  const needsImage = status >= ProductStatus.ReadyForDelivery;

  const onAdvancedToggle = () => {
    setAdvancedOpen((current) => !current);
  };

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-5"
      aria-busy={submitting || uploading}
    >
      {serverError ? (
        <Alert variant="error" title={t("common.error")}>
          {serverError}
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          label={t("products.create.fields.name")}
          placeholder={t("products.create.placeholders.name")}
          autoComplete="off"
          error={errors.name?.message}
          {...register("name")}
        />
        <TextField
          label={t("products.create.fields.sku")}
          placeholder={t("products.create.placeholders.sku")}
          autoComplete="off"
          error={errors.sku?.message}
          {...register("sku")}
        />
        <TextField
          label={t("products.create.fields.macAddress")}
          placeholder={t("products.create.placeholders.macAddress")}
          autoComplete="off"
          inputMode="text"
          error={errors.macAddress?.message}
          {...register("macAddress")}
        />
        <TextField
          label={t("products.create.fields.imei")}
          placeholder={t("products.create.placeholders.imei")}
          autoComplete="off"
          inputMode="numeric"
          error={errors.imei?.message}
          {...register("imei")}
        />
      </div>

      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 sm:gap-4">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {t("products.create.hints.skuUpper")}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {t("products.create.hints.macFormat")}
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 dark:border-zinc-800 dark:bg-zinc-900/50">
        <button
          type="button"
          onClick={onAdvancedToggle}
          aria-expanded={advancedOpen}
          aria-controls="product-create-advanced"
          className="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-start text-sm font-medium text-zinc-800 transition hover:bg-zinc-100/70 dark:text-zinc-100 dark:hover:bg-zinc-800/50"
        >
          <span>
            {advancedOpen
              ? t("products.create.advanced.toggleHide")
              : t("products.create.advanced.toggleShow")}
          </span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={`h-4 w-4 transition-transform ${advancedOpen ? "rotate-180" : ""}`}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {advancedOpen ? (
          <div
            id="product-create-advanced"
            className="flex flex-col gap-4 border-t border-zinc-200 px-4 py-4 dark:border-zinc-800"
          >
            {isEdit ? null : (
              <Controller
                control={control}
                name="status"
                render={({ field, fieldState }) => (
                  <label className="flex flex-col gap-1.5 text-sm">
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                      {t("products.create.fields.status")}
                    </span>
                    <select
                      value={field.value}
                      onChange={(event) =>
                        field.onChange(
                          Number(event.target.value) as ProductStatusValue,
                        )
                      }
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/30 dark:border-zinc-700 dark:bg-zinc-950"
                    >
                      {PRODUCT_STATUS_VALUES.map((s) => (
                        <option key={s} value={s}>
                          {s}. {t(`products.status.${s}`)}
                        </option>
                      ))}
                    </select>
                    {fieldState.error?.message ? (
                      <p className="text-xs text-red-600 dark:text-red-400">
                        {fieldState.error.message}
                      </p>
                    ) : null}
                  </label>
                )}
              />
            )}

            <div className="flex flex-col gap-1.5">
              <TextField
                label={t("products.create.fields.customerId")}
                required={needsCustomer}
                requiredTooltip={t("products.create.hints.customerRequired")}
                placeholder={t("products.create.placeholders.customerId")}
                autoComplete="off"
                error={errors.customerId?.message}
                {...register("customerId")}
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {t("products.create.hints.customerRequired")}
              </p>
            </div>

            <Controller
              control={control}
              name="imageUrl"
              render={({ fieldState }) => (
                <ImageDropzone
                  value={image}
                  onChange={onImageChange}
                  uploading={uploading}
                  disabled={submitting}
                  error={fieldState.error?.message}
                  label={t("products.create.fields.image")}
                  hint={t("products.create.hints.imageRequired")}
                  required={needsImage}
                  requiredTooltip={t("products.create.hints.imageRequired")}
                />
              )}
            />
          </div>
        ) : null}
      </div>

      <div className="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
        {onCancel ? (
          <Button
            type="button"
            variant="secondary"
            disabled={submitting || uploading}
            onClick={onCancel}
            className="w-full sm:w-auto"
          >
            {isEdit
              ? t("products.detail.edit.cancel")
              : t("products.create.cancel")}
          </Button>
        ) : (
          <Link to={paths.products} className="sm:w-auto">
            <Button
              type="button"
              variant="secondary"
              disabled={submitting || uploading}
              className="w-full sm:w-auto"
            >
              {t("products.create.cancel")}
            </Button>
          </Link>
        )}
        <div className="sm:w-auto sm:min-w-[12rem]">
          <SubmitButton
            loading={submitting || uploading}
            loadingLabel={
              uploading
                ? t("products.create.image.uploading")
                : isEdit
                  ? t("products.detail.edit.saving")
                  : t("products.create.submitting")
            }
          >
            {isEdit
              ? t("products.detail.edit.save")
              : t("products.create.submit")}
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
