import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import translations from "./translations.json";

export const supportedLanguages = ["en", "he"] as const;
export type Language = (typeof supportedLanguages)[number];

const STORAGE_KEY = "lang";

function isLanguage(value: unknown): value is Language {
  return value === "en" || value === "he";
}

function getInitialLanguage(): Language {
  const stored = localStorage.getItem(STORAGE_KEY);
  return isLanguage(stored) ? stored : "en";
}

function applyDocumentLanguage(language: Language): void {
  document.documentElement.lang = language;
  document.documentElement.dir = language === "he" ? "rtl" : "ltr";
}

const initialLanguage = getInitialLanguage();

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: translations.en },
    he: { translation: translations.he },
  },
  lng: initialLanguage,
  interpolation: { escapeValue: false },
  returnNull: false,
});

applyDocumentLanguage(initialLanguage);

export async function setLanguage(language: Language): Promise<void> {
  await i18n.changeLanguage(language);
  localStorage.setItem(STORAGE_KEY, language);
  applyDocumentLanguage(language);
}

export default i18n;
