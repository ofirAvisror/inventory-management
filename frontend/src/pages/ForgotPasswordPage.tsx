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

type ForgotFormValues = {
  email: string;
};

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const schema = z.object({ email: buildEmailSchema(t) });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await api.post("/api/auth/forgot-password", values);
      setSubmitted(true);
    } catch (error) {
      setSubmitError(extractErrorMessage(error, t("auth.errors.generic")));
    }
  });

  const footer = (
    <Link
      to={paths.login}
      className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100"
    >
      {t("auth.forgot.backToLogin")}
    </Link>
  );

  if (submitted) {
    return (
      <AuthLayout
        title={t("auth.forgot.successTitle")}
        subtitle={t("auth.forgot.subtitle")}
        footer={footer}
      >
        <Alert variant="success">{t("auth.forgot.successBody")}</Alert>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={t("auth.forgot.title")}
      subtitle={t("auth.forgot.subtitle")}
      footer={footer}
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

        <SubmitButton
          loading={isSubmitting}
          loadingLabel={t("auth.forgot.submitting")}
        >
          {t("auth.forgot.submit")}
        </SubmitButton>
      </form>
    </AuthLayout>
  );
}
