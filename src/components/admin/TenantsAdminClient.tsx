"use client";

import React, { useRef, useState, useTransition } from "react";
import { Search, Building2, Users, ExternalLink, ChevronLeft, ChevronRight, Loader2, HardDrive } from "lucide-react";
import { toast } from "sonner";
import { listTenantsAdminAction, updateTenantPlanAdminAction } from "@/actions/global-admin.action";
import type { TenantAdminUIData } from "@/services/global-admin.service";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 MB";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

interface Props {
  initialData: { data: TenantAdminUIData[]; total: number; totalPages: number; page: number };
}

type PaginationDirection = "previous" | "next";

export function TenantsAdminClient({ initialData }: Props) {
  const { t } = useI18n();
  const { confirm, confirmDialog } = useConfirmDialog();
  const [data, setData] = useState(initialData);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("ALL");
  const [isPending, startTransition] = useTransition();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [paginationDirection, setPaginationDirection] = useState<PaginationDirection | null>(null);
  const paginationDirectionRef = useRef<PaginationDirection | null>(null);

  const loadTenants = (pageNum = 1, direction?: PaginationDirection) => {
    if (direction && paginationDirectionRef.current) return;

    if (direction) {
      paginationDirectionRef.current = direction;
      setPaginationDirection(direction);
    }

    startTransition(async () => {
      try {
        const res = await listTenantsAdminAction(search || undefined, planFilter === "ALL" ? undefined : planFilter, pageNum);
        if (res.result) {
          setData(res.result);
        } else {
          toast.error(res.error || t("admin.tenants.loadError"));
        }
      } finally {
        if (direction) {
          paginationDirectionRef.current = null;
          setPaginationDirection(null);
        }
      }
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadTenants(1);
  };

  const handleChangePlan = async (tenantSlugOrId: string, tenantName: string, newPlanCode: string, newStatus = "ACTIVE") => {
    const confirmed = await confirm({
      title: t("admin.tenants.confirmChangeTitle"),
      description: t("admin.tenants.confirmChangeDescription", { name: tenantName, plan: newPlanCode }),
      tone: "info",
    });
    if (!confirmed) return;

    setUpdatingId(tenantSlugOrId);
    startTransition(async () => {
      const res = await updateTenantPlanAdminAction(tenantSlugOrId, newPlanCode, newStatus);
      if (res.success) {
        toast.success(t("admin.tenants.planChanged", { plan: newPlanCode }));
        loadTenants(data.page);
      } else {
        toast.error(res.error || t("admin.tenants.changeError"));
      }
      setUpdatingId(null);
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {confirmDialog}

      {/* Filter Bar */}
      <div className="bg-card-bg border border-border-neutral rounded-2xl p-4 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("admin.tenants.searchPlaceholder")}
              aria-label={t("admin.tenants.searchPlaceholder")}
              className="w-full pl-10 pr-4 py-2 text-sm bg-background border border-border-neutral rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/30 transition-all text-text-primary"
            />
          </div>

          <select
            value={planFilter}
            onChange={(e) => {
              setPlanFilter(e.target.value);
              loadTenants(1);
            }}
            aria-label={t("admin.tenants.allPlans")}
            className="text-sm bg-background border border-border-neutral rounded-xl px-3 py-2 text-text-primary focus:outline-none w-full sm:w-auto"
          >
            <option value="ALL">{t("admin.tenants.allPlans")}</option>
            <option value="FREE">Gratuito (FREE)</option>
            <option value="BASIC">Starter (BASIC)</option>
            <option value="PRO">Profissional (PRO)</option>
            <option value="CLINIC">Clínica & Equipe (CLINIC)</option>
          </select>

          <button
            type="submit"
            disabled={isPending}
            className="flex items-center justify-center gap-2 px-5 py-2 bg-brand-blue text-white text-sm font-semibold rounded-xl hover:bg-brand-blue/90 transition-colors shrink-0 shadow-sm disabled:opacity-50"
          >
            {isPending && paginationDirection === null && updatingId === null && <Loader2 className="w-4 h-4 animate-spin" />}
            {t("admin.tenants.search")}
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-card-bg border border-border-neutral rounded-2xl overflow-hidden shadow-sm">
        {data.data.length === 0 ? (
          <div className="p-12 text-center text-text-secondary">
            <Building2 className="w-12 h-12 text-border-neutral mx-auto mb-3 opacity-60" />
            <p className="text-base font-semibold text-text-primary">{t("admin.tenants.emptyTitle")}</p>
            <p className="text-xs text-text-secondary mt-1">{t("admin.tenants.emptyDescription")}</p>
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-neutral bg-background/50 text-xs font-bold uppercase tracking-wider text-text-secondary">
                <th className="py-3 px-4">{t("admin.tenants.clinic")}</th>
                <th className="py-3 px-4">{t("admin.tenants.slugAndCrn")}</th>
                <th className="py-3 px-4">{t("admin.tenants.patientsAndTeam")}</th>
                <th className="py-3 px-4">Armazenamento</th>
                <th className="py-3 px-4">{t("admin.tenants.currentPlan")}</th>
                <th className="py-3 px-4">{t("admin.tenants.createdAt")}</th>
                <th className="py-3 px-4 text-right">{t("admin.tenants.quickPlanChange")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-neutral/40 text-sm">
              {data.data.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-brand-blue/5 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-text-primary flex items-center gap-1.5">
                      {tenant.name}
                      <Link
                        href={`/dashboard/${tenant.slug}`}
                        target="_blank"
                        className="text-text-secondary hover:text-brand-blue transition-colors"
                        title={t("admin.tenants.clinic")}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                    <p className="text-xs text-text-secondary truncate max-w-xs">{tenant.email}</p>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs">
                    <span className="block text-brand-blue font-bold">/{tenant.slug}</span>
                    {tenant.crn && <span className="text-text-secondary block">{tenant.crn}</span>}
                  </td>
                  <td className="py-3.5 px-4 text-xs">
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-purple-600" />
                      <strong className="text-text-primary">{tenant.patientCount}</strong> pac.
                    </div>
                    <span className="text-text-secondary block">{tenant.teamMemberCount} membro(s)</span>
                  </td>
                  <td className="py-3.5 px-4 text-xs">
                    <div className="flex items-center gap-1">
                      <HardDrive className="w-3.5 h-3.5 text-brand-blue shrink-0" />
                      <strong className="text-text-primary">{formatBytes(tenant.storageBytes)}</strong>
                    </div>
                    <span className="text-text-secondary block">
                      {tenant.storageLimitMb !== null ? `de ${formatBytes(tenant.storageLimitMb * 1024 * 1024)}` : "sem limite"}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-text-primary">{tenant.planCode}</span>
                      {tenant.subscriptionStatus === "ACTIVE" ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                          Ativo
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800">
                          {tenant.subscriptionStatus}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-text-secondary block">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(tenant.priceCents / 100)}/mês
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-text-secondary font-mono">
                    {format(new Date(tenant.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <label className="sr-only" htmlFor={`plan-${tenant.id}`}>{t("admin.tenants.quickPlanChange")}</label>
                      <select
                        id={`plan-${tenant.id}`}
                        value={tenant.planCode}
                        disabled={updatingId === tenant.id || isPending}
                        onChange={(e) => handleChangePlan(tenant.id, tenant.name, e.target.value, "ACTIVE")}
                        className="text-xs bg-background border border-border-neutral rounded-lg px-2.5 py-1.5 text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-blue disabled:opacity-50 font-semibold cursor-pointer shadow-xs"
                      >
                        <option value="FREE">FREE</option>
                        <option value="BASIC">BASIC</option>
                        <option value="PRO">PRO</option>
                        <option value="CLINIC">CLINIC</option>
                      </select>

                      {updatingId === tenant.id && <Loader2 className="w-4 h-4 animate-spin text-brand-blue" />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}

        {/* Pagination */}
        <div className="p-4 border-t border-border-neutral flex items-center justify-between bg-background/30 text-xs text-text-secondary">
          <div>
            {t("admin.tenants.showingPage", { page: data.page, totalPages: data.totalPages, total: data.total })}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={data.page <= 1 || isPending}
              onClick={() => loadTenants(data.page - 1, "previous")}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border-neutral bg-card-bg hover:bg-border-neutral/30 disabled:opacity-40 transition-colors"
            >
              {paginationDirection === "previous"
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <ChevronLeft className="w-3.5 h-3.5" />}
              {t("admin.tenants.previous")}
            </button>
            <button
              type="button"
              disabled={data.page >= data.totalPages || isPending}
              onClick={() => loadTenants(data.page + 1, "next")}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border-neutral bg-card-bg hover:bg-border-neutral/30 disabled:opacity-40 transition-colors"
            >
              {t("admin.tenants.next")}
              {paginationDirection === "next"
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
