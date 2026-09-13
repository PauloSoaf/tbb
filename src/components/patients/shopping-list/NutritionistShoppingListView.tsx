import Link from "next/link";
import { ArrowLeft, CheckCircle2, ShoppingCart } from "lucide-react";

type NutritionistShoppingItem = {
  id: string;
  name: string;
  category: string;
  quantity: number | null;
  unit: string | null;
  checked: boolean;
  source: string;
};

type NutritionistShoppingList = {
  id: string;
  title: string;
  status: string;
  periodDays: number;
  createdAt: Date;
  items: NutritionistShoppingItem[];
  mealPlan: { id: string; title: string } | null;
};

const categoryLabels: Record<string, string> = {
  FRUITS: "Frutas",
  VEGETABLES: "Verduras e legumes",
  PROTEINS: "Proteinas",
  GRAINS: "Graos e cereais",
  DAIRY: "Laticinios",
  LEGUMES: "Leguminosas",
  OILS: "Oleos e gorduras",
  SEASONINGS: "Temperos",
  BEVERAGES: "Bebidas",
  SUPPLEMENTS: "Suplementos",
  OTHER: "Outros",
};

export function NutritionistShoppingListView({
  tenantSlug,
  patientId,
  patientName,
  lists,
}: {
  tenantSlug: string;
  patientId: string;
  patientName: string;
  lists: NutritionistShoppingList[];
}) {
  const activeList = lists.find((list) => list.status === "ACTIVE") ?? lists[0] ?? null;
  const checked = activeList?.items.filter((item) => item.checked).length ?? 0;
  const total = activeList?.items.length ?? 0;
  const percent = total > 0 ? Math.round((checked / total) * 100) : 0;

  const groupedItems = new Map<string, NutritionistShoppingItem[]>();
  for (const item of activeList?.items ?? []) {
    const group = groupedItems.get(item.category) ?? [];
    group.push(item);
    groupedItems.set(item.category, group);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/${tenantSlug}/pacientes/${patientId}`}
          className="rounded-full p-2 text-text-secondary transition-colors hover:bg-card-bg hover:text-brand-blue"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Lista de compras</h1>
          <p className="text-sm text-text-secondary">{patientName}</p>
        </div>
      </div>

      {!activeList ? (
        <div className="rounded-3xl border border-border-neutral bg-card-bg p-12 text-center">
          <ShoppingCart className="mx-auto mb-4 h-12 w-12 text-text-secondary opacity-60" />
          <h2 className="text-lg font-semibold text-text-primary">Nenhuma lista gerada</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">
            Quando o paciente gerar a lista no portal, ela aparecera aqui para acompanhamento.
          </p>
        </div>
      ) : (
        <>
          <section className="rounded-3xl border border-border-neutral bg-card-bg p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue">
                  {activeList.status === "ACTIVE" ? "Lista ativa" : "Lista arquivada"}
                </p>
                <h2 className="mt-1 text-xl font-bold text-text-primary">{activeList.title}</h2>
                <p className="mt-1 text-sm text-text-secondary">
                  {activeList.periodDays} dias - {activeList.mealPlan?.title ?? "Sem plano vinculado"}
                </p>
              </div>
              <div className="rounded-2xl bg-warm-surface px-4 py-3 text-sm font-semibold text-text-primary">
                {checked} / {total} comprados
              </div>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-warm-surface">
              <div className="h-full rounded-full bg-brand-blue" style={{ width: `${percent}%` }} />
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            {Array.from(groupedItems.entries()).map(([category, items]) => (
              <section key={category} className="rounded-2xl border border-border-neutral bg-card-bg p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-text-primary">{categoryLabels[category] ?? "Outros"}</h3>
                  <span className="rounded-full bg-warm-surface px-2 py-0.5 text-[11px] font-semibold text-text-secondary">
                    {items.length}
                  </span>
                </div>
                <div className="divide-y divide-border-neutral/60">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 py-3">
                      <CheckCircle2 className={`h-4 w-4 ${item.checked ? "text-emerald-500" : "text-text-tertiary"}`} />
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-semibold ${item.checked ? "text-text-secondary line-through" : "text-text-primary"}`}>
                          {item.name}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {item.quantity ?? "Qtd."}{item.unit ? ` ${item.unit}` : ""} - {item.source === "MANUAL" ? "Manual" : "Plano"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
