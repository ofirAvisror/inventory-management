import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { z } from "zod";
import { AuthLayout } from "../components/layout/AuthLayout";
import { Alert } from "../components/ui/Alert";
import { SubmitButton } from "../components/ui/SubmitButton";
import { TextField } from "../components/ui/TextField";
import { api, extractErrorMessage } from "../lib/api";
import { buildEmailSchema } from "../lib/validation";
import { paths } from "../routes/paths";

type LoginFormValues = {
  email: string;
  password: string;
};

export function LoginPage() {
  const { t } = useTranslation();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const schema = z.object({
    email: buildEmailSchema(t),
    password: z.string().min(1, t("auth.errors.passwordRequired")),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await api.post("/api/auth/login", values);
    } catch (error) {
      setSubmitError(extractErrorMessage(error, t("auth.errors.generic")));
    }
  });

  return (
    <AuthLayout
      title={t("auth.login.title")}
      subtitle={t("auth.login.subtitle")}
      footer={
        <>
          {t("auth.login.noAccount")}{" "}
          <Link
            to={paths.register}
            className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100"
          >
            {t("auth.login.registerCta")}
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {submitError ? <Alert variant="error">{submitError}</Alert> : null}

        <TextField
          label={t("auth.fields.email")}
          type="email"
          autoComplete="email"
          placeholder={t("auth.fields.emailPlaceholder")}
          error={errors.email?.message}
          {...register("email")}
        />

        <div className="flex flex-col gap-1">
          <TextField
            label={t("auth.fields.password")}
            type="password"
            autoComplete="current-password"
            placeholder={t("auth.fields.passwordPlaceholder")}
            error={errors.password?.message}
            {...register("password")}
          />
          <div className="flex justify-end">
            <Link
              to={paths.forgotPassword}
              className="text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              {t("auth.login.forgotPassword")}
            </Link>
          </div>
        </div>

        <SubmitButton
          loading={isSubmitting}
          loadingLabel={t("auth.login.submitting")}
        >
          {t("auth.login.submit")}
        </SubmitButton>
      </form>
    </AuthLayout>
  );
}
