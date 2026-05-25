import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

export type ToastVariant = "success" | "error" | "info" | "warning";

export interface ToastInput {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
  position?: "top" | "bottom";
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface Toast extends Required<Pick<ToastInput, "variant">> {
  id: number;
  title?: string;
  description?: string;
  position: "top" | "bottom";
  action?: ToastInput["action"];
}

interface ToastContextValue {
  toast: (input: ToastInput) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION_MS = 5_000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = nextId.current++;
      const next: Toast = {
        id,
        variant: input.variant ?? "info",
        title: input.title,
        description: input.description,
        position: input.position ?? "bottom",
        action: input.action,
      };
      setToasts((current) => [...current, next]);
      const duration = input.durationMs ?? DEFAULT_DURATION_MS;
      if (duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, timer);
      }
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((timer) => clearTimeout(timer));
      map.clear();
    };
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({ toast, dismiss }),
    [toast, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {typeof document !== "undefined"
        ? createPortal(
            <>
              <ToastViewport
                toasts={toasts.filter((toast) => toast.position === "top")}
                dismiss={dismiss}
                position="top"
              />
              <ToastViewport
                toasts={toasts.filter((toast) => toast.position === "bottom")}
                dismiss={dismiss}
                position="bottom"
              />
            </>,
            document.body,
          )
        : null}
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

const variantStyles: Record<ToastVariant, string> = {
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/60 dark:text-emerald-100",
  error:
    "border-red-200 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-100",
  warning:
    "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/60 dark:text-amber-100",
  info: "border-zinc-200 bg-white text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100",
};

function ToastViewport({
  toasts,
  dismiss,
  position,
}: {
  toasts: Toast[];
  dismiss: (id: number) => void;
  position: "top" | "bottom";
}) {
  const { t } = useTranslation();
  if (toasts.length === 0) return null;

  const positionClass =
    position === "top"
      ? "top-16 sm:top-4"
      : "bottom-4";

  return (
    <div
      role="region"
      aria-label={t("common.notifications")}
      className={`pointer-events-none fixed inset-x-0 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6 ${positionClass}`}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={`pointer-events-auto w-full max-w-sm rounded-lg border px-4 py-3 shadow-lg ${variantStyles[toast.variant]}`}
        >
          <div className="flex items-start gap-3">
            <div className="flex-1 text-sm">
              {toast.title ? (
                <p className="font-semibold">{toast.title}</p>
              ) : null}
              {toast.description ? (
                <p className={toast.title ? "mt-0.5" : ""}>
                  {toast.description}
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-1">
              {toast.action ? (
                <button
                  type="button"
                  onClick={() => {
                    toast.action?.onClick();
                    dismiss(toast.id);
                  }}
                  className="rounded-md px-2 py-1 text-xs font-semibold underline-offset-2 hover:underline"
                >
                  {toast.action.label}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label={t("common.dismiss")}
                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-current/70 hover:text-current"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
