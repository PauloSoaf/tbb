"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { TenantStorageOverrideEditor } from "@/components/admin/TenantStorageOverrideEditor";
import { TenantStorageDrawer } from "@/components/admin/TenantStorageDrawer";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 MB";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

export interface StorageTenantRow {
  id: string;
  name: string;
  slug: string;
  planCode: string;
  storageBytes: number;
  effectiveLimitMb: number | null;
  hasOverride: boolean;
  overrideLimitMb: number | null;
}

const STATUS_LABEL: Record<string, string> = {
  unlimited: "Ilimitado",
  normal: "Normal",
  attention: "Atenção",
  near_limit: "Perto do limite",
  blocked: "Bloqueado",
};

const STATUS_COLOR: Record<string, string> = {
  unlimited: "bg-slate-100 text-slate-700",
  normal: "bg-emerald-100 text-emerald-800",
  attention: "bg-amber-100 text-amber-800",
  near_limit: "bg-orange-100 text-orange-800",
  blocked: "bg-red-100 text-red-800",
};

function statusFor(percent: number | null): string {
  if (percent === null) return "unlimited";
  if (percent >= 100) return "blocked";
  if (percent >= 90) return "near_limit";
  if (percent >= 70) return "attention";
  return "normal";
}

export function StorageTenantsTable({ rows }: { rows: StorageTenantRow[] }) {
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);

  return (
    <div className="bg-card-bg border border-border-neutral rounded-2xl overflow-visible shadow-sm">
      <div className="p-4 border-b border-border-neutral">
        <h2 className="text-sm font-bold text-text-primary">Consumo por Clínica (top 100)</h2>
        <p className="text-xs text-text-secondary mt-0.5">Ordenado por maior consumo. Exceções valem sobre o limite do plano.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border-neutral bg-background/50 text-xs font-bold uppercase tracking-wider text-text-secondary">
              <th className="py-3 px-4">Clínica</th>
              <th className="py-3 px-4">Plano</th>
              <th className="py-3 px-4">Uso</th>
              <th className="py-3 px-4">Limite Efetivo</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-neutral/40 text-sm">
            {rows.map((t) => {
              const limitBytes = t.effectiveLimitMb !== null ? t.effectiveLimitMb * 1024 * 1024 : null;
              const percent = limitBytes ? Math.round((t.storageBytes / limitBytes) * 100) : null;
              const status = statusFor(percent);

              return (
                <tr key={t.id} className="hover:bg-brand-blue/5 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-semibold text-text-primary block">{t.name}</span>
                    <span className="text-xs text-text-secondary">/{t.slug}</span>
                  </td>
                  <td className="py-3 px-4 font-mono text-xs">{t.planCode}</td>
                  <td className="py-3 px-4 text-xs font-semibold text-text-primary">{formatBytes(t.storageBytes)}</td>
                  <td className="py-3 px-4 text-xs text-text-secondary">
                    {limitBytes !== null ? formatBytes(limitBytes) : "Ilimitado"}
                    {t.hasOverride && <span className="ml-1 text-brand-blue font-semibold">(exceção)</span>}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${STATUS_COLOR[status]}`}>{STATUS_LABEL[status]}</span>
                  </td>
                  <td className="py-3 px-4 text-right relative">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setSelected({ id: t.id, name: t.name })}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-text-secondary hover:text-brand-blue"
                      >
                        <Info className="w-3 h-3" /> Detalhes
                      </button>
                      <TenantStorageOverrideEditor
                        tenantId={t.id}
                        tenantName={t.name}
                        currentLimitMb={t.hasOverride ? t.overrideLimitMb : null}
                        hasOverride={t.hasOverride}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected && (
        <TenantStorageDrawer key={selected.id} tenantId={selected.id} tenantName={selected.name} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
