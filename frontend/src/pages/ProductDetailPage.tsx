import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "../components/layout/AppLayout";
import { Alert } from "../components/ui/Alert";
import { Button } from "../components/ui/Button";
import { Spinner } from "../components/ui/FullPageSpinner";
import { useToast } from "../contexts/ToastContext";
import {
  productKeys,
  uploadProductImage,
  type UpdateProductInput,
} from "../features/products/api";
import { AuditLogList } from "../features/products/components/AuditLogList";
import type { ImageDropzoneValue } from "../features/products/components/ImageDropzone";
import { ProductForm } from "../features/products/components/ProductForm";
import { StatusBadge } from "../features/products/components/StatusBadge";
import {
  StatusChangeModal,
  type StatusChangeTarget,
} from "../features/products/components/StatusChangeModal";
import {
  useChangeStatusMutation,
  useUpdateProductMutation,
  useUploadProductImageMutation,
} from "../features/products/hooks/useProductMutations";
import { useProductQuery } from "../features/products/hooks/useProductQuery";
import { handleProductFormError } from "../features/products/lib/createErrorMapping";
import {
  buildProductFormSchema,
  type ProductFormValues,
} from "../features/products/lib/productSchema";
import {
  hasAnyGap,
  getStatusGaps,
  type StatusChangeSubmitPayload,
} from "../features/products/lib/statusRequirements";
import { type PublicProduct } from "../features/products/types";
import { toApiError } from "../lib/api";
import { paths } from "../routes/paths";

type Mode = "view" | "edit";

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const productQuery = useProductQuery(id);

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <BackLink />
        <ProductDetailContent
          id={id ?? null}
          isLoading={productQuery.isLoading}
          isError={productQuery.isError}
          error={productQuery.error}
          product={productQuery.data ?? null}
          onRetry={() => void productQuery.refetch()}
        />
      </div>
    </AppLayout>
  );
}

function BackLink() {
  const { t } = useTranslation();
  return (
    <Link
      to={paths.products}
      className="inline-block text-xs font-medium text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
    >
      {t("products.detail.back")}
    </Link>
  );
}

interface ProductDetailContentProps {
  id: string | null;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  product: PublicProduct | null;
  onRetry: () => void;
}

function ProductDetailContent({
  id,
  isLoading,
  isError,
  error,
  product,
  onRetry,
}: ProductDetailContentProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (isError) {
    const apiError = toApiError(error, t("products.detail.loadErrorBody"));
    const isNotFound = apiError.status === 404 || apiError.code === "NOT_FOUND";
    return (
      <Alert
        variant="error"
        title={
          isNotFound
            ? t("products.detail.notFoundTitle")
            : t("products.detail.loadErrorTitle")
        }
      >
        <p className="mb-3">
          {isNotFound
            ? t("products.detail.notFoundBody")
            : t("products.detail.loadErrorBody")}
        </p>
        {!isNotFound ? (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            {t("products.detail.retry")}
          </Button>
        ) : null}
      </Alert>
    );
  }

  if (!product || !id) {
    return null;
  }

  return <ProductDetailLoaded product={product} id={id} />;
}

function ProductDetailLoaded({
  product,
  id,
}: {
  product: PublicProduct;
  id: string;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [mode, setMode] = useState<Mode>("view");

  // Status change modal state. Audit log refetches once the change settles.
  const [statusModalTarget, setStatusModalTarget] =
    useState<StatusChangeTarget | null>(null);
  const [statusServerError, setStatusServerError] = useState<unknown>(null);
  const [statusPreparing, setStatusPreparing] = useState(false);
  const changeStatusMutation = useChangeStatusMutation();

  const openStatusModal = () => {
    setStatusServerError(null);
    setStatusModalTarget({ mode: "single", product });
  };
  const closeStatusModal = () => {
    setStatusModalTarget(null);
    setStatusServerError(null);
  };

  const submitStatusChange = async (payload: StatusChangeSubmitPayload) => {
    setStatusServerError(null);
    const gaps = getStatusGaps(product, payload.status);
    const supplement = payload.supplements[product.id];

    let customerId: string | undefined;
    let imageUrl: string | undefined;

    if (hasAnyGap(gaps) && supplement) {
      // Uploading the staged file mirrors the list-page flow: the upload
      // happens BEFORE calling PATCH /status so the file is durable in storage
      // by the time the status mutation runs (we don't want a half-applied
      // state where status changed but the image upload errored out).
      if (gaps.needsImage && supplement.image.file && !supplement.image.url) {
        setStatusPreparing(true);
        try {
          const uploaded = await uploadProductImage(supplement.image.file);
          imageUrl = uploaded.url;
        } catch (uploadError) {
          setStatusServerError(uploadError);
          setStatusPreparing(false);
          return;
        } finally {
          setStatusPreparing(false);
        }
      } else if (gaps.needsImage) {
        imageUrl = supplement.image.url ?? undefined;
      }
      if (gaps.needsCustomer) {
        customerId = supplement.customerId.trim() || undefined;
      }
    }

    changeStatusMutation.mutate(
      {
        id: product.id,
        status: payload.status,
        reason: payload.reason,
        customerId,
        imageUrl,
        previousStatus: product.status,
        previousStatusLabel: product.statusLabel,
      },
      {
        onSuccess: () => {
          toast({
            variant: "success",
            title: t("products.success.statusChanged"),
          });
          // The mutation invalidates lists; we also need the detail page and
          // the inline audit log to reflect the new status immediately.
          void qc.invalidateQueries({ queryKey: productKeys.detail(id) });
          void qc.invalidateQueries({ queryKey: productKeys.audit(id) });
          closeStatusModal();
        },
        onError: (err) => setStatusServerError(err),
      },
    );
  };

  return (
    <>
      <DetailHeader product={product} onChangeStatus={openStatusModal} />

      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {mode === "view" ? (
          <ProductReadOnly
            product={product}
            onEdit={() => setMode("edit")}
          />
        ) : (
          <ProductEditCard
            product={product}
            onCancel={() => setMode("view")}
            onSaved={() => setMode("view")}
          />
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-7">
        <header className="mb-4 flex flex-col gap-0.5">
          <h2 className="text-lg font-semibold">
            {t("products.detail.auditTitle")}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {t("products.detail.auditSubtitle")}
          </p>
        </header>
        <AuditLogList productId={id} enabled />
      </section>

      <StatusChangeModal
        open={Boolean(statusModalTarget)}
        target={statusModalTarget}
        products={statusModalTarget ? [product] : []}
        pending={statusPreparing || changeStatusMutation.isPending}
        serverError={statusServerError}
        onCancel={closeStatusModal}
        onSubmit={submitStatusChange}
      />
    </>
  );
}

function DetailHeader({
  product,
  onChangeStatus,
}: {
  product: PublicProduct;
  onChangeStatus: () => void;
}) {
  const { t } = useTranslation();
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">
          {product.name}
        </h1>
        <p className="mt-1 truncate text-sm text-zinc-600 dark:text-zinc-400">
          <span className="font-mono">{product.sku}</span>
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={product.status} />
        <Button variant="secondary" size="sm" onClick={onChangeStatus}>
          {t("products.detail.changeStatusCta")}
        </Button>
      </div>
    </header>
  );
}

function ProductReadOnly({
  product,
  onEdit,
}: {
  product: PublicProduct;
  onEdit: () => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "he" ? "he-IL" : "en-US";
  const empty = t("products.detail.empty");
  const formatDate = (value: string | null) =>
    value ? new Date(value).toLocaleString(lang) : empty;

  return (
    <div className="flex flex-col gap-5 p-5 sm:p-7">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold">
          {t("products.detail.title")}
        </h2>
        <Button variant="primary" size="sm" onClick={onEdit}>
          {t("products.detail.editCta")}
        </Button>
      </div>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        <Field label={t("products.create.fields.name")} value={product.name} />
        <Field
          label={t("products.create.fields.sku")}
          value={product.sku}
          mono
        />
        <Field
          label={t("products.create.fields.macAddress")}
          value={product.macAddress}
          mono
        />
        <Field
          label={t("products.create.fields.imei")}
          value={product.imei ?? empty}
          mono={Boolean(product.imei)}
        />
        <Field
          label={t("products.create.fields.customerId")}
          value={product.customerId ?? empty}
        />
        <Field
          label={t("products.detail.createdAt")}
          value={formatDate(product.createdAt)}
        />
        <Field
          label={t("products.detail.updatedAt")}
          value={formatDate(product.updatedAt)}
        />
      </dl>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {t("products.create.fields.image")}
        </span>
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="max-h-64 w-full rounded-lg border border-zinc-200 object-contain dark:border-zinc-800"
          />
        ) : (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-zinc-300 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            {t("products.detail.noImage")}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </dt>
      <dd
        className={`break-words text-sm text-zinc-900 dark:text-zinc-100 ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function ProductEditCard({
  product,
  onCancel,
  onSaved,
}: {
  product: PublicProduct;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const schema = useMemo(() => buildProductFormSchema(t), [t]);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    clearErrors,
    reset,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormDefaults(product),
  });

  // Reset whenever the underlying product changes (e.g. after a successful
  // save populates the cache with the freshly-saved fields). Without this
  // the form would keep showing the values the user typed before save.
  useEffect(() => {
    reset(toFormDefaults(product));
  }, [product, reset]);

  const [image, setImage] = useState<ImageDropzoneValue>({
    file: null,
    url: product.imageUrl,
  });
  const [serverError, setServerError] = useState<string | null>(null);

  const updateMutation = useUpdateProductMutation();
  const uploadMutation = useUploadProductImageMutation();

  const status = useWatch({ control, name: "status" });

  const handleImageChange = (next: ImageDropzoneValue) => {
    setImage(next);
    setValue("imageUrl", next.url ?? "", { shouldValidate: false });
    clearErrors("imageUrl");
  };

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      let imageUrl: string | null = image.url ?? null;
      if (image.file && !image.url) {
        try {
          const uploaded = await uploadMutation.mutateAsync(image.file);
          imageUrl = uploaded.url;
          setImage({ file: image.file, url: uploaded.url });
          setValue("imageUrl", uploaded.url, { shouldValidate: false });
        } catch (uploadError) {
          const mapped = handleProductFormError(
            uploadError,
            setError,
            t,
            "products.detail.edit.errors.submitFailed",
          );
          setServerError(mapped.topLevelMessage);
          return;
        }
      }

      const trimmedImei = values.imei.trim();
      const trimmedCustomer = values.customerId.trim();
      const trimmedImage = (imageUrl ?? values.imageUrl).trim();

      // Send explicit `null` for cleared optional fields so the backend
      // actually unsets them. Status is intentionally omitted — it has its
      // own dedicated PATCH endpoint with audit logging.
      const input: UpdateProductInput = {
        name: values.name.trim(),
        sku: values.sku.trim().toUpperCase(),
        macAddress: values.macAddress
          .trim()
          .toUpperCase()
          .replace(/-/g, ":"),
        imei: trimmedImei.length > 0 ? trimmedImei : null,
        customerId: trimmedCustomer.length > 0 ? trimmedCustomer : null,
        imageUrl: trimmedImage.length > 0 ? trimmedImage : null,
      };

      const saved = await updateMutation.mutateAsync({
        id: product.id,
        input,
      });

      toast({
        variant: "success",
        title: t("products.detail.edit.success.title"),
        description: t("products.detail.edit.success.description", {
          name: saved.name,
        }),
      });
      onSaved();
    } catch (error) {
      const mapped = handleProductFormError(
        error,
        setError,
        t,
        "products.detail.edit.errors.submitFailed",
      );
      setServerError(mapped.topLevelMessage);
    }
  });

  return (
    <div className="flex flex-col gap-5 p-5 sm:p-7">
      <header className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">
          {t("products.detail.edit.title")}
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {t("products.detail.edit.subtitle")}
        </p>
      </header>
      <ProductForm
        mode="edit"
        register={register}
        control={control}
        errors={errors}
        status={status}
        image={image}
        onImageChange={handleImageChange}
        onSubmit={onSubmit}
        submitting={updateMutation.isPending}
        uploading={uploadMutation.isPending}
        serverError={serverError}
        onCancel={onCancel}
      />
    </div>
  );
}

function toFormDefaults(product: PublicProduct): ProductFormValues {
  return {
    name: product.name,
    sku: product.sku,
    macAddress: product.macAddress,
    imei: product.imei ?? "",
    status: product.status,
    customerId: product.customerId ?? "",
    imageUrl: product.imageUrl ?? "",
  };
}
