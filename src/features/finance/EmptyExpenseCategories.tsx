"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { ActionForm } from "@/components/ui/ActionForm";
import { createDefaultCategories } from "./actions";

/** A budget needs an expense category, so an empty list must offer a way forward instead of a required, empty select. */
export function EmptyExpenseCategories() {
  const scope = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = scope.current;
    // Keep the dialog open: once the categories exist, the budget form replaces this notice in place.
    const keepOpen = (event: Event) => event.stopPropagation();
    element?.addEventListener("tbb:form-success", keepOpen);
    return () => element?.removeEventListener("tbb:form-success", keepOpen);
  }, []);
  return <div ref={scope} className="stack">
    <p>Você ainda não tem categorias de despesa. Um orçamento acompanha os gastos de uma categoria, como Mercado ou Transporte.</p>
    <ActionForm action={createDefaultCategories}><button className="button" type="submit">Criar categorias iniciais</button></ActionForm>
    <p className="muted text-sm">Prefere um limite geral, sem categoria, como um teto de gastos no cartão? Use <Link href="/finance/limits">Limites de gastos</Link>. Para criar uma categoria sua, vá em <Link href="/finance/accounts">Contas</Link>.</p>
  </div>;
}
