import React from "react";
import { prisma } from "@/lib/prisma";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PlanFeatureLimitsEditor } from "@/components/admin/PlanFeatureLimitsEditor";

export default async function GlobalAdminPlansPage() {
  const plans = await prisma.subscriptionPlan.findMany({
    orderBy: { priceCents: "asc" },
    include: { featureLimits: { orderBy: { key: "asc" } } },
  });

  return (
    <>
      <AdminPageHeader titleKey="admin.plans.title" subtitleKey="admin.plans.description" />

      <div className="space-y-8 animate-fade-in p-4 lg:p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((p) => {
          const formattedPrice = new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(p.priceCents / 100);

          return (
            <div
              key={p.id}
              className={`bg-card-bg border rounded-2xl p-6 shadow-sm flex flex-col justify-between transition-all ${
                p.code === "PRO" || p.code === "CLINIC" ? "border-brand-blue ring-2 ring-brand-blue/10" : "border-border-neutral"
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-brand-blue/10 text-brand-blue tracking-wider font-mono">
                    {p.code}
                  </span>
                  {p.code === "CLINIC" && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-200">
                      Top Gestão
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-bold text-text-primary">{p.name}</h3>
                  <p className="text-xs text-text-secondary mt-1 leading-relaxed min-h-[36px]">{p.description}</p>
                </div>

                <div className="py-4 border-y border-border-neutral/60">
                  <span className="text-3xl font-extrabold text-text-primary">{formattedPrice}</span>
                  <span className="text-xs text-text-secondary font-medium"> / mês</span>
                </div>

                <ul className="space-y-2.5 text-xs text-text-secondary pt-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Até <strong className="text-text-primary">{p.maxPatients ?? "Ilimitado"}</strong> pacientes ativos
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Até <strong className="text-text-primary">{p.maxTeamMembers ?? 1}</strong> membro(s) na equipe
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Oficina de Planos Alimentares</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Prontuário e Anamnese 360°</span>
                  </li>
                  {(p.code === "PRO" || p.code === "CLINIC") && (
                    <li className="flex items-center gap-2 font-semibold text-brand-blue">
                      <ShieldCheck className="w-4 h-4 text-brand-blue shrink-0" />
                      <span>Trilha de Auditoria & Overrides RBAC</span>
                    </li>
                  )}
                </ul>
              </div>

              <div className="pt-6">
                <div className="w-full text-center py-2.5 bg-background border border-border-neutral rounded-xl text-xs font-semibold text-text-secondary">
                  Código do Plano: <strong className="text-text-primary font-mono">{p.code}</strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <PlanFeatureLimitsEditor plans={plans} />
      </div>
    </>
  );
}
