"use client";

import { useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { updatePlanFeatureLimitAdminAction } from "@/actions/admin-billing.action";

export interface PlanWithLimits {
  code: string;
  featureLimits: { key: string; limit: number | null; enabled: boolean }[];
}

interface Props {
  plans: PlanWithLimits[];
}

const KEY_LABELS: Record<string, string> = {
  "patients.max": "Máx. de pacientes",
  "team.max": "Máx. de membros na equipe",
  "mealPlanPdf.monthly": "PDFs de plano / mês",
  "storage.maxMb": "Armazenamento (MB)",
  "auditTrail.enabled": "Trilha de auditoria",
  "rbacOverrides.enabled": "Overrides de RBAC por membro",
};

const KEY_ORDER = [
  "patients.max",
  "team.max",
  "mealPlanPdf.monthly",
  "storage.maxMb",
  "auditTrail.enabled",
  "rbacOverrides.enabled",
];

function EditableCell({ planCode, fkey, limit, enabled }: { planCode: string; fkey: string; limit: number | null; enabled: boolean }) {
  const [limitValue, setLimitValue] = useState<string>(limit === null ? "" : String(limit));
  const [enabledValue, setEnabledValue] = useState(enabled);
  const [isPending, startTransition] = useTransition();
  const [dirty, setDirty] = useState(false);

  const save = () => {
    const parsedLimit = limitValue.trim() === "" ? null : Number(limitValue);
    if (parsedLimit !== null && (!Number.isFinite(parsedLimit) || parsedLimit < 0)) {
      toast.error("Informe um número válido ou deixe vazio para ilimitado.");
      return;
    }
    startTransition(async () => {
      const res = await updatePlanFeatureLimitAdminAction(planCode, fkey, parsedLimit, enabledValue);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`${KEY_LABELS[fkey] ?? fkey} atualizado para ${planCode}.`);
        setDirty(false);
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={0}
        placeholder="∞"
        value={limitValue}
        onChange={(e) => {
          setLimitValue(e.target.value);
          setDirty(true);
        }}
        className="w-20 text-xs bg-background border border-border-neutral rounded-lg px-2 py-1.5 text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-blue"
        aria-label={`Limite de ${KEY_LABELS[fkey] ?? fkey} para o plano ${planCode}`}
      />
      <label className="flex items-center gap-1 text-[11px] text-text-secondary cursor-pointer">
        <input
          type="checkbox"
          checked={enabledValue}
          onChange={(e) => {
            setEnabledValue(e.target.checked);
            setDirty(true);
          }}
          className="accent-brand-blue"
        />
        ativo
      </label>
      <button
        type="button"
        onClick={save}
        disabled={!dirty || isPending}
        title="Salvar"
        className="p-1.5 rounded-lg text-brand-blue hover:bg-brand-blue/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
      >
        {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

export function PlanFeatureLimitsEditor({ plans }: Props) {
  const keys = Array.from(
    new Set([...KEY_ORDER, ...plans.flatMap((p) => p.featureLimits.map((f) => f.key))])
  ).filter((k) => KEY_ORDER.includes(k) || plans.some((p) => p.featureLimits.some((f) => f.key === k)));

  return (
    <div className="bg-card-bg border border-border-neutral rounded-2xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-border-neutral">
        <h2 className="text-sm font-bold text-text-primary">Limites e recursos por plano</h2>
        <p className="text-xs text-text-secondary mt-0.5">
          Deixe o campo numérico vazio para ilimitado. Alterações aplicam imediatamente a todos os tenants desse plano.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border-neutral bg-background/50 text-xs font-bold uppercase tracking-wider text-text-secondary">
              <th className="py-3 px-4">Recurso</th>
              {plans.map((p) => (
                <th key={p.code} className="py-3 px-4 font-mono">{p.code}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-neutral/40 text-sm">
            {keys.map((key) => (
              <tr key={key} className="hover:bg-brand-blue/5 transition-colors">
                <td className="py-3 px-4 font-medium text-text-primary whitespace-nowrap">
                  {KEY_LABELS[key] ?? key}
                </td>
                {plans.map((p) => {
                  const fl = p.featureLimits.find((f) => f.key === key);
                  return (
                    <td key={p.code} className="py-2.5 px-4">
                      <EditableCell planCode={p.code} fkey={key} limit={fl?.limit ?? null} enabled={fl?.enabled ?? false} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
