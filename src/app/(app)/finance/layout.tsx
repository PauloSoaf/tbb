import type { ReactNode } from "react";
import { FinanceOriginFilter } from "@/features/finance/FinanceOriginFilter";
import { currentFinanceOrigin } from "@/features/finance/data-origin-request";
import "@/features/finance/finance-origin.css";

export default async function FinanceLayout({ children }: { children: ReactNode }) {
  const origin = await currentFinanceOrigin();
  return <><FinanceOriginFilter key={origin} initialOrigin={origin}/>{children}</>;
}
