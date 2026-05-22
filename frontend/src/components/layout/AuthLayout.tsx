import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../contexts/ThemeContext.tsx";
import { AppBrand } from "./AppBrand";
import { LanguageSwitcher } from "../ui/LanguageSwitcher";

type AuthLayoutProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
};

function ThemeToggleButton() {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const label = isDark ? t("app.theme.toLight") : t("app.theme.toDark");
  const emoji = isDark ? "☀️" : "🌙";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300 text-base transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
      aria-label={label}
      title={label}
    >
      <span aria-hidden="true" className="leading-none">
        {emoji}
      </span>
    </button>
  );
}

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <AppBrand />
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggleButton />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-12 pt-4 sm:px-6">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {subtitle}
                </p>
              ) : null}
            </div>

            {children}
          </div>

          {footer ? (
            <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
              {footer}
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
