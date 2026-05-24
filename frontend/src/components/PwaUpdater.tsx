import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { registerSW } from "virtual:pwa-register";
import { useToast } from "../contexts/ToastContext";

const OFFLINE_READY_KEY = "pwa-offline-ready-shown";

function hasSessionFlag(key: string): boolean {
  try {
    return sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function setSessionFlag(key: string): void {
  try {
    sessionStorage.setItem(key, "1");
  } catch {
    // ignore storage errors
  }
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const INSTALL_DISMISS_KEY = "pwa-install-dismissed-until";

function isStandaloneApp(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
}

function isInstallDismissed(): boolean {
  try {
    const until = Number(localStorage.getItem(INSTALL_DISMISS_KEY));
    return Number.isFinite(until) && until > Date.now();
  } catch {
    return false;
  }
}

function dismissInstallPrompt(days = 7) {
  try {
    localStorage.setItem(
      INSTALL_DISMISS_KEY,
      String(Date.now() + days * 24 * 60 * 60 * 1000),
    );
  } catch {
    // ignore storage errors
  }
}

export function PwaInstallBanner() {
  const { t } = useTranslation();
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandaloneApp() || isInstallDismissed()) return;

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const handleAppInstalled = () => {
      setVisible(false);
      setInstallEvent(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!installEvent) return;
    try {
      await installEvent.prompt();
      const { outcome } = await installEvent.userChoice;
      if (outcome !== "accepted") {
        dismissInstallPrompt();
      }
    } catch {
      // prompt() can reject if already consumed or blocked by the browser
    } finally {
      setVisible(false);
      setInstallEvent(null);
    }
  };

  const handleDismiss = () => {
    dismissInstallPrompt();
    setVisible(false);
    setInstallEvent(null);
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label={t("pwa.installTitle")}
      className="fixed inset-x-0 top-0 z-[110] border-b border-emerald-200 bg-emerald-50 px-4 py-3 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/90"
    >
      <div className="mx-auto flex max-w-7xl items-start justify-between gap-3 sm:items-center">
        <div className="min-w-0 text-sm text-emerald-900 dark:text-emerald-100">
          <p className="font-semibold">{t("pwa.installTitle")}</p>
          <p className="mt-0.5">{t("pwa.installDescription")}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => void handleInstall()}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            {t("pwa.install")}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-lg px-2 py-1.5 text-sm font-medium text-emerald-800 underline-offset-2 hover:underline dark:text-emerald-200"
          >
            {t("pwa.installDismiss")}
          </button>
        </div>
      </div>
    </div>
  );
}

async function applyServiceWorkerUpdate(
  updateSW: (reloadPage?: boolean) => Promise<void>,
): Promise<void> {
  try {
    await updateSW(true);
  } catch {
    // skipWaiting can fail if the waiting worker was already activated
  }
  window.location.reload();
}

export function PwaUpdater() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const toastRef = useRef(toast);
  const tRef = useRef(t);
  const updateToastShownRef = useRef(false);

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  useEffect(() => {
    tRef.current = t;
  }, [t]);

  useEffect(() => {
    if (import.meta.env.DEV) return;

    const showOfflineReadyToast = () => {
      if (hasSessionFlag(OFFLINE_READY_KEY)) return;
      setSessionFlag(OFFLINE_READY_KEY);
      toastRef.current({
        variant: "success",
        title: tRef.current("pwa.offlineReady"),
        description: tRef.current("pwa.offlineReadyDescription"),
        position: "top",
      });
    };

    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        if (updateToastShownRef.current) return;
        updateToastShownRef.current = true;
        toastRef.current({
          variant: "info",
          title: tRef.current("pwa.updateAvailable"),
          description: tRef.current("pwa.updateDescription"),
          durationMs: 0,
          position: "top",
          action: {
            label: tRef.current("pwa.reload"),
            onClick: () => {
              void applyServiceWorkerUpdate(updateSW);
            },
          },
        });
      },
      onOfflineReady: showOfflineReadyToast,
      onRegisteredSW(_swUrl, registration) {
        if (registration?.active || navigator.serviceWorker.controller) {
          showOfflineReadyToast();
        }
      },
    });

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.ready.then(() => {
        if (navigator.serviceWorker.controller) {
          showOfflineReadyToast();
        }
      });
    }
  }, []);

  return null;
}
