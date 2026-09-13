"use client";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
export function AppProviders({children}:{children:React.ReactNode}) {
  return <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="tbb-theme">{children}<Toaster position="bottom-right" closeButton richColors/></ThemeProvider>;
}
