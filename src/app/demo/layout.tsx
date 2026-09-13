import type { Metadata } from "next";
import { DemoProvider } from "@/demo/demo-context";

// Demo Mode: fully client-side, mock data only — no auth, no Prisma, no
// Supabase, no server actions. The interactive demo itself is noindex; the
// public landing keeps normal indexing.
export const metadata: Metadata = {
  title: "Demo NutriOpus — plataforma para nutricionistas",
  description: "Explore uma demonstração interativa do NutriOpus com dados fictícios, sem cadastro.",
  robots: { index: false, follow: false },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <DemoProvider>{children}</DemoProvider>;
}
