import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import en from "./locales/en";
import es from "./locales/es";
import fr from "./locales/fr";
import de from "./locales/de";
import ja from "./locales/ja";
import zh from "./locales/zh";
import pt from "./locales/pt";
import hi from "./locales/hi";
import { track } from "../services/analyticsService";

type TranslationKeys = typeof en;

const translations: Record<string, TranslationKeys> = {
  en,
  es,
  fr,
  de,
  ja,
  zh,
  pt,
  hi,
};

const LOCALE_STORAGE_KEY = "humanproof_locale";

interface I18nContextType {
  locale: string;
  setLocale: (locale: string) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

function detectInitialLocale(): string {
  if (typeof window === "undefined") return "en";
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && translations[stored]) return stored;
  } catch {}
  // Handle BCP-47 variants — pt-BR/pt-PT → pt, hi-IN → hi, zh-CN/zh-TW → zh.
  const rawNav = navigator.language?.toLowerCase() || "en";
  const base = rawNav.slice(0, 2);
  if (translations[base]) return base;
  // Region-specific overrides — e.g. zh-tw could later route to a future zh-tw locale.
  return "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<string>(() => detectInitialLocale());

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = useCallback((next: string) => {
    if (!translations[next]) return;
    setLocaleState(next);
    try { localStorage.setItem(LOCALE_STORAGE_KEY, next); } catch {}
    track("locale_changed", { locale: next });
  }, []);

  const t = useCallback(
    (key: string): string => {
      const keys = key.split(".");
      let value: unknown = translations[locale] ?? translations.en;
      for (const k of keys) {
        if (value && typeof value === "object") {
          value = (value as Record<string, unknown>)[k];
        } else {
          return key;
        }
      }
      if (typeof value === "string") return value;

      // fallback to English if the key exists there
      let fallback: unknown = translations.en;
      for (const k of keys) {
        if (fallback && typeof fallback === "object") {
          fallback = (fallback as Record<string, unknown>)[k];
        } else {
          return key;
        }
      }
      return typeof fallback === "string" ? fallback : key;
    },
    [locale],
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}

export const languages = [
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "pt", name: "Português" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "hi", name: "हिन्दी" },
  { code: "ja", name: "日本語" },
  { code: "zh", name: "中文" },
];
