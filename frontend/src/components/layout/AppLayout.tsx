import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { api } from "../../lib/api";
import { paths } from "../../routes/paths";
import { AdminToggle } from "../../features/products/components/AdminToggle";
import { LanguageSwitcher } from "../ui/LanguageSwitcher";
import { AppBrand } from "./AppBrand";

type AppLayoutProps = {
  children: ReactNode;
};

function ThemeToggleButton() {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const label = isDark ? t("app.theme.toLight") : t("app.theme.toDark");

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-300 transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
      aria-label={label}
      title={label}
    >
      <span aria-hidden="true" className="text-lg leading-none">
        {isDark ? "☀️" : "🌙"}
      </span>
    </button>
  );
}

function LogoutButton() {
  const { t } = useTranslation();
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);

  const handleLogout = async () => {
    setPending(true);
    try {
      await api.post("/api/auth/logout");
    } catch {
      // Even if the server call fails, clear the client state.
    } finally {
      setUser(null);
      setPending(false);
      navigate(paths.login, { replace: true });
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleLogout()}
      disabled={pending}
      className="inline-flex h-11 shrink-0 items-center rounded-lg border border-zinc-300 px-2 text-xs font-medium transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 sm:px-3 sm:text-sm dark:border-zinc-700 dark:hover:bg-zinc-800"
    >
      {t("app.logout")}
    </button>
  );
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex w-full max-w-7xl flex-nowrap items-center justify-between gap-2 px-4 py-3 sm:gap-3 sm:px-6">
          <div className="min-w-0 shrink">
            <AppBrand />
          </div>
          <div className="flex shrink-0 flex-nowrap items-center gap-1.5 sm:gap-2">
            <AdminToggle />
            <LanguageSwitcher />
            <ThemeToggleButton />
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        {children}
      </main>
    </div>
  );
}
