"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { I18nProvider } from "@/lib/i18n/I18nContext";
import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query/query-client";

export function AppProviders({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale?: string;
}) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        themes={[
          "light",
          "dark",
          "theme-nutri-blue",
          "theme-clinical-leaf",
          "theme-premium-sand",
          "theme-clinical-green",
          "theme-classic-blue",
          "theme-classic-sand",
          "theme-custom",
        ]}
      >
        <I18nProvider initialLocale={initialLocale as "pt" | "en" | "es" | undefined}>
          {children}
          <Toaster
            position="top-right"
            richColors
            expand={false}
            closeButton
            toastOptions={{
              // Sonner's default close button is a bordered circle offset to
              // the top-LEFT corner (translate(-35%,-35%), regardless of
              // Toaster position). Override to a plain icon sitting inside
              // the toast's top-right corner instead — !important is
              // required since sonner's own [data-close-button] rules use
              // higher CSS specificity than a single utility class.
              classNames: {
                closeButton:
                  "!left-auto !right-1.5 !top-1.5 ![transform:none] !border-0 !bg-transparent !rounded-none !shadow-none !text-gray-400 hover:!text-gray-600 dark:!text-gray-500 dark:hover:!text-gray-300",
              },
            }}
          />
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
