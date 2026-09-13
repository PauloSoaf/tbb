"use client";

import React, { useState } from "react";
import { Shield, FileText, Laptop, AlertTriangle, Lock } from "lucide-react";
import { AuditTimelineTab } from "./AuditTimelineTab";
import { SessionsTab } from "./SessionsTab";
import { SecurityAlertsTab } from "./SecurityAlertsTab";
import { usePermissions, Can } from "@/lib/tenancy/PermissionsContext";

interface Props {
  tenantSlug: string;
}

export function SecurityAndAuditClient({ tenantSlug }: Props) {
  const { isOwner, isGlobalAdmin, permissions } = usePermissions();
  const canViewAudit = isOwner || isGlobalAdmin || permissions.has("auditLogs.view");
  const canViewSessions = isOwner || isGlobalAdmin || permissions.has("sessions.viewOwn") || permissions.has("sessions.viewTeam");
  const canViewAlerts = isOwner || isGlobalAdmin || permissions.has("securityEvents.view");

  const [activeTab, setActiveTab] = useState<"audit" | "sessions" | "alerts">(
    canViewAudit ? "audit" : canViewSessions ? "sessions" : "alerts"
  );

  if (!canViewAudit && !canViewSessions && !canViewAlerts) {
    return (
      <div className="bg-card-bg border border-red-200/60 rounded-2xl p-12 text-center text-red-800 dark:text-red-300 shadow-sm max-w-xl mx-auto my-12">
        <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4 text-red-600">
          <Lock className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold">Acesso Restrito</h2>
        <p className="text-xs text-text-secondary mt-2 max-w-md mx-auto leading-relaxed">
          Você não possui permissão para acessar o painel de governança, segurança e auditoria da clínica (`auditLogs.view` / `sessions.viewOwn`).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Header */}
      <div className="bg-card-bg border border-border-neutral rounded-2xl p-2 shadow-sm flex flex-wrap gap-2">
        {canViewAudit && (
          <button
            onClick={() => setActiveTab("audit")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs transition-all ${
              activeTab === "audit"
                ? "bg-brand-blue text-white shadow-md"
                : "text-text-secondary hover:text-text-primary hover:bg-border-neutral/30"
            }`}
          >
            <FileText className="w-4 h-4" /> Trilha de Auditoria
          </button>
        )}

        {canViewSessions && (
          <button
            onClick={() => setActiveTab("sessions")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs transition-all ${
              activeTab === "sessions"
                ? "bg-brand-blue text-white shadow-md"
                : "text-text-secondary hover:text-text-primary hover:bg-border-neutral/30"
            }`}
          >
            <Laptop className="w-4 h-4" /> Sessões Ativas
          </button>
        )}

        {canViewAlerts && (
          <button
            onClick={() => setActiveTab("alerts")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs transition-all ${
              activeTab === "alerts"
                ? "bg-brand-blue text-white shadow-md"
                : "text-text-secondary hover:text-text-primary hover:bg-border-neutral/30"
            }`}
          >
            <AlertTriangle className="w-4 h-4" /> Alertas de Segurança
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="transition-all animate-fade-in">
        {activeTab === "audit" && canViewAudit && <AuditTimelineTab tenantSlug={tenantSlug} />}
        {activeTab === "sessions" && canViewSessions && <SessionsTab tenantSlug={tenantSlug} />}
        {activeTab === "alerts" && canViewAlerts && <SecurityAlertsTab tenantSlug={tenantSlug} />}
      </div>
    </div>
  );
}
