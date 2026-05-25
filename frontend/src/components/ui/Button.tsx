import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const variantClass: Record<Variant, string> = {
  primary:
    "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white",
  secondary:
    "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800",
  danger:
    "bg-red-600 text-white hover:bg-red-500 dark:bg-red-600 dark:hover:bg-red-500",
  ghost:
    "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800",
};

const sizeClass = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
} as const;

type Size = keyof typeof sizeClass;

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "secondary",
    size = "md",
    loading = false,
    disabled,
    className = "",
    children,
    type = "button",
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition focus:outline-none focus:ring-2 focus:ring-zinc-500/30 disabled:cursor-not-allowed disabled:opacity-60 ${variantClass[variant]} ${sizeClass[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
});
