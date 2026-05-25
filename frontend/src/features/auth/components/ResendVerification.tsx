import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "../../../components/ui/Alert";
import { Button } from "../../../components/ui/Button";
import { TextField } from "../../../components/ui/TextField";
import { extractErrorMessage } from "../../../lib/api";
import { buildEmailSchema } from "../../../lib/validation";
import { resendVerificationEmail } from "../api";

type ResendVerificationProps = {
  /** Pre-filled email; when empty the user must type one. */
  initialEmail?: string;
  /** When true, always show the email field (editable). */
  showEmailField?: boolean;
};

export function ResendVerification({
  initialEmail = "",
  showEmailField = false,
}: ResendVerificationProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState(initialEmail);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  const needsField = showEmailField || !initialEmail.trim();

  const handleResend = async () => {
    setSubmitError(null);
    setSuccessMessage(null);

    const trimmed = (needsField ? email : initialEmail).trim();
    const parsed = buildEmailSchema(t).safeParse(trimmed);
    if (!parsed.success) {
      setEmailError(parsed.error.issues[0]?.message ?? t("auth.errors.emailInvalid"));
      return;
    }
    setEmailError(null);

    setPending(true);
    try {
      const message = await resendVerificationEmail(parsed.data);
      setSuccessMessage(message);
    } catch (error) {
      setSubmitError(
        extractErrorMessage(error, t("auth.resend.error")),
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {t("auth.resend.prompt")}
      </p>

      {needsField ? (
        <TextField
          label={t("auth.fields.email")}
          type="email"
          autoComplete="email"
          placeholder={t("auth.fields.emailPlaceholder")}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={emailError ?? undefined}
        />
      ) : null}

      {submitError ? <Alert variant="error">{submitError}</Alert> : null}
      {successMessage ? (
        <Alert variant="success">{t("auth.resend.success")}</Alert>
      ) : null}

      <Button
        type="button"
        variant="secondary"
        className="w-full"
        loading={pending}
        disabled={pending || Boolean(successMessage)}
        onClick={() => void handleResend()}
      >
        {pending ? t("auth.resend.submitting") : t("auth.resend.submit")}
      </Button>
    </div>
  );
}
