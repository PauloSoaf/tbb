"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Filter } from "lucide-react";
import { FINANCE_ORIGINS, ORIGIN_LABELS, parseFinanceOrigin, type FinanceOrigin } from "./data-origin-core";

export function FinanceOriginFilter({ initialOrigin }: { initialOrigin: FinanceOrigin }) {
  const router = useRouter();
  const pathname = usePathname();
  const [origin, setOrigin] = useState(initialOrigin);
  const [pending, startTransition] = useTransition();
  if (!["/finance", "/finance/accounts", "/finance/statements", "/finance/transactions", "/finance/calendar", "/finance/reports", "/finance/debts", "/finance/debts/simulator"].includes(pathname)) return null;
  return <aside className="finance-origin-filter" aria-label="Origem dos dados financeiros" aria-busy={pending}>
    <label><Filter size={16} aria-hidden="true"/><span>Exibir dados</span><select aria-label="Origem dos dados" value={origin} disabled={pending} onChange={event => {
      const next = parseFinanceOrigin(event.target.value); setOrigin(next);
      document.cookie = `tbb-finance-origin=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
      startTransition(() => router.refresh());
    }}>{FINANCE_ORIGINS.map(value => <option key={value} value={value}>{ORIGIN_LABELS[value]}</option>)}</select></label>
    <p role="status">{pending ? "Atualizando…" : origin === "combined" ? "Uma compra, um registro. As fontes conciliadas ficam vinculadas ao mesmo lançamento." : "Filtro de lançamentos, gráficos e faturas. Saldos atuais e planejamento continuam como referência."}</p>
  </aside>;
}
