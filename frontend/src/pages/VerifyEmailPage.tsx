import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { AuthLayout } from "../components/layout/AuthLayout";
import { Alert } from "../components/ui/Alert";
import { api, extractErrorMessage } from "../lib/api";
import { paths } from "../routes/paths";
import { ResendVerification } from "../features/auth/components/ResendVerification";

type Status = "pending" | "success" | "error";

type VerificationResult = { ok: true } | { ok: false; error: unknown };

const verificationAttempts = new Map<string, Promise<VerificationResult>>();

function attemptVerification(token: string): Promise<VerificationResult> {
  const existing = verificationAttempts.get(token);
  if (existing) return existing;

  const promise: Promise<VerificationResult> = api
    .get("/api/auth/verify-email", { params: { token } })
    .then((): VerificationResult => ({ ok: true }))
    .catch((error: unknown): VerificationResult => {
      verificationAttempts.delete(token);
      return { ok: false, error };
    });

  verificationAttempts.set(token, promise);
  return promise;
}

export function VerifyEmailPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<Status>("pending");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage(t("auth.verify.missingToken"));
      return;
    }

    setStatus("pending");
    setErrorMessage(null);

    let cancelled = false;

    void attemptVerification(token).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setStatus("success");
        return;
      }
      setStatus("error");
      setErrorMessage(
        extractErrorMessage(result.error, t("auth.verify.errorBody")),
      );
    });

    return () => {
      cancelled = true;
    };
  }, [token, t]);

  const loginLink = (
    <Link
      to={paths.login}
      className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100"
    >
      {t("auth.verify.goToLogin")}
    </Link>
  );

  if (status === "pending") {
    return (
      <AuthLayout
        title={t("auth.verify.verifyingTitle")}
        subtitle={t("auth.verify.verifyingSubtitle")}
      >
        <div
          role="status"
          aria-live="polite"
          className="flex justify-center py-2"
        >
          <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
        </div>
      </AuthLayout>
    );
  }

  if (status === "success") {
    return (
      <AuthLayout
        title={t("auth.verify.successTitle")}
        footer={loginLink}
      >
        <Alert variant="success">{t("auth.verify.successBody")}</Alert>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t("auth.verify.errorTitle")} footer={loginLink}>
      <div className="flex flex-col gap-4">
        <Alert variant="error">
          {errorMessage ?? t("auth.verify.errorBody")}
        </Alert>
        <ResendVerification showEmailField />
      </div>
    </AuthLayout>
  );
}
