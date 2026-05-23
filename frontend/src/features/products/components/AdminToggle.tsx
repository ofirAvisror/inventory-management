import { useTranslation } from "react-i18next";
import { useAdmin } from "../../../contexts/AdminContext";

export function AdminToggle() {
  const { t } = useTranslation();
  const { isAdminOverride, setAdminOverride, isJwtAdmin, isEffectiveAdmin } =
    useAdmin();

  const checked = isJwtAdmin || isAdminOverride;
  const disabled = isJwtAdmin;

  const label = isJwtAdmin
    ? t("admin.toggle.lockedOn")
    : isAdminOverride
      ? t("admin.toggle.on")
      : t("admin.toggle.off");

  return (
    <label
      className={`inline-flex h-11 select-none items-center gap-2 rounded-lg border px-3 text-sm font-medium transition ${
        disabled ? "cursor-default" : "cursor-pointer"
      } ${
        isEffectiveAdmin
          ? "border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-600/60 dark:bg-amber-950/40 dark:text-amber-200"
          : "border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
      } ${disabled ? "opacity-90" : ""}`}
      title={label}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => setAdminOverride(event.target.checked)}
        className="h-4 w-4 cursor-pointer accent-amber-500 disabled:cursor-default"
        aria-label={label}
      />
      <span className="whitespace-nowrap">{t("admin.toggle.label")}</span>
    </label>
  );
}
