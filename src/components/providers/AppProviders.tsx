"use client";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { I18nProvider, type Locale } from "@/lib/i18n/I18nContext";
export function AppProviders({children,initialLocale="pt"}:{children:React.ReactNode;initialLocale?:Locale}) {
  return <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="tbb-theme-v2" themes={["light","dark","theme-blue","theme-sand","theme-rose","theme-lilac","theme-midnight","theme-metal","theme-premium-sand","theme-clinical-green","theme-classic-blue","theme-classic-sand","theme-custom"]}><I18nProvider initialLocale={initialLocale}>{children}<Toaster position="bottom-right" closeButton richColors/></I18nProvider></ThemeProvider>;
}
