import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { AuthLayout } from "../components/layout/AuthLayout";
import { Alert } from "../components/ui/Alert";
import { SubmitButton } from "../components/ui/SubmitButton";
import { TextField } from "../components/ui/TextField";
import { api, extractErrorMessage } from "../lib/api";
import { buildPasswordSchema } from "../lib/validation";
import { paths } from "../routes/paths";

type ResetFormValues = {
  password: string;
  confirmPassword: string;
};

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const schema = z
    .object({
      password: buildPasswordSchema(t),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      path: ["confirmPassword"],
      message: t("auth.errors.passwordsMismatch"),
    });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (!token) return;
    setSubmitError(null);
    try {
      await api.post("/api/auth/reset-password", {
        token,
        password: values.password,
      });
      setSubmitted(true);
    } catch (error) {
      setSubmitError(extractErrorMessage(error, t("auth.errors.generic")));
    }
  });

  const loginLink = (
    <Link
      to={paths.login}
      className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100"
    >
      {t("auth.reset.backToLogin")}
    </Link>
  );

  if (!token) {
    return (
      <AuthLayout title={t("auth.reset.errorTitle")} footer={loginLink}>
        <Alert variant="error">{t("auth.reset.missingToken")}</Alert>
      </AuthLayout>
    );
  }

  if (submitted) {
    return (
      <AuthLayout title={t("auth.reset.successTitle")} footer={loginLink}>
        <Alert variant="success">{t("auth.reset.successBody")}</Alert>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={t("auth.reset.title")}
      subtitle={t("auth.reset.subtitle")}
      footer={loginLink}
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {submitError ? <Alert variant="error">{submitError}</Alert> : null}

        <TextField
          label={t("auth.fields.newPassword")}
          type="password"
          autoComplete="new-password"
          placeholder={t("auth.fields.passwordPlaceholder")}
          error={errors.password?.message}
          {...register("password")}
        />

        <TextField
          label={t("auth.fields.confirmPassword")}
          type="password"
          autoComplete="new-password"
          placeholder={t("auth.fields.passwordPlaceholder")}
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        <SubmitButton
          loading={isSubmitting}
          loadingLabel={t("auth.reset.submitting")}
        >
          {t("auth.reset.submit")}
        </SubmitButton>
      </form>
    </AuthLayout>
  );
}
