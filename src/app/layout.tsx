import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";
import { PWARegister } from "@/components/pwa/PWARegister";
import { cookies } from "next/headers";
import { NavigationFeedback } from "@/components/navigation/NavigationFeedback";
import { Suspense } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "NutriOpus — Plataforma para Nutricionistas",
    template: "%s | NutriOpus",
  },
  description:
    "Organize seus pacientes, receba pré-consultas digitais e gerencie anamneses de forma simples e profissional.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "NutriOpus",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "NutriOpus — Plataforma para Nutricionistas",
    description: "Organize seus pacientes, receba pré-consultas digitais e gerencie anamneses de forma simples e profissional.",
    type: "website",
    locale: "pt_BR",
    siteName: "NutriOpus",
  },
  keywords: ["nutricionista", "software nutrição", "pré-consulta", "anamnese", "gestão clínica", "plano alimentar"],
};

export const viewport = {
  themeColor: "#08284D",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("NEXT_LOCALE")?.value;
  const initialLocale = ["pt", "en", "es"].includes(localeCookie ?? "") ? localeCookie : "pt";

  return (
    <html
      lang={initialLocale === "pt" ? "pt-BR" : initialLocale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      {/* suppressHydrationWarning: browser extensions (e.g. ColorZilla) inject attributes into <body> causing harmless mismatches */}
      <body className="min-h-full flex flex-col bg-background text-foreground transition-colors duration-300" suppressHydrationWarning>
        <AppProviders initialLocale={initialLocale}>
          <PWARegister />
          <Suspense fallback={null}>
            <NavigationFeedback />
          </Suspense>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
