import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { useToast } from "../contexts/ToastContext";
import { ProductForm } from "../features/products/components/ProductForm";
import type { ImageDropzoneValue } from "../features/products/components/ImageDropzone";
import {
  useCreateProductMutation,
  useUploadProductImageMutation,
} from "../features/products/hooks/useProductMutations";
import { handleCreateProductError } from "../features/products/lib/createErrorMapping";
import {
  buildProductFormSchema,
  normalizeProductFormValues,
  type ProductFormValues,
} from "../features/products/lib/productSchema";
import { ProductStatus } from "../features/products/types";
import { paths } from "../routes/paths";

export function ProductsNewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const schema = useMemo(() => buildProductFormSchema(t), [t]);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      sku: "",
      macAddress: "",
      imei: "",
      status: ProductStatus.StockIn,
      customerId: "",
      imageUrl: "",
    },
  });

  const [image, setImage] = useState<ImageDropzoneValue>({
    file: null,
    url: null,
  });
  const [serverError, setServerError] = useState<string | null>(null);

  const createMutation = useCreateProductMutation();
  const uploadMutation = useUploadProductImageMutation();

  // `useWatch` is the React-Compiler-friendly variant of `watch(...)` and
  // re-renders only when the chosen field changes.
  const status = useWatch({ control, name: "status" });

  const handleImageChange = (next: ImageDropzoneValue) => {
    setImage(next);
    // Keep the form's `imageUrl` in sync with the dropzone state so the
    // "status >= 4 requires image" refinement sees the right value on the
    // next validation pass.
    setValue("imageUrl", next.url ?? "", { shouldValidate: false });
    clearErrors("imageUrl");
  };

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      // Step 1: if the user staged a new file, upload it first so we can
      // attach the returned URL to the create payload. We avoid re-uploading
      // a file that succeeded in a previous (failed) submit by checking for
      // an existing `image.url`.
      let imageUrl: string | undefined =
        image.url ?? (values.imageUrl.trim() || undefined);
      if (image.file && !image.url) {
        try {
          const result = await uploadMutation.mutateAsync(image.file);
          imageUrl = result.url;
          const nextImage: ImageDropzoneValue = {
            file: image.file,
            url: result.url,
          };
          setImage(nextImage);
          setValue("imageUrl", result.url, { shouldValidate: false });
        } catch (uploadError) {
          const mapped = handleCreateProductError(uploadError, setError, t);
          setServerError(mapped.topLevelMessage);
          return;
        }
      }

      const payload = normalizeProductFormValues({
        ...values,
        imageUrl: imageUrl ?? "",
      });

      await createMutation.mutateAsync(payload);

      toast({
        variant: "success",
        title: t("products.create.success.title"),
        description: t("products.create.success.description", {
          name: payload.name,
        }),
      });
      navigate(paths.products);
    } catch (error) {
      const mapped = handleCreateProductError(error, setError, t);
      setServerError(mapped.topLevelMessage);
    }
  });

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-6 flex flex-col gap-1">
          <Link
            to={paths.products}
            className="self-start text-xs font-medium text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
          >
            {t("products.create.back")}
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {t("products.create.title")}
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {t("products.create.subtitle")}
          </p>
        </header>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-7">
          <ProductForm
            register={register}
            control={control}
            errors={errors}
            status={status}
            image={image}
            onImageChange={handleImageChange}
            onSubmit={onSubmit}
            submitting={createMutation.isPending}
            uploading={uploadMutation.isPending}
            serverError={serverError}
          />
        </div>
      </div>
    </AppLayout>
  );
}
