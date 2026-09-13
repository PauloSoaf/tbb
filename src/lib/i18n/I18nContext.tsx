"use client";

import { createContext, useContext, useState } from "react";
import pt from "./pt.json";
import en from "./en.json";
import es from "./es.json";
import { getDefaultTranslation, interpolateMessage, type TranslationParams } from "./translate";

type Locale = "pt" | "en" | "es";
type Dictionary = typeof pt;

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: TranslationParams) => string;
}

const dictionaries: Record<Locale, Dictionary> = { pt, en, es };

function translateFromDictionary(locale: Locale, path: string, params?: TranslationParams): string {
  const keys = path.split(".");
  let current: Record<string, unknown> | string = dictionaries[locale] as Record<string, unknown>;

  for (const key of keys) {
    if (typeof current === "object" && current !== null && current[key] === undefined) {
      let fallbackCurrent: Record<string, unknown> | string = dictionaries.pt as Record<string, unknown>;
      for (const fbKey of keys) {
        if (typeof fallbackCurrent === "object" && fallbackCurrent !== null && fallbackCurrent[fbKey] === undefined) {
          const defaultTranslation = getDefaultTranslation(params);
          return defaultTranslation ? interpolateMessage(defaultTranslation, params) : path;
        }
        fallbackCurrent = (fallbackCurrent as Record<string, unknown>)[fbKey] as Record<string, unknown> | string;
      }
      return typeof fallbackCurrent === "string"
        ? interpolateMessage(fallbackCurrent, params)
        : path;
    }
    current = (current as Record<string, unknown>)[key] as Record<string, unknown> | string;
  }

  const rawResult = typeof current === "string" ? current : path;
  return interpolateMessage(rawResult, params);
}

const fallbackI18nContext: I18nContextType = {
  locale: "pt",
  setLocale: () => {},
  t: (path, params) => translateFromDictionary("pt", path, params),
};

const I18nContext = createContext<I18nContextType>(fallbackI18nContext);

function isLocale(value: string | null | undefined): value is Locale {
  return value === "pt" || value === "en" || value === "es";
}

function getInitialLocale(): Locale {
  if (typeof document !== "undefined") {
    const cookieLocale = document.cookie
      .split("; ")
      .find((cookie) => cookie.startsWith("NEXT_LOCALE="))
      ?.split("=")[1];
    if (isLocale(cookieLocale)) return cookieLocale;
  }

  if (typeof localStorage !== "undefined") {
    const saved = localStorage.getItem("nutriopus-lang");
    if (isLocale(saved)) return saved;
  }

  return "pt";
}

export function I18nProvider({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocale] = useState<Locale>(() => {
    if (initialLocale && isLocale(initialLocale)) return initialLocale;
    return getInitialLocale();
  });

  const handleSetLocale = (newLocale: Locale) => {
    setLocale(newLocale);
    localStorage.setItem("nutriopus-lang", newLocale);
    // Update cookie for SSR translation
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;
  };

  const t = (path: string, params?: TranslationParams): string => translateFromDictionary(locale, path, params);

  return (
    <I18nContext.Provider value={{ locale, setLocale: handleSetLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
