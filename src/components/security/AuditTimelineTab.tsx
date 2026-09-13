"use client";

import React, { useState, useEffect, useTransition } from "react";
import { Search, Filter, ShieldCheck, ShieldAlert, ShieldX, ChevronLeft, ChevronRight, RotateCcw, Loader2, Eye, Download } from "lucide-react";
import { toast } from "sonner";
import { getAuditLogsAction } from "@/actions/security.action";
import type { AuditLogUIData, PaginatedAuditLogs } from "@/services/audit-log.query.service";
import type { AuditResult } from "@prisma/client";
import { AuditEventDrawer } from "./AuditEventDrawer";
import { format } from "date-fns";
import { Can } from "@/lib/tenancy/PermissionsContext";

interface Props {
  tenantSlug: string;
}

const ACTION_LABELS: Record<string, string> = {
  "patient.create": "Criou Paciente",
  "patient.update": "Editou Paciente",
  "patient.archive": "Arquivou Paciente",
  "patient.delete": "Excluiu Paciente",
  "anamnesis.create": "Criou Anamnese",
  "anamnesis.update": "Editou Anamnese",
  "anamnesis.delete": "Excluiu Anamnese",
  "anamnesis.submit.public": "Submeteu Anamnese (Público)",
  "anthropometry.create": "Registrou Antropometria",
  "anthropometry.update": "Editou Antropometria",
  "medicalRecord.note.create": "Nota de Prontuário Criada",
  "medicalRecord.note.update": "Nota de Prontuário Editada",
  "medicalRecord.note.delete": "Nota de Prontuário Excluída",
  "team.invite.create": "Convidou Membro",
  "team.invite.revoke": "Revogou Convite",
  "team.role.update": "Atualizou Cargo da Equipe",
  "team.member.remove": "Removeu Membro da Equipe",
  "team.permissions.update": "Alterou Permissões de Membro",
  "session.login": "Login Realizado",
  "session.login.failed": "Falha no Login",
  "session.revoke": "Sessão Revogada",
  "permission.denied": "Tentativa de Acesso Negada",
};

export function AuditTimelineTab({ tenantSlug }: Props) {
  const [data, setData] = useState<PaginatedAuditLogs | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [resource, setResource] = useState("");
  const [resultFilter, setResultFilter] = useState<string>("ALL");
  const [, setPage] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState<AuditLogUIData | null>(null);
  const [, startTransition] = useTransition();

  const loadLogs = (pageNum = 1) => {
    setIsLoading(true);
    startTransition(async () => {
      const res = await getAuditLogsAction(tenantSlug, {
        search: search || undefined,
        resource: resource || undefined,
        result: resultFilter === "ALL" ? undefined : (resultFilter as AuditResult),
        page: pageNum,
        pageSize: 15,
      });

      if (res.data) {
        setData(res.data);
        setPage(pageNum);
      } else {
        toast.error(res.error || "Erro ao carregar logs.");
      }
      setIsLoading(false);
    });
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => loadLogs(1), 0);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantSlug, resource, resultFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadLogs(1);
  };

  const handleClearFilters = () => {
    setSearch("");
    setResource("");
    setResultFilter("ALL");
    setPage(1);
  };

  const handleExportCsv = () => {
    if (!data || data.data.length === 0) return;
    const headers = ["ID", "Data/Hora", "Ator", "Cargo", "Ação", "Módulo", "ID Recurso", "Paciente", "Resultado", "Motivo"];
    const rows = data.data.map((evt) => [
      evt.id,
      format(new Date(evt.createdAt), "dd/MM/yyyy HH:mm:ss"),
      evt.actorNameSnapshot,
      evt.actorRoleSnapshot,
      evt.action,
      evt.resource,
      evt.resourceId,
      evt.patientNameSnapshot || "",
      evt.result,
      evt.reason || "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `auditoria_nutriopus_${format(new Date(), "yyyyMMdd_HHmm")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV exportado com sucesso!");
  };

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="bg-card-bg border border-border-neutral rounded-2xl p-4.5 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por ator, paciente, ação ou ID..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-background border border-border-neutral rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/30 transition-all text-text-primary"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={resource}
              onChange={(e) => setResource(e.target.value)}
              className="text-sm bg-background border border-border-neutral rounded-xl px-3 py-2 text-text-primary focus:outline-none w-full sm:w-auto"
            >
              <option value="">Todos os módulos</option>
              <option value="patient">Pacientes</option>
              <option value="anamnesis">Anamnese</option>
              <option value="anthropometry">Antropometria</option>
              <option value="medicalRecord">Prontuário</option>
              <option value="team">Equipe & Permissões</option>
              <option value="session">Sessões & Autenticação</option>
            </select>

            <select
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
              className="text-sm bg-background border border-border-neutral rounded-xl px-3 py-2 text-text-primary focus:outline-none w-full sm:w-auto"
            >
              <option value="ALL">Qualquer Resultado</option>
              <option value="SUCCESS">Sucesso</option>
              <option value="FAILURE">Falha</option>
              <option value="DENIED">Acesso Negado</option>
            </select>

            <button
              type="submit"
              disabled={isLoading}
              aria-busy={isLoading || undefined}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-blue text-white text-sm font-semibold rounded-xl hover:bg-brand-blue/90 transition-colors shrink-0 shadow-sm disabled:opacity-60"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading ? "Filtrando..." : "Filtrar"}
            </button>

            {(search || resource || resultFilter !== "ALL") && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="p-2 text-text-secondary hover:text-text-primary rounded-xl hover:bg-border-neutral/40 transition-colors shrink-0"
                title="Limpar filtros"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            <Can resource="auditLogs" action="export">
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={!data || data.data.length === 0 || isLoading}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition-colors disabled:opacity-40 shrink-0"
                title="Exportar logs para CSV"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
            </Can>
          </div>
        </form>
      </div>

      {/* Logs Table / Timeline */}
      <div className="bg-card-bg border border-border-neutral rounded-2xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
            <Loader2 className="w-8 h-8 animate-spin text-brand-blue mb-3" />
            <p className="text-sm font-medium">Carregando trilha de auditoria...</p>
          </div>
        ) : !data || data.data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-text-secondary text-center px-4">
            <Filter className="w-12 h-12 text-border-neutral mb-3 opacity-60" />
            <p className="text-base font-semibold text-text-primary">Nenhum evento de auditoria encontrado</p>
            <p className="text-xs text-text-secondary mt-1 max-w-sm">
              Tente ajustar ou limpar os filtros para visualizar outros registros do histórico de segurança.
            </p>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-neutral bg-background/50 text-xs font-bold uppercase tracking-wider text-text-secondary">
                    <th className="py-3 px-4">Data / Hora</th>
                    <th className="py-3 px-4">Ator</th>
                    <th className="py-3 px-4">Ação</th>
                    <th className="py-3 px-4">Alvo / Recurso</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-neutral/40 text-sm">
                  {data.data.map((evt) => {
                    const actionHuman = ACTION_LABELS[evt.action] || evt.action;
                    return (
                      <tr
                        key={evt.id}
                        onClick={() => setSelectedEvent(evt)}
                        className="hover:bg-brand-blue/5 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-4 whitespace-nowrap text-xs text-text-secondary font-mono">
                          {format(new Date(evt.createdAt), "dd/MM/yyyy HH:mm:ss")}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-text-primary">{evt.actorNameSnapshot}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-border-neutral/40 text-text-secondary">
                              {evt.actorRoleSnapshot}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-medium text-text-primary">{actionHuman}</span>
                          <span className="block text-[11px] text-text-secondary font-mono">{evt.action}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold uppercase tracking-wider text-brand-blue">
                              {evt.resource}
                            </span>
                            {evt.patientNameSnapshot ? (
                              <span className="text-xs text-text-primary font-medium">Paciente: {evt.patientNameSnapshot}</span>
                            ) : evt.resourceLabelSnapshot ? (
                              <span className="text-xs text-text-secondary truncate max-w-[180px]">{evt.resourceLabelSnapshot}</span>
                            ) : (
                              <span className="text-[11px] text-text-secondary font-mono truncate max-w-[140px]">{evt.resourceId}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {evt.result === "SUCCESS" && (
                            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-100 text-emerald-800">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Sucesso
                            </span>
                          )}
                          {evt.result === "FAILURE" && (
                            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-bold bg-amber-100 text-amber-800">
                              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" /> Falha
                            </span>
                          )}
                          {evt.result === "DENIED" && (
                            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-bold bg-red-100 text-red-800">
                              <ShieldX className="w-3.5 h-3.5 text-red-600" /> Negado
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(evt);
                            }}
                            className="p-1.5 rounded-lg text-text-secondary group-hover:text-brand-blue group-hover:bg-brand-blue/10 transition-all"
                            title="Ver detalhes do evento"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-4 border-t border-border-neutral flex items-center justify-between bg-background/30 text-xs text-text-secondary">
              <div>
                Exibindo página <strong className="text-text-primary">{data.page}</strong> de <strong className="text-text-primary">{data.totalPages}</strong> ({data.total} eventos totais)
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={data.page <= 1 || isLoading}
                  onClick={() => loadLogs(data.page - 1)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border-neutral bg-card-bg hover:bg-border-neutral/30 disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Anterior
                </button>
                <button
                  type="button"
                  disabled={data.page >= data.totalPages || isLoading}
                  onClick={() => loadLogs(data.page + 1)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border-neutral bg-card-bg hover:bg-border-neutral/30 disabled:opacity-40 transition-colors"
                >
                  Próximo <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <AuditEventDrawer event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </div>
  );
}
