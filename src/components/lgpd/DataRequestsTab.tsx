"use client";

import React, { useState, useTransition } from "react";
import { Download, Trash2, FileText, Plus, CheckCircle2, Clock, AlertTriangle, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { createDataSubjectRequestAction, exportPatientDataAction, pseudonymizePatientAction } from "@/actions/lgpd.action";
import type { DataSubjectRequestUIData } from "@/services/lgpd.service";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  tenantSlug: string;
  requests: DataSubjectRequestUIData[];
  onRefresh: () => void;
  patients: { id: string; name: string }[];
}

export function DataRequestsTab({ tenantSlug, requests, onRefresh, patients }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [reqType, setReqType] = useState<"ACCESS" | "EXPORT" | "DELETION">("EXPORT");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) {
      toast.error("Selecione um paciente.");
      return;
    }

    startTransition(async () => {
      const res = await createDataSubjectRequestAction(tenantSlug, selectedPatientId, reqType, notes);
      if (res.success) {
        toast.success("Solicitação aberta com sucesso!");
        setIsModalOpen(false);
        setNotes("");
        onRefresh();
      } else {
        toast.error(res.error || "Erro ao abrir solicitação.");
      }
    });
  };

  const handleExport = (patientId: string, patientName: string) => {
    setExportingId(patientId);
    startTransition(async () => {
      const res = await exportPatientDataAction(tenantSlug, patientId);
      if (res.success && res.bundle) {
        const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.bundle, null, 2));
        const link = document.createElement("a");
        link.setAttribute("href", jsonStr);
        link.setAttribute("download", `portabilidade_lgpd_${patientName.toLowerCase().replace(/\s+/g, "_")}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Pacote de dados JSON baixado com sucesso (Portabilidade LGPD)!");
      } else {
        toast.error(res.error || "Erro ao exportar dados.");
      }
      setExportingId(null);
    });
  };

  const handlePseudonymize = (patientId: string, patientName: string) => {
    const confirmMsg = `ATENÇÃO: Deseja realmente pseudonimizar/excluir irreversivelmente os dados pessoais de "${patientName}" (Direito ao Esquecimento - Art. 18 LGPD)?\n\nNome, e-mail, telefone, CPF e data de nascimento serão apagados e substituídos por identificador anônimo para manter a integridade dos gráficos estatísticos da clínica.`;
    if (!window.confirm(confirmMsg)) return;

    setDeletingId(patientId);
    startTransition(async () => {
      const res = await pseudonymizePatientAction(tenantSlug, patientId);
      if (res.success) {
        toast.success("Dados do paciente excluídos e pseudonimizados com sucesso!");
        onRefresh();
      } else {
        toast.error(res.error || "Erro ao excluir/pseudonimizar dados.");
      }
      setDeletingId(null);
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-card-bg border border-border-neutral rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-blue" /> Solicitações de Titulares (LGPD - Art. 18)
          </h3>
          <p className="text-xs text-text-secondary mt-1 max-w-xl">
            Gerencie pedidos formais de portabilidade, acesso ou exclusão de dados pessoais. O download JSON gera pacote estruturado em conformidade com a lei.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-blue text-white text-xs font-semibold rounded-xl hover:bg-brand-blue/90 transition-colors shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" /> Abrir Solicitação
        </button>
      </div>

      {requests.length === 0 ? (
        <div className="bg-card-bg border border-border-neutral rounded-2xl p-12 text-center text-text-secondary">
          <Clock className="w-12 h-12 text-border-neutral mx-auto mb-3 opacity-60" />
          <p className="text-base font-semibold text-text-primary">Nenhuma solicitação de titular aberta</p>
          <p className="text-xs mt-1">As requisições de portabilidade ou exclusão aparecerão aqui quando solicitadas.</p>
        </div>
      ) : (
        <div className="bg-card-bg border border-border-neutral rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-neutral bg-background/50 text-xs font-bold uppercase tracking-wider text-text-secondary">
                  <th className="py-3 px-4">Titular (Paciente)</th>
                  <th className="py-3 px-4">Tipo de Solicitação</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Data da Abertura</th>
                  <th className="py-3 px-4 text-right">Executar Ação LGPD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-neutral/40 text-sm">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-brand-blue/5 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-text-primary">
                      {r.patientName}
                      {r.notes && <p className="text-[11px] text-text-secondary font-normal truncate max-w-xs">{r.notes}</p>}
                    </td>
                    <td className="py-3.5 px-4">
                      {r.type === "EXPORT" && <span className="font-semibold text-brand-blue">Portabilidade (Exportar JSON)</span>}
                      {r.type === "DELETION" && <span className="font-semibold text-red-600">Direito ao Esquecimento (Excluir)</span>}
                      {r.type === "ACCESS" && <span className="font-semibold text-text-primary">Acesso ao Prontuário</span>}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {r.status === "PENDING" ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-bold bg-amber-100 text-amber-800">
                          <Clock className="w-3.5 h-3.5 text-amber-600" /> Pendente
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Concluído
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-text-secondary font-mono">
                      {format(new Date(r.requestedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleExport(r.patientId, r.patientName)}
                          disabled={exportingId === r.patientId || isPending}
                          className="flex items-center gap-1 px-3 py-1.5 bg-brand-blue/10 hover:bg-brand-blue text-brand-blue hover:text-white rounded-xl text-xs font-semibold transition-all shadow-xs"
                          title="Baixar pacote JSON com todos os dados estruturados"
                        >
                          {exportingId === r.patientId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                          <span>Exportar JSON</span>
                        </button>

                        <button
                          onClick={() => handlePseudonymize(r.patientId, r.patientName)}
                          disabled={deletingId === r.patientId || isPending}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-100 hover:bg-red-600 text-red-700 hover:text-white rounded-xl text-xs font-semibold transition-all shadow-xs"
                          title="Excluir/pseudonimizar irreversivelmente os dados do paciente"
                        >
                          {deletingId === r.patientId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          <span>Excluir / Anular</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-card-bg border border-border-neutral rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-text-primary">Nova Requisição de Titular (LGPD)</h3>
            <form onSubmit={handleCreateRequest} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Paciente Solicitante</label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  required
                  className="w-full bg-background border border-border-neutral rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                >
                  <option value="">Selecione o paciente...</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Tipo de Direito Exercido</label>
                <select
                  value={reqType}
                  onChange={(e) => setReqType(e.target.value as any)}
                  className="w-full bg-background border border-border-neutral rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                >
                  <option value="EXPORT">Portabilidade de Dados (Exportação Estruturada JSON)</option>
                  <option value="DELETION">Direito ao Esquecimento (Exclusão / Pseudonimização)</option>
                  <option value="ACCESS">Acesso / Cópia Integral de Prontuário</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Observações Internas (Opcional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Solicitado via e-mail no dia 14/07"
                  rows={3}
                  className="w-full bg-background border border-border-neutral rounded-xl p-3 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-1.5 px-4 py-2 bg-brand-blue text-white text-xs font-semibold rounded-xl hover:bg-brand-blue/90 transition-colors shadow-sm disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Abrir Solicitação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
