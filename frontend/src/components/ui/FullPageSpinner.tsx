export function FullPageSpinner() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-screen items-center justify-center"
    >
      <Spinner className="h-8 w-8" />
      <span className="sr-only">Loading</span>
    </div>
  );
}

type SpinnerProps = {
  className?: string;
};

export function Spinner({ className = "h-5 w-5" }: SpinnerProps) {
  return (
    <svg
      className={`animate-spin text-zinc-500 dark:text-zinc-400 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-20"
      />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
