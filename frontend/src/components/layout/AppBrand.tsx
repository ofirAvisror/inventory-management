import { useTranslation } from "react-i18next";
import { useTheme } from "../../contexts/ThemeContext.tsx";
import logoDarkUrl from "../../assets/logo-dark.png";
import logoLightUrl from "../../assets/logo.png";

export function AppBrand() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const logoUrl = theme === "dark" ? logoDarkUrl : logoLightUrl;

  return (
    <div className="flex min-w-0 items-center">
      <img
        src={logoUrl}
        alt={t("app.brandName")}
        className="h-10 w-auto max-w-[7rem] object-contain object-start sm:h-14 sm:max-w-[12rem]"
      />
    </div>
  );
}
