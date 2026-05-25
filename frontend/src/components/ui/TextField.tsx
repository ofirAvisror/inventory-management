import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { useTranslation } from "react-i18next";
import { RequiredMark } from "./RequiredMark";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  required?: boolean;
  requiredTooltip?: string;
};

function EyeIcon({ closed }: { closed: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5"
    >
      {closed ? (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.584 10.587a3 3 0 0 0 4.243 4.242" />
          <path d="M9.363 5.365A10.94 10.94 0 0 1 12 5c5 0 9.27 3.11 11 7-.51 1.14-1.22 2.19-2.07 3.13" />
          <path d="M6.61 6.61C4.62 7.94 3.02 9.82 2 12c1.73 3.89 6 7 11 7 1.86 0 3.6-.43 5.1-1.18" />
        </>
      ) : (
        <>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField(
    {
      label,
      error,
      id,
      type,
      className = "",
      required = false,
      requiredTooltip,
      ...inputProps
    },
    ref,
  ) {
    const { t } = useTranslation();
    const [revealed, setRevealed] = useState(false);

    const isPassword = type === "password";
    const inputType = isPassword && revealed ? "text" : type;
    const inputId = id ?? inputProps.name;
    const describedBy = error ? `${inputId}-error` : undefined;

    const toggleLabel = revealed
      ? t("auth.fields.hidePassword")
      : t("auth.fields.showPassword");

    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={inputId}
          className="inline-flex items-center text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          {label}
          {required && requiredTooltip ? (
            <RequiredMark tooltip={requiredTooltip} />
          ) : required ? (
            <span
              aria-hidden="true"
              className="ms-0.5 text-orange-500 dark:text-orange-400"
            >
              *
            </span>
          ) : null}
        </label>
        <div className="relative" dir={isPassword ? "ltr" : undefined}>
          <input
            ref={ref}
            id={inputId}
            type={inputType}
            dir={isPassword ? "ltr" : "auto"}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm shadow-sm transition focus:outline-none focus:ring-2 dark:bg-zinc-950 ${
              isPassword ? "pe-11" : ""
            } ${
              error
                ? "border-red-400 focus:border-red-500 focus:ring-red-500/30 dark:border-red-500"
                : "border-zinc-300 focus:border-zinc-500 focus:ring-zinc-500/30 dark:border-zinc-700 dark:focus:border-zinc-500"
            } ${className}`}
            {...inputProps}
          />
          {isPassword ? (
            <button
              type="button"
              onClick={() => setRevealed((value) => !value)}
              aria-label={toggleLabel}
              aria-pressed={revealed}
              title={toggleLabel}
              tabIndex={-1}
              className="absolute end-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500/30 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            >
              <EyeIcon closed={!revealed} />
            </button>
          ) : null}
        </div>
        {error ? (
          <p
            id={describedBy}
            className="text-xs text-red-600 dark:text-red-400"
          >
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
