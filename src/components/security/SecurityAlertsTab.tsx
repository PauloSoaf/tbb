"use client";

import React, { useState, useEffect, useTransition } from "react";
import { ShieldAlert, CheckCircle2, Loader2, Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getSecurityEventsAction, acknowledgeSecurityEventAction, resolveSecurityEventAction } from "@/actions/security.action";
import type { SecurityEvent } from "@prisma/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  tenantSlug: string;
}

export function SecurityAlertsTab({ tenantSlug }: Props) {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("OPEN");
  const [pendingAction, setPendingAction] = useState<{ id: string; type: "ack" | "resolve" } | null>(null);
  const [, startTransition] = useTransition();

  const loadAlerts = () => {
    setIsLoading(true);
    startTransition(async () => {
      const res = await getSecurityEventsAction(tenantSlug, {
        severity: severityFilter === "ALL" ? undefined : severityFilter,
        status: statusFilter === "ALL" ? undefined : statusFilter,
      });

      if (res.data) {
        setEvents(res.data);
      } else {
        toast.error(res.error || "Erro ao carregar alertas.");
      }
      setIsLoading(false);
    });
  };

  useEffect(() => {
    const timeout = window.setTimeout(loadAlerts, 0);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantSlug, severityFilter, statusFilter]);

  const handleAck = (eventId: string) => {
    setPendingAction({ id: eventId, type: "ack" });
    startTransition(async () => {
      const res = await acknowledgeSecurityEventAction(tenantSlug, eventId);
      if (res.success) {
        toast.success("Alerta reconhecido!");
        loadAlerts();
      } else {
        toast.error(res.error || "Erro ao processar alerta.");
      }
      setPendingAction(null);
    });
  };

  const handleResolve = (eventId: string) => {
    setPendingAction({ id: eventId, type: "resolve" });
    startTransition(async () => {
      const res = await resolveSecurityEventAction(tenantSlug, eventId);
      if (res.success) {
        toast.success("Alerta resolvido com sucesso!");
        loadAlerts();
      } else {
        toast.error(res.error || "Erro ao resolver alerta.");
      }
      setPendingAction(null);
    });
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-red-100 text-red-800 border border-red-300">Crítico</span>;
      case "HIGH":
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-orange-100 text-orange-800 border border-orange-300">Alto</span>;
      case "MEDIUM":
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300">Médio</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800 border border-blue-300">Baixo</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="bg-card-bg border border-border-neutral rounded-2xl p-4.5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm bg-background border border-border-neutral rounded-xl px-3 py-2 text-text-primary focus:outline-none"
          >
            <option value="ALL">Todos os Status</option>
            <option value="OPEN">Abertos</option>
            <option value="ACKNOWLEDGED">Reconhecidos</option>
            <option value="RESOLVED">Resolvidos</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="text-sm bg-background border border-border-neutral rounded-xl px-3 py-2 text-text-primary focus:outline-none"
          >
            <option value="ALL">Todas Severidades</option>
            <option value="CRITICAL">Crítico</option>
            <option value="HIGH">Alto</option>
            <option value="MEDIUM">Médio</option>
            <option value="LOW">Baixo</option>
          </select>
        </div>

        <button
          onClick={() => loadAlerts()}
          disabled={isLoading}
          className="p-2 text-text-secondary hover:text-text-primary rounded-xl hover:bg-border-neutral/40 transition-colors"
          title="Atualizar alertas"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
          <Loader2 className="w-8 h-8 animate-spin text-brand-blue mb-3" />
          <p className="text-sm font-medium">Carregando alertas de segurança...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="bg-card-bg border border-border-neutral rounded-2xl p-12 text-center text-text-secondary">
          <ShieldAlert className="w-12 h-12 text-border-neutral mx-auto mb-3 opacity-60" />
          <p className="text-base font-semibold text-text-primary">Nenhum alerta de segurança {statusFilter !== "ALL" ? `(${statusFilter.toLowerCase()})` : ""} encontrado</p>
          <p className="text-xs mt-1 max-w-md mx-auto">
            Eventos anômalos, picos de acesso negado ou múltiplas tentativas de falha serão detectados e exibidos aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((evt) => (
            <div
              key={evt.id}
              className={`bg-card-bg border rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                evt.status === "RESOLVED" ? "opacity-60 border-border-neutral/60" : "border-border-neutral"
              }`}
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3">
                  {getSeverityBadge(evt.severity)}
                  <h4 className="text-sm font-bold text-text-primary">{evt.title}</h4>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">{evt.description}</p>
                <div className="flex items-center gap-4 text-[11px] text-text-secondary font-mono pt-1">
                  <span>Tipo: {evt.type}</span>
                  <span>•</span>
                  <span>Registrado: {format(new Date(evt.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                {evt.status === "OPEN" && (
                  <>
                    <button
                      onClick={() => handleAck(evt.id)}
                      disabled={pendingAction?.id === evt.id}
                      aria-busy={pendingAction?.id === evt.id && pendingAction.type === "ack" || undefined}
                      className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-border-neutral/30 hover:bg-border-neutral text-text-primary transition-colors flex items-center gap-1"
                    >
                      {pendingAction?.id === evt.id && pendingAction.type === "ack" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Reconhecer
                    </button>
                    <button
                      onClick={() => handleResolve(evt.id)}
                      disabled={pendingAction?.id === evt.id}
                      aria-busy={pendingAction?.id === evt.id && pendingAction.type === "resolve" || undefined}
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1 shadow-xs"
                    >
                      {pendingAction?.id === evt.id && pendingAction.type === "resolve" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Resolver
                    </button>
                  </>
                )}
                {evt.status === "ACKNOWLEDGED" && (
                  <button
                    onClick={() => handleResolve(evt.id)}
                    disabled={pendingAction?.id === evt.id}
                    aria-busy={pendingAction?.id === evt.id && pendingAction.type === "resolve" || undefined}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1 shadow-xs"
                  >
                    {pendingAction?.id === evt.id && pendingAction.type === "resolve" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Resolver Alerta
                  </button>
                )}
                {evt.status === "RESOLVED" && (
                  <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Resolvido
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
