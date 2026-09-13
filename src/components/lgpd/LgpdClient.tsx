"use client";

import React, { useRef, useState } from "react";
import { ShieldCheck, FileText, Lock, RefreshCw } from "lucide-react";
import { ConsentManagementTab } from "./ConsentManagementTab";
import { DataRequestsTab } from "./DataRequestsTab";
import type { ConsentRecordUIData, DataSubjectRequestUIData } from "@/services/lgpd.service";
import { usePermissions } from "@/lib/tenancy/PermissionsContext";
import { AsyncButton } from "@/components/ui/AsyncButton";

interface Props {
  tenantSlug: string;
  initialConsents: ConsentRecordUIData[];
  initialRequests: DataSubjectRequestUIData[];
  patients: { id: string; name: string }[];
}

export function LgpdClient({ tenantSlug, initialConsents, initialRequests, patients }: Props) {
  const [activeTab, setActiveTab] = useState<"consents" | "requests">("consents");
  const { isOwner, isGlobalAdmin, permissions } = usePermissions();
  const [consents] = useState(initialConsents);
  const [requests] = useState(initialRequests);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshRequestedRef = useRef(false);

  const canViewLgpd = isOwner || isGlobalAdmin || permissions.has("lgpd.view");

  if (!canViewLgpd) {
    return (
      <div className="bg-card-bg border border-red-200/60 rounded-2xl p-12 text-center text-red-800 dark:text-red-300 shadow-sm max-w-xl mx-auto my-12">
        <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4 text-red-600">
          <Lock className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold">Acesso Restrito</h2>
        <p className="text-xs text-text-secondary mt-2 max-w-md mx-auto leading-relaxed">
          Você não possui permissão para acessar a Central de Privacidade e Governança de Dados LGPD (`lgpd.view`).
        </p>
      </div>
    );
  }

  const handleRefresh = () => {
    if (refreshRequestedRef.current) return;

    refreshRequestedRef.current = true;
    setIsRefreshing(true);
    window.requestAnimationFrame(() => window.location.reload());
  };

  return (
    <div className="space-y-6">
      <div className="bg-card-bg border border-border-neutral rounded-2xl p-2 shadow-sm flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab("consents")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs transition-all ${
              activeTab === "consents"
                ? "bg-brand-blue text-white shadow-md"
                : "text-text-secondary hover:text-text-primary hover:bg-border-neutral/30"
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> Gestão de Consentimentos
          </button>

          <button
            onClick={() => setActiveTab("requests")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs transition-all ${
              activeTab === "requests"
                ? "bg-brand-blue text-white shadow-md"
                : "text-text-secondary hover:text-text-primary hover:bg-border-neutral/30"
            }`}
          >
            <FileText className="w-4 h-4" /> Solicitações de Titulares (Art. 18)
          </button>
        </div>

        <AsyncButton
          onClick={handleRefresh}
          pending={isRefreshing}
          pendingLabel={null}
          className="p-2 text-text-secondary hover:text-text-primary rounded-xl hover:bg-border-neutral/40 transition-colors mr-2"
          title="Atualizar lista"
          aria-label="Atualizar lista"
        >
          <RefreshCw className="w-4 h-4" />
        </AsyncButton>
      </div>

      <div className="transition-all animate-fade-in">
        {activeTab === "consents" && (
          <ConsentManagementTab tenantSlug={tenantSlug} consents={consents} onRefresh={handleRefresh} patients={patients} />
        )}
        {activeTab === "requests" && (
          <DataRequestsTab tenantSlug={tenantSlug} requests={requests} onRefresh={handleRefresh} patients={patients} />
        )}
      </div>
    </div>
  );
}
