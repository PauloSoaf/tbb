import type { Metadata } from "next";
import { AppProviders } from "@/components/providers/AppProviders";
import "./globals.css";
export const metadata: Metadata = { title: {default:"TBB · To Be Better",template:"%s · TBB"}, description:"Seu espaço para organizar a vida, acompanhar hábitos e evoluir todos os dias.", applicationName:"TBB", robots:{index:false,follow:false} };
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="pt-BR" suppressHydrationWarning><body><AppProviders>{children}</AppProviders></body></html>;
}
