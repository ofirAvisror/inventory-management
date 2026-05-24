import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import GB from "country-flag-icons/react/3x2/GB";
import IL from "country-flag-icons/react/3x2/IL";
import {
  setLanguage,
  supportedLanguages,
  type Language,
} from "../../i18n";

const flagFor: Record<Language, typeof GB> = {
  en: GB,
  he: IL,
};

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const current: Language = i18n.language === "he" ? "he" : "en";
  const CurrentFlag = flagFor[current];

  useEffect(() => {
    if (!open) return;

    function handlePointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  function handleSelect(language: Language) {
    if (language !== current) {
      void setLanguage(language);
    }
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("language.label")}
        className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg border border-zinc-300 px-2 text-sm font-medium transition hover:bg-zinc-100 sm:px-3 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        <CurrentFlag
          aria-hidden="true"
          className="h-4 w-6 rounded-sm shadow-sm ring-1 ring-black/10 dark:ring-white/10"
        />
        <span className="hidden sm:inline">{t(`language.${current}`)}</span>
        <span aria-hidden="true" className="hidden text-xs opacity-70 sm:inline">
          ▾
        </span>
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-label={t("language.label")}
          className="absolute end-0 top-full z-50 mt-1 min-w-[10rem] overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
        >
          {supportedLanguages.map((language) => {
            const selected = language === current;
            const Flag = flagFor[language];
            return (
              <li key={language}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => handleSelect(language)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-start text-sm transition ${
                    selected
                      ? "bg-zinc-100 dark:bg-zinc-800"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  }`}
                >
                  <Flag
                    aria-hidden="true"
                    className="h-4 w-6 rounded-sm shadow-sm ring-1 ring-black/10 dark:ring-white/10"
                  />
                  <span>{t(`language.${language}`)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
