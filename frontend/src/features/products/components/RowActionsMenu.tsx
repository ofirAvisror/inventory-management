import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";

type RowActionsMenuProps = {
  onEdit: () => void;
  onChangeStatus: () => void;
  onDelete: () => void;
  onViewAudit: () => void;
};

function useIsMobileSheet() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 639px)").matches
      : false,
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}

export function RowActionsMenu({
  onEdit,
  onChangeStatus,
  onDelete,
  onViewAudit,
}: RowActionsMenuProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const isMobileSheet = useIsMobileSheet();

  useEffect(() => {
    if (!open || isMobileSheet) return;
    const handlePointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, isMobileSheet]);

  useEffect(() => {
    if (!open || !isMobileSheet) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, isMobileSheet]);

  const items: Array<{ label: string; onClick: () => void; danger?: boolean }> = [
    { label: t("products.row.edit"), onClick: onEdit },
    { label: t("products.row.changeStatus"), onClick: onChangeStatus },
    { label: t("products.row.viewAudit"), onClick: onViewAudit },
    { label: t("products.row.delete"), onClick: onDelete, danger: true },
  ];

  const runAction = (onClick: () => void) => {
    setOpen(false);
    onClick();
  };

  const mobileSheet =
    open && isMobileSheet && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-50 flex flex-col justify-end sm:hidden">
            <button
              type="button"
              aria-label={t("common.close")}
              className="absolute inset-0 bg-black/40"
              onClick={() => setOpen(false)}
            />
            <div
              role="menu"
              aria-label={t("products.row.menu")}
              className="relative z-10 rounded-t-xl border-t border-zinc-200 bg-white py-2 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
            >
              {items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  onClick={() => runAction(item.onClick)}
                  className={`flex min-h-11 w-full items-center px-4 text-start text-sm transition hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                    item.danger
                      ? "text-red-700 dark:text-red-300"
                      : "text-zinc-800 dark:text-zinc-100"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      ref={rootRef}
      className="relative inline-block"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t("products.row.menu")}
        className="inline-flex h-11 w-11 items-center justify-center rounded-md text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        <span aria-hidden="true" className="text-lg leading-none">
          ⋮
        </span>
      </button>
      {open && !isMobileSheet ? (
        <div
          role="menu"
          className="absolute end-0 top-full z-30 mt-1 max-w-[calc(100vw-2rem)] min-w-[10rem] overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => runAction(item.onClick)}
              className={`flex min-h-11 w-full items-center px-3 text-start text-sm transition hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                item.danger
                  ? "text-red-700 dark:text-red-300"
                  : "text-zinc-800 dark:text-zinc-100"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
      {mobileSheet}
    </div>
  );
}
