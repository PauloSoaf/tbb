"use client";

import React, { useRef, useState, useTransition } from "react";
import { ShieldCheck, Plus, CheckCircle2, XCircle, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { recordConsentAction, revokeConsentAction } from "@/actions/lgpd.action";
import type { ConsentRecordUIData } from "@/services/lgpd.service";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AsyncButton } from "@/components/ui/AsyncButton";

interface Props {
  tenantSlug: string;
  consents: ConsentRecordUIData[];
  onRefresh: () => void;
  patients: { id: string; name: string }[];
}

export function ConsentManagementTab({ tenantSlug, consents, onRefresh, patients }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [consentType, setConsentType] = useState("TERMOS_E_PRIVACIDADE");
  const [textSnapshot, setTextSnapshot] = useState("Autorizo a clínica a armazenar e processar meus dados clínicos e antropométricos conforme a LGPD para fins de tratamento nutricional.");
  const [isCreating, startCreateTransition] = useTransition();
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const revokingIdRef = useRef<string | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) {
      toast.error("Selecione um paciente.");
      return;
    }

    startCreateTransition(async () => {
      const res = await recordConsentAction(tenantSlug, selectedPatientId, consentType, textSnapshot);
      if (res.success) {
        toast.success("Consentimento registrado com sucesso!");
        setIsModalOpen(false);
        onRefresh();
      } else {
        toast.error(res.error || "Erro ao registrar consentimento.");
      }
    });
  };

  const handleRevoke = async (id: string, type: string) => {
    if (revokingIdRef.current) return;
    if (!window.confirm(`Deseja realmente revogar o consentimento "${type}"? O paciente poderá ter recursos de comunicação restritos.`)) return;

    revokingIdRef.current = id;
    setRevokingId(id);
    try {
      const res = await revokeConsentAction(tenantSlug, id);
      if (res.success) {
        toast.success("Consentimento revogado!");
        onRefresh();
      } else {
        toast.error(res.error || "Erro ao revogar.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao revogar.");
    } finally {
      revokingIdRef.current = null;
      setRevokingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card-bg border border-border-neutral rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" /> Registro de Consentimentos
          </h3>
          <p className="text-xs text-text-secondary mt-1 max-w-xl">
            Armazene o histórico imutável de aceites de termos de privacidade, envio de lembretes no WhatsApp e tratamento de dados sensíveis (Art. 7º e 11º da LGPD).
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-blue text-white text-xs font-semibold rounded-xl hover:bg-brand-blue/90 transition-colors shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" /> Registrar Novo Consentimento
        </button>
      </div>

      {consents.length === 0 ? (
        <div className="bg-card-bg border border-border-neutral rounded-2xl p-12 text-center text-text-secondary">
          <FileText className="w-12 h-12 text-border-neutral mx-auto mb-3 opacity-60" />
          <p className="text-base font-semibold text-text-primary">Nenhum consentimento registrado</p>
          <p className="text-xs mt-1">Clique no botão acima para registrar o primeiro consentimento para um paciente.</p>
        </div>
      ) : (
        <div className="bg-card-bg border border-border-neutral rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-neutral bg-background/50 text-xs font-bold uppercase tracking-wider text-text-secondary">
                  <th className="py-3 px-4">Paciente</th>
                  <th className="py-3 px-4">Tipo de Consentimento</th>
                  <th className="py-3 px-4">Versão & Origem</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Data do Aceite</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-neutral/40 text-sm">
                {consents.map((c) => (
                  <tr key={c.id} className="hover:bg-brand-blue/5 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-text-primary">{c.patientName}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-brand-blue">{c.consentType}</span>
                      <p className="text-[11px] text-text-secondary truncate max-w-xs">{c.textSnapshot}</p>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-text-secondary">
                      {c.version} • {c.source}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {c.status === "GRANTED" ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Ativo (Concedido)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-bold bg-red-100 text-red-800">
                          <XCircle className="w-3.5 h-3.5 text-red-600" /> Revogado
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-text-secondary font-mono">
                      {format(new Date(c.grantedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {c.status === "GRANTED" ? (
                        <AsyncButton
                          onClick={() => handleRevoke(c.id, c.consentType)}
                          pending={revokingId === c.id}
                          pendingLabel="Revogando..."
                          disabled={revokingId !== null}
                          className="px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors border border-red-200/60"
                        >
                          Revogar
                        </AsyncButton>
                      ) : (
                        <span className="text-xs text-text-secondary italic">Encerrado</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-card-bg border border-border-neutral rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-text-primary">Registrar Consentimento LGPD</h3>
            <form onSubmit={handleCreate} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Paciente</label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  required
                  className="w-full bg-background border border-border-neutral rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                >
                  <option value="">Selecione um paciente...</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Tipo de Consentimento</label>
                <select
                  value={consentType}
                  onChange={(e) => setConsentType(e.target.value)}
                  className="w-full bg-background border border-border-neutral rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                >
                  <option value="TERMOS_E_PRIVACIDADE">Termos de Privacidade e Tratamento de Dados</option>
                  <option value="COMUNICACAO_WHATSAPP">Envio de Lembretes e Dieta via WhatsApp</option>
                  <option value="COMPARTILHAMENTO_MEDICO">Compartilhamento Clínico Interdisciplinar</option>
                  <option value="TELEATENDIMENTO">Gravação ou Uso de Plataforma de Teleconsulta</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Texto / Termo Aceito (Snapshot)</label>
                <textarea
                  value={textSnapshot}
                  onChange={(e) => setTextSnapshot(e.target.value)}
                  rows={4}
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
                  disabled={isCreating}
                  className="flex items-center gap-1.5 px-4 py-2 bg-brand-blue text-white text-xs font-semibold rounded-xl hover:bg-brand-blue/90 transition-colors shadow-sm disabled:opacity-50"
                >
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Confirmar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
