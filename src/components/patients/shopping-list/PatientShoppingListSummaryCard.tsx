import Link from "next/link";
import { CheckCircle2, ShoppingCart } from "lucide-react";

export type ShoppingListSummary = {
  id: string;
  title: string;
  periodDays: number;
  items: { checked: boolean }[];
} | null;

export function PatientShoppingListSummaryCard({
  tenantSlug,
  patientId,
  list,
}: {
  tenantSlug: string;
  patientId: string;
  list: ShoppingListSummary;
}) {
  const total = list?.items.length ?? 0;
  const checked = list?.items.filter((item) => item.checked).length ?? 0;
  const percent = total > 0 ? Math.round((checked / total) * 100) : 0;

  return (
    <div className="rounded-3xl border border-border-neutral bg-card-bg p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <ShoppingCart className="h-4 w-4 text-brand-blue" />
          Lista de Compras
        </h3>
        <Link
          prefetch={false}
          href={`/dashboard/${tenantSlug}/pacientes/${patientId}/compras`}
          className="text-xs font-medium text-brand-blue transition-colors hover:text-brand-blue-hover hover:underline"
        >
          Ver lista
        </Link>
      </div>

      {list ? (
        <div className="space-y-3">
          <div>
            <p className="truncate text-sm font-semibold text-text-primary">{list.title}</p>
            <p className="text-xs text-text-secondary">
              {checked} de {total} itens comprados - {list.periodDays} dias
            </p>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-warm-surface">
            <div className="h-full rounded-full bg-brand-blue transition-all" style={{ width: `${percent}%` }} />
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-text-secondary">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            {percent}% concluido
          </div>
        </div>
      ) : (
        <p className="text-sm text-text-secondary">Paciente ainda nao gerou uma lista de compras.</p>
      )}
    </div>
  );
}
