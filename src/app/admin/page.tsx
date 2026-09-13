import React from "react";
import { globalAdminService } from "@/services/global-admin.service";
import { GlobalAdminCharts } from "@/components/admin/GlobalAdminCharts";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Building2, Users, DollarSign, Activity, TrendingUp, LogIn, ShieldAlert, ShieldX, ShieldCheck, HardDrive, AudioLines, Wifi, WifiOff } from "lucide-react";
import {
  getGlobalTranscriptionMetrics,
  getTranscriptionProviderStatus,
} from "@/services/transcription/transcription-session.service";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 MB";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

export default async function GlobalAdminOverviewPage() {
  const [metrics, transcriptionMetrics, transcriptionProvider] = await Promise.all([
    globalAdminService.getGlobalMetrics(),
    getGlobalTranscriptionMetrics(),
    getTranscriptionProviderStatus(),
  ]);

  const formattedMrr = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(metrics.estimatedMrrCents / 100);

  return (
    <>
      <AdminPageHeader titleKey="admin.global.title" />

      <div className="space-y-8 animate-fade-in p-4 lg:p-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card-bg border border-border-neutral rounded-2xl p-5 shadow-sm space-y-3 hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">Receita MRR Estimada</span>
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-extrabold text-emerald-600">{formattedMrr}</span>
            <p className="text-[11px] text-text-secondary mt-1">Baseado em assinaturas ativas/trial pagas</p>
          </div>
        </div>

        <div className="bg-card-bg border border-border-neutral rounded-2xl p-5 shadow-sm space-y-3 hover:border-brand-blue/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">Clínicas / Tenants</span>
            <div className="p-2.5 rounded-xl bg-brand-blue/10 text-brand-blue">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-text-primary">{metrics.totalTenants}</span>
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
                <TrendingUp className="w-3.5 h-3.5" /> +{metrics.newTenantsLast30Days} nos últimos 30d
              </span>
            </div>
            <p className="text-[11px] text-text-secondary mt-1">Nutricionistas/equipes cadastradas</p>
          </div>
        </div>

        <div className="bg-card-bg border border-border-neutral rounded-2xl p-5 shadow-sm space-y-3 hover:border-purple-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">Pacientes Ativos</span>
            <div className="p-2.5 rounded-xl bg-purple-100 text-purple-800">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-extrabold text-text-primary">{metrics.totalPatients}</span>
            <p className="text-[11px] text-text-secondary mt-1">Total de pacientes geridos pelas clínicas</p>
          </div>
        </div>

        <div className="bg-card-bg border border-border-neutral rounded-2xl p-5 shadow-sm space-y-3 hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">Membros de Equipe</span>
            <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-extrabold text-text-primary">{metrics.totalTeamMembers}</span>
            <p className="text-[11px] text-text-secondary mt-1">Nutricionistas, secretárias e estagiários</p>
          </div>
        </div>
      </div>

      {/* Sessões & Segurança */}
      <div>
        <h2 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-3">Sessões & Segurança (Cross-Tenant)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card-bg border border-border-neutral rounded-2xl p-5 shadow-sm space-y-3 hover:border-brand-blue/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">Sessões Ativas</span>
              <div className="p-2.5 rounded-xl bg-brand-blue/10 text-brand-blue">
                <Activity className="w-5 h-5" />
              </div>
            </div>
            <div>
              <span className="text-2xl font-extrabold text-text-primary">{metrics.activeSessions}</span>
              <p className="text-[11px] text-text-secondary mt-1">Dispositivos logados neste momento</p>
            </div>
          </div>

          <div className="bg-card-bg border border-border-neutral rounded-2xl p-5 shadow-sm space-y-3 hover:border-emerald-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">Logins (7 dias)</span>
              <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800">
                <LogIn className="w-5 h-5" />
              </div>
            </div>
            <div>
              <span className="text-2xl font-extrabold text-text-primary">{metrics.loginsLast7Days}</span>
              <p className="text-[11px] text-text-secondary mt-1">Autenticações bem-sucedidas na semana</p>
            </div>
          </div>

          <div className="bg-card-bg border border-border-neutral rounded-2xl p-5 shadow-sm space-y-3 hover:border-red-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">Acessos Negados (30d)</span>
              <div className="p-2.5 rounded-xl bg-red-100 text-red-800">
                <ShieldX className="w-5 h-5" />
              </div>
            </div>
            <div>
              <span className="text-2xl font-extrabold text-text-primary">{metrics.deniedAccessLast30Days}</span>
              <p className="text-[11px] text-text-secondary mt-1">Tentativas bloqueadas por RBAC</p>
            </div>
          </div>

          <div className="bg-card-bg border border-border-neutral rounded-2xl p-5 shadow-sm space-y-3 hover:border-amber-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">Ações Sensíveis (30d)</span>
              <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800">
                <ShieldAlert className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-text-primary">{metrics.sensitiveActionsLast30Days}</span>
                {metrics.openSecurityEvents > 0 && (
                  <span className="text-xs font-bold text-red-600 flex items-center gap-0.5">
                    <ShieldCheck className="w-3.5 h-3.5" /> {metrics.openSecurityEvents} alerta(s) aberto(s)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-text-secondary mt-1">Exclusões, arquivamentos e revogações</p>
            </div>
          </div>
        </div>
      </div>

      {/* Armazenamento */}
      <div>
        <h2 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-3">Armazenamento (Backend, Cross-Tenant)</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-card-bg border border-border-neutral rounded-2xl p-5 shadow-sm space-y-3 hover:border-brand-blue/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">Armazenamento Total</span>
              <div className="p-2.5 rounded-xl bg-brand-blue/10 text-brand-blue">
                <HardDrive className="w-5 h-5" />
              </div>
            </div>
            <div>
              <span className="text-2xl font-extrabold text-text-primary">{formatBytes(metrics.totalStorageBytes)}</span>
              <p className="text-[11px] text-text-secondary mt-1">{metrics.totalStorageFiles} arquivo(s) em todas as clínicas</p>
            </div>
          </div>

          <div className="lg:col-span-2 bg-card-bg border border-border-neutral rounded-2xl p-5 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">Clínicas que mais consomem</span>
            <div className="mt-3 space-y-2">
              {metrics.topStorageTenants.length === 0 ? (
                <p className="text-xs text-text-secondary">Nenhum arquivo enviado ainda.</p>
              ) : (
                metrics.topStorageTenants.map((t) => (
                  <div key={t.tenantId} className="flex items-center justify-between text-xs border-b border-border-neutral/40 last:border-0 py-1.5">
                    <div className="min-w-0">
                      <span className="font-semibold text-text-primary truncate block">{t.name}</span>
                      <span className="text-text-secondary">/{t.slug} · {t.fileCount} arquivo(s)</span>
                    </div>
                    <span className="font-bold text-brand-blue shrink-0 ml-3">{formatBytes(t.sizeBytes)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Transcrição - somente métricas agregadas, nunca conteúdo clínico */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-text-secondary">
          <AudioLines className="h-4 w-4" />
          Infraestrutura de transcrição
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="border-b border-border-neutral bg-card-bg p-5">
            <span className="flex items-center gap-2 text-xs font-bold uppercase text-text-secondary">
              {transcriptionProvider.online ? <Wifi className="h-4 w-4 text-success" /> : <WifiOff className="h-4 w-4 text-danger" />}
              Provider
            </span>
            <p className="mt-2 text-xl font-bold text-text-primary">
              {transcriptionProvider.online ? "Online" : "Offline"}
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              {transcriptionProvider.provider} · {transcriptionProvider.latencyMs} ms
            </p>
          </div>
          <div className="border-b border-border-neutral bg-card-bg p-5">
            <span className="text-xs font-bold uppercase text-text-secondary">Clínicas ativas</span>
            <p className="mt-2 text-xl font-bold text-text-primary">{transcriptionMetrics.activeTenants}</p>
            <p className="mt-1 text-xs text-text-secondary">Transcrição habilitada</p>
          </div>
          <div className="border-b border-border-neutral bg-card-bg p-5">
            <span className="text-xs font-bold uppercase text-text-secondary">Minutos no mês</span>
            <p className="mt-2 text-xl font-bold text-text-primary">{transcriptionMetrics.minutesTranscribed}</p>
            <p className="mt-1 text-xs text-text-secondary">
              {transcriptionMetrics.sessionsStarted} sessões iniciadas
            </p>
          </div>
          <div className="border-b border-border-neutral bg-card-bg p-5">
            <span className="text-xs font-bold uppercase text-text-secondary">Confiabilidade</span>
            <p className="mt-2 text-xl font-bold text-text-primary">{transcriptionMetrics.providerErrors} erros</p>
            <p className="mt-1 text-xs text-text-secondary">
              Latência média: {transcriptionMetrics.averageLatencyMs ?? "-"} ms
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-text-secondary">
          Esta área exibe somente métricas técnicas agregadas. Conteúdo de transcrição, pacientes e dados clínicos não são acessíveis ao Admin Global.
        </p>
      </div>

      {/* Interactive Recharts Dashboard */}
      <GlobalAdminCharts metrics={metrics} />
      </div>
    </>
  );
}
