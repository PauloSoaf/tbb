import React from "react";
import { HardDrive, Files, TrendingUp, AlertTriangle } from "lucide-react";
import { globalAdminService } from "@/services/global-admin.service";
import { storageUsageService } from "@/services/storageUsage.service";
import { prisma } from "@/lib/prisma";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StorageTenantsTable, type StorageTenantRow } from "@/components/admin/StorageTenantsTable";
import { StorageGrowthChart } from "@/components/admin/StorageGrowthChart";
import { StorageAdminToolbar } from "@/components/admin/StorageAdminToolbar";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 MB";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

const PLAN_COLORS: Record<string, string> = {
  FREE: "bg-slate-400",
  BASIC: "bg-blue-500",
  PRO: "bg-purple-500",
  CLINIC: "bg-emerald-500",
};

export default async function GlobalAdminStoragePage() {
  const [metrics, byPlan, tenantsResult, overrides] = await Promise.all([
    globalAdminService.getGlobalMetrics(),
    storageUsageService.getGlobalStorageByPlan(),
    globalAdminService.listTenants(undefined, undefined, 1, 100),
    prisma.tenantFeatureOverride.findMany({ where: { key: "storage.maxMb" } }),
  ]);

  const overrideByTenant = new Map(overrides.map((o) => [o.tenantId, o]));
  const maxPlanBytes = Math.max(1, ...byPlan.map((p) => p.sizeBytes));
  const avgPerTenant = metrics.totalTenants > 0 ? metrics.totalStorageBytes / metrics.totalTenants : 0;

  const now = new Date();
  const rows: StorageTenantRow[] = tenantsResult.data
    .map((t) => {
      const override = overrideByTenant.get(t.id);
      const notExpired = !!override && (!override.expiresAt || override.expiresAt > now);
      return {
        id: t.id,
        name: t.name,
        slug: t.slug,
        planCode: t.planCode,
        storageBytes: t.storageBytes,
        effectiveLimitMb: notExpired ? override!.limit : t.storageLimitMb,
        hasOverride: notExpired,
        overrideLimitMb: notExpired ? override!.limit : null,
      };
    })
    .sort((a, b) => b.storageBytes - a.storageBytes);

  const nearLimitCount = rows.filter(
    (t) => t.effectiveLimitMb !== null && t.storageBytes >= t.effectiveLimitMb * 1024 * 1024 * 0.8
  ).length;

  return (
    <>
      <AdminPageHeader titleKey="admin.storage.title" subtitleKey="admin.storage.description" />

      <div className="space-y-8 animate-fade-in p-4 lg:p-8">
        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card-bg border border-border-neutral rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">Armazenamento Total</span>
              <div className="p-2.5 rounded-xl bg-brand-blue/10 text-brand-blue"><HardDrive className="w-5 h-5" /></div>
            </div>
            <span className="text-2xl font-extrabold text-text-primary block">{formatBytes(metrics.totalStorageBytes)}</span>
          </div>

          <div className="bg-card-bg border border-border-neutral rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">Total de Arquivos</span>
              <div className="p-2.5 rounded-xl bg-purple-100 text-purple-800"><Files className="w-5 h-5" /></div>
            </div>
            <span className="text-2xl font-extrabold text-text-primary block">{metrics.totalStorageFiles}</span>
          </div>

          <div className="bg-card-bg border border-border-neutral rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">Média por Clínica</span>
              <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800"><TrendingUp className="w-5 h-5" /></div>
            </div>
            <span className="text-2xl font-extrabold text-text-primary block">{formatBytes(avgPerTenant)}</span>
          </div>

          <div className="bg-card-bg border border-border-neutral rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">Perto do Limite (≥80%)</span>
              <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800"><AlertTriangle className="w-5 h-5" /></div>
            </div>
            <span className="text-2xl font-extrabold text-text-primary block">{nearLimitCount}</span>
          </div>
        </div>

        <StorageAdminToolbar />

        {/* Crescimento */}
        <div className="bg-card-bg border border-border-neutral rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-text-primary mb-1">Crescimento (30 dias)</h2>
          <p className="text-xs text-text-secondary mb-2">Soma diária de todas as clínicas, a partir dos snapshots.</p>
          <StorageGrowthChart />
        </div>

        {/* Consumo por plano */}
        <div className="bg-card-bg border border-border-neutral rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-text-primary mb-4">Consumo por Plano</h2>
          <div className="space-y-3">
            {byPlan.length === 0 ? (
              <p className="text-xs text-text-secondary">Nenhum arquivo enviado ainda.</p>
            ) : (
              byPlan.map((p) => (
                <div key={p.planCode}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-mono font-bold text-text-primary">{p.planCode}</span>
                    <span className="text-text-secondary">{formatBytes(p.sizeBytes)} · {p.fileCount} arquivo(s) · {p.tenantCount} clínica(s)</span>
                  </div>
                  <div className="h-2 rounded-full bg-background overflow-hidden">
                    <div
                      className={`h-full rounded-full ${PLAN_COLORS[p.planCode] ?? "bg-brand-blue"}`}
                      style={{ width: `${Math.max(2, (p.sizeBytes / maxPlanBytes) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <StorageTenantsTable rows={rows.slice(0, 100)} />
      </div>
    </>
  );
}
