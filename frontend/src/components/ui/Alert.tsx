import type { ReactNode } from "react";
// Alert.tsx
type AlertProps = {
  variant?: "error" | "success";
  title?: string;
  children: ReactNode;
};

const variantClass = {
  error:
    "border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200",
} as const;

export function Alert({ variant = "error", title, children }: AlertProps) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={`rounded-lg border px-3 py-2.5 text-sm ${variantClass[variant]}`}
    >
      {title ? <p className="font-medium">{title}</p> : null}
      <div className={title ? "mt-1" : ""}>{children}</div>
    </div>
  );
}
