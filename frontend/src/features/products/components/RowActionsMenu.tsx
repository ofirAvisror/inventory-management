import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

type RowActionsMenuProps = {
  onChangeStatus: () => void;
  onDelete: () => void;
  onViewAudit: () => void;
};

export function RowActionsMenu({
  onChangeStatus,
  onDelete,
  onViewAudit,
}: RowActionsMenuProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
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
  }, [open]);

  const items: Array<{ label: string; onClick: () => void; danger?: boolean }> = [
    { label: t("products.row.changeStatus"), onClick: onChangeStatus },
    { label: t("products.row.viewAudit"), onClick: onViewAudit },
    { label: t("products.row.delete"), onClick: onDelete, danger: true },
  ];

  return (
    <div
      ref={rootRef}
      className="relative inline-block"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("products.row.menu")}
        className="inline-flex h-11 w-11 items-center justify-center rounded-md text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        <span aria-hidden="true" className="text-lg leading-none">⋮</span>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute end-0 top-full z-30 mt-1 min-w-[10rem] overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
              className={`flex w-full items-center px-3 py-2 text-start text-sm transition hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
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
    </div>
  );
}
