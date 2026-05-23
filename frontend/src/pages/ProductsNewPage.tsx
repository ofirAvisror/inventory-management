import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { AppLayout } from "../components/layout/AppLayout";
import { paths } from "../routes/paths";

export function ProductsNewPage() {
  const { t } = useTranslation();
  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-2xl font-semibold">
          {t("products.stub.createTitle")}
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {t("products.stub.body")}
        </p>
        <Link
          to={paths.products}
          className="mt-6 inline-flex h-11 items-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {t("products.stub.back")}
        </Link>
      </div>
    </AppLayout>
  );
}
