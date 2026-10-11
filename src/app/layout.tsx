import type { Metadata } from "next";
import { AppProviders } from "@/components/providers/AppProviders";
import { cookies } from "next/headers";
import { localeMessages, type Locale } from "@/lib/i18n/messages";
import "./globals.css";
export const metadata: Metadata = { title: {default:"TBB · To Be Better",template:"%s · TBB"}, description:"Seu espaço para organizar a vida, acompanhar hábitos e evoluir todos os dias.", applicationName:"TBB", robots:{index:false,follow:false} };
export default async function RootLayout({children}:{children:React.ReactNode}) {
  const stored=(await cookies()).get("NEXT_LOCALE")?.value;
  const locale:Locale=stored==="en"||stored==="es"?stored:"pt";
  // Extensions may add body attributes (e.g. cz-shortcut-listen) before hydration.
  // Suppression is limited to the body itself; mismatches in application content still surface.
  return <html lang={locale==="pt"?"pt-BR":locale} suppressHydrationWarning><body suppressHydrationWarning><AppProviders initialLocale={locale} initialMessages={localeMessages(locale)}>{children}</AppProviders></body></html>;
}
