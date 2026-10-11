"use client";

import { createContext, useContext, useState } from "react";

import { localeMessages, type Locale } from "./messages";
export type { Locale } from "./messages";

type TranslateOptions={defaultValue?:string};
type I18nValue = { locale: Locale; setLocale: (locale: Locale) => void; t: (key: string, options?: TranslateOptions) => string };
const I18nContext = createContext<I18nValue>({ locale: "pt", setLocale: () => undefined, t: (key, options) => localeMessages("pt")[key] || options?.defaultValue || key });

export function I18nProvider({ children, initialLocale = "pt", initialMessages }: { children?: React.ReactNode; initialLocale?: Locale; initialMessages?: Record<string, string> }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  function setLocale(next: Locale) {
    setLocaleState(next);
    try { localStorage.setItem("tbb-lang", next); } catch { /* Cookie remains the source for the next server render. */ }
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = next === "pt" ? "pt-BR" : next;
  }
  const messages = locale === initialLocale && initialMessages ? initialMessages : localeMessages(locale);
  return <I18nContext.Provider value={{ locale, setLocale, t: (key, options) => messages[key] || options?.defaultValue || key.split(".").at(-1)!.replaceAll("_", " ") }}>{children}</I18nContext.Provider>;
}
export function useI18n() { return useContext(I18nContext); }
