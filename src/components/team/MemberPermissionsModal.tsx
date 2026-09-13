"use client";

import React, { useState, useEffect, useTransition } from "react";
import { X, Shield, ShieldAlert, Check, Lock, Loader2, Search, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { getPermissionsCatalogAction, getMemberPermissionsAction, updateMemberPermissionsAction } from "@/actions/permission.action";
import type { TeamMemberRole, PermissionEffect } from "@prisma/client";

interface Member {
  id: string;
  email: string;
  name: string;
  role: TeamMemberRole;
}

interface Props {
  tenantSlug: string;
  member: Member;
  onClose: () => void;
}

interface CatalogItem {
  id: string;
  key: string;
  resource: string;
  action: string;
  description: string;
}

const RESOURCE_LABELS: Record<string, string> = {
  patients: "Pacientes",
  anamnesis: "Anamnese & Pré-consulta",
  mealPlans: "Planos Alimentares",
  appointments: "Agendamento & Consultas",
  team: "Gestão da Equipe",
  billing: "Financeiro & Assinatura",
  reports: "Relatórios & Métricas",
  settings: "Configurações da Clínica",
  medicalRecords: "Prontuário & Anotações",
  global: "Sistema Global",
};

export function MemberPermissionsModal({ tenantSlug, member, onClose }: Props) {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<Map<string, PermissionEffect>>(new Map()); // permissionId -> effect
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let mounted = true;
    async function load() {
      setIsLoading(true);
      try {
        const [catRes, permRes] = await Promise.all([
          getPermissionsCatalogAction(tenantSlug),
          getMemberPermissionsAction(tenantSlug, member.id),
        ]);

        if (mounted) {
          if (catRes.catalog) setCatalog(catRes.catalog);
          if (permRes.data) {
            setRolePermissions(new Set(permRes.data.rolePermissions));
            const map = new Map<string, PermissionEffect>();
            permRes.data.overrides.forEach((ov) => map.set(ov.permissionId, ov.effect));
            setOverrides(map);
          }
        }
      } catch {
        if (mounted) toast.error("Erro ao carregar permissões do membro.");
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [tenantSlug, member.id]);

  const handleSetEffect = (permissionId: string, effect: PermissionEffect | "INHERIT") => {
    if (member.role === "OWNER") {
      toast.info("O Dono da clínica possui todas as permissões por padrão.");
      return;
    }
    setOverrides((prev) => {
      const next = new Map(prev);
      if (effect === "INHERIT") {
        next.delete(permissionId);
      } else {
        next.set(permissionId, effect);
      }
      return next;
    });
  };

  const handleSave = () => {
    startTransition(async () => {
      const payload: { permissionId: string; effect: PermissionEffect }[] = [];
      overrides.forEach((effect, permissionId) => {
        payload.push({ permissionId, effect });
      });

      const res = await updateMemberPermissionsAction(tenantSlug, member.id, payload);
      if (res.success) {
        toast.success("Permissões salvas com sucesso!");
        onClose();
      } else {
        toast.error(res.error || "Erro ao salvar permissões.");
      }
    });
  };

  const filteredCatalog = catalog.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const resLabel = RESOURCE_LABELS[item.resource] || item.resource;
    return (
      item.description.toLowerCase().includes(q) ||
      item.key.toLowerCase().includes(q) ||
      resLabel.toLowerCase().includes(q)
    );
  });

  const groupedCatalog = filteredCatalog.reduce((acc, item) => {
    if (!acc[item.resource]) acc[item.resource] = [];
    acc[item.resource].push(item);
    return acc;
  }, {} as Record<string, CatalogItem[]>);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card-bg border border-border-neutral rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-text-primary">
        {/* Header */}
        <div className="p-6 border-b border-border-neutral flex items-center justify-between bg-brand-blue/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Permissões de Acesso</h2>
              <p className="text-xs text-text-secondary">
                Personalize o acesso granular de <strong className="text-text-primary font-semibold">{member.name}</strong> ({member.email})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-border-neutral/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search and Info */}
        <div className="p-4 border-b border-border-neutral flex flex-col sm:flex-row items-center justify-between gap-3 bg-card-bg">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar permissão (ex: exportar pacientes, editar prontuário)..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border-neutral rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/40 transition-all"
            />
          </div>
          {member.role === "OWNER" ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-100 text-purple-700 text-xs font-semibold">
              <Lock className="w-3.5 h-3.5" /> Dono (Acesso Irrestrito)
            </div>
          ) : (
            <button
              onClick={() => setOverrides(new Map())}
              disabled={overrides.size === 0 || isPending}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-text-secondary hover:text-brand-blue rounded-xl hover:bg-brand-blue/5 disabled:opacity-40 transition-colors shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Restaurar Padrão do Cargo
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-text-secondary">
              <Loader2 className="w-8 h-8 animate-spin text-brand-blue mb-3" />
              <p className="text-sm font-medium">Carregando catálogo de permissões...</p>
            </div>
          ) : Object.keys(groupedCatalog).length === 0 ? (
            <div className="text-center py-12 text-text-secondary">
              <ShieldAlert className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">Nenhuma permissão encontrada para &ldquo;{searchQuery}&rdquo;</p>
            </div>
          ) : (
            Object.entries(groupedCatalog).map(([resourceKey, items]) => {
              const groupLabel = RESOURCE_LABELS[resourceKey] || resourceKey;
              return (
                <div key={resourceKey} className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary border-b border-border-neutral/60 pb-1.5">
                    {groupLabel}
                  </h3>
                  <div className="space-y-2">
                    {items.map((perm) => {
                      const isInheritedAllowed = rolePermissions.has(perm.key);
                      const currentOverride = overrides.get(perm.id);
                      const isEffectiveAllowed =
                        member.role === "OWNER"
                          ? true
                          : currentOverride === "ALLOW"
                          ? true
                          : currentOverride === "DENY"
                          ? false
                          : isInheritedAllowed;

                      return (
                        <div
                          key={perm.id}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border transition-all gap-3 ${
                            isEffectiveAllowed
                              ? "bg-card-bg border-border-neutral"
                              : "bg-background/60 border-border-neutral/50 opacity-75"
                          }`}
                        >
                          <div className="space-y-0.5 pr-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-text-primary">
                                {perm.description}
                              </span>
                              <code className="text-[10px] px-1.5 py-0.5 rounded bg-border-neutral/50 text-text-secondary">
                                {perm.key}
                              </code>
                            </div>
                          </div>

                          {/* 3-way toggle buttons */}
                          <div className="flex items-center gap-1 shrink-0 bg-background/80 p-1 rounded-xl border border-border-neutral/60 self-start sm:self-auto">
                            <button
                              type="button"
                              disabled={member.role === "OWNER" || isPending}
                              onClick={() => handleSetEffect(perm.id, "INHERIT")}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                                !currentOverride
                                  ? "bg-brand-blue/15 text-brand-blue font-semibold shadow-sm"
                                  : "text-text-secondary hover:text-text-primary"
                              }`}
                              title={isInheritedAllowed ? "Padrão do cargo (Permitido)" : "Padrão do cargo (Bloqueado)"}
                            >
                              Padrão ({isInheritedAllowed ? "Sim" : "Não"})
                            </button>
                            <button
                              type="button"
                              disabled={member.role === "OWNER" || isPending}
                              onClick={() => handleSetEffect(perm.id, "ALLOW")}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                                currentOverride === "ALLOW"
                                  ? "bg-emerald-500 text-white font-semibold shadow-sm"
                                  : "text-text-secondary hover:text-emerald-600"
                              }`}
                            >
                              <Check className="w-3 h-3" /> Permitir
                            </button>
                            <button
                              type="button"
                              disabled={member.role === "OWNER" || isPending}
                              onClick={() => handleSetEffect(perm.id, "DENY")}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                                currentOverride === "DENY"
                                  ? "bg-red-500 text-white font-semibold shadow-sm"
                                  : "text-text-secondary hover:text-red-600"
                              }`}
                            >
                              <X className="w-3 h-3" /> Bloquear
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border-neutral bg-card-bg flex items-center justify-between gap-3">
          <div className="text-xs text-text-secondary">
            {overrides.size === 0 ? (
              <span>Nenhuma exceção configurada (seguindo padrão do cargo).</span>
            ) : (
              <span className="font-semibold text-brand-blue">
                {overrides.size} {overrides.size === 1 ? "exceção configurada" : "exceções configuradas"}.
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary rounded-xl hover:bg-border-neutral/30 transition-colors"
            >
              Cancelar
            </button>
            {member.role !== "OWNER" && (
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending || isLoading}
                className="flex items-center gap-2 px-5 py-2 bg-brand-blue hover:bg-brand-blue/90 text-white text-sm font-semibold rounded-xl shadow-md transition-all disabled:opacity-50"
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Salvar Permissões
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
