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
import { api, toApiError } from "../lib/api";
import { buildEmailSchema, buildPasswordSchema } from "../lib/validation";
import { paths } from "../routes/paths";
import { ResendVerification } from "../features/auth/components/ResendVerification";

type RegisterFormValues = {
  email: string;
  password: string;
  confirmPassword: string;
};

export function RegisterPage() {
  const { t } = useTranslation();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  const schema = z
    .object({
      email: buildEmailSchema(t),
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
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    setUnverifiedEmail(null);
    try {
      await api.post("/api/auth/register", {
        email: values.email,
        password: values.password,
      });
      setSubmittedEmail(values.email);
    } catch (error) {
      const apiError = toApiError(error, t("auth.errors.generic"));
      setSubmitError(apiError.message);
      if (apiError.code === "EMAIL_EXISTS_UNVERIFIED") {
        setUnverifiedEmail(values.email);
      }
    }
  });

  if (submittedEmail) {
    return (
      <AuthLayout
        title={t("auth.register.successTitle")}
        subtitle={submittedEmail}
        footer={
          <Link
            to={paths.login}
            className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100"
          >
            {t("auth.register.loginCta")}
          </Link>
        }
      >
        <Alert variant="success">{t("auth.register.successBody")}</Alert>
        <ResendVerification initialEmail={submittedEmail} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={t("auth.register.title")}
      subtitle={t("auth.register.subtitle")}
      footer={
        <>
          {t("auth.register.haveAccount")}{" "}
          <Link
            to={paths.login}
            className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100"
          >
            {t("auth.register.loginCta")}
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {submitError ? <Alert variant="error">{submitError}</Alert> : null}

        {unverifiedEmail ? (
          <>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {t("auth.unverified.registerHint")}
            </p>
            <ResendVerification initialEmail={unverifiedEmail} />
          </>
        ) : null}

        <TextField
          label={t("auth.fields.email")}
          type="email"
          autoComplete="email"
          placeholder={t("auth.fields.emailPlaceholder")}
          error={errors.email?.message}
          {...register("email")}
        />

        <TextField
          label={t("auth.fields.password")}
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
          loadingLabel={t("auth.register.submitting")}
        >
          {t("auth.register.submit")}
        </SubmitButton>
      </form>
    </AuthLayout>
  );
}
