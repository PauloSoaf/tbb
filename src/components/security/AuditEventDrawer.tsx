"use client";

import React from "react";
import { X, ShieldCheck, ShieldAlert, ShieldX, User, Calendar, Tag, AlertCircle, Laptop, Globe } from "lucide-react";
import type { AuditLogUIData } from "@/services/audit-log.query.service";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  event: AuditLogUIData | null;
  onClose: () => void;
}

export function AuditEventDrawer({ event, onClose }: Props) {
  if (!event) return null;

  const resultConfig = {
    SUCCESS: {
      label: "Sucesso",
      bg: "bg-emerald-100 text-emerald-800 border-emerald-200",
      icon: <ShieldCheck className="w-5 h-5 text-emerald-600" />,
    },
    FAILURE: {
      label: "Falha",
      bg: "bg-amber-100 text-amber-800 border-amber-200",
      icon: <ShieldAlert className="w-5 h-5 text-amber-600" />,
    },
    DENIED: {
      label: "Acesso Negado",
      bg: "bg-red-100 text-red-800 border-red-200",
      icon: <ShieldX className="w-5 h-5 text-red-600" />,
    },
  }[event.result] || {
    label: event.result,
    bg: "bg-gray-100 text-gray-800 border-gray-200",
    icon: <ShieldAlert className="w-5 h-5 text-gray-600" />,
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-card-bg border-l border-border-neutral w-full max-w-lg h-full overflow-y-auto flex flex-col shadow-2xl text-text-primary">
        {/* Header */}
        <div className="p-6 border-b border-border-neutral flex items-center justify-between bg-brand-blue/5 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-background border border-border-neutral shadow-sm">
              {resultConfig.icon}
            </div>
            <div>
              <h2 className="text-base font-bold">Detalhes do Evento</h2>
              <code className="text-xs text-brand-blue font-mono">{event.action}</code>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-border-neutral/40 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1">
          {/* Result Banner */}
          <div className={`p-4 rounded-xl border flex items-center justify-between ${resultConfig.bg}`}>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">{resultConfig.label}</span>
            </div>
            <span className="text-xs opacity-75 font-mono">ID: {event.id.slice(-8)}</span>
          </div>

          {/* Actor Info */}
          <div className="space-y-2 bg-background p-4 rounded-xl border border-border-neutral/60">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Ator da Ação
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-text-primary">{event.actorNameSnapshot}</p>
                <p className="text-xs text-text-secondary">Cargo no momento: {event.actorRoleSnapshot}</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-brand-blue/10 text-brand-blue">
                {event.actorRoleSnapshot}
              </span>
            </div>
          </div>

          {/* Resource & Patient */}
          <div className="space-y-2 bg-background p-4 rounded-xl border border-border-neutral/60">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" /> Alvo / Recurso
            </h3>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Módulo:</span>
                <span className="font-semibold capitalize text-text-primary">{event.resource}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Identificador:</span>
                <code className="text-xs text-text-primary font-mono">{event.resourceId}</code>
              </div>
              {event.resourceLabelSnapshot && (
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Rótulo:</span>
                  <span className="font-medium text-text-primary">{event.resourceLabelSnapshot}</span>
                </div>
              )}
              {event.patientNameSnapshot && (
                <div className="flex justify-between text-sm pt-2 border-t border-border-neutral/40 mt-2">
                  <span className="text-text-secondary">Paciente relacionado:</span>
                  <span className="font-semibold text-brand-blue">{event.patientNameSnapshot}</span>
                </div>
              )}
            </div>
          </div>

          {/* Changed fields */}
          {event.changedFields && event.changedFields.length > 0 && (
            <div className="space-y-2 bg-background p-4 rounded-xl border border-border-neutral/60">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" /> Campos Alterados (Nomes)
              </h3>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {event.changedFields.map((field) => (
                  <span key={field} className="text-xs px-2.5 py-1 rounded-lg bg-border-neutral/40 text-text-primary font-mono border border-border-neutral/60">
                    {field}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-text-secondary italic pt-1">
                * Por segurança e conformidade LGPD, os valores clínicos anteriores e novos não são exibidos nos logs.
              </p>
            </div>
          )}

          {/* Reason */}
          {event.reason && (
            <div className="space-y-2 bg-red-50/50 dark:bg-red-950/20 p-4 rounded-xl border border-red-200/60 text-red-900 dark:text-red-300">
              <h3 className="text-xs font-bold uppercase tracking-wider">Motivo / Mensagem do Sistema</h3>
              <p className="text-sm">{event.reason}</p>
            </div>
          )}

          {/* Request Context & Timestamp */}
          <div className="space-y-2 bg-background p-4 rounded-xl border border-border-neutral/60 text-xs text-text-secondary">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5 mb-2">
              <Globe className="w-3.5 h-3.5" /> Metadados Técnicos Sanitizados
            </h3>
            <div className="flex justify-between py-1 border-b border-border-neutral/30">
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Data & Hora:</span>
              <span className="font-medium text-text-primary">
                {format(new Date(event.createdAt), "dd 'de' MMMM 'de' yyyy 'às' HH:mm:ss", { locale: ptBR })}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-border-neutral/30">
              <span className="flex items-center gap-1"><Laptop className="w-3.5 h-3.5" /> IP Hash (Mascarado):</span>
              <code className="text-[11px] text-text-primary font-mono">{event.ipHash || "Não registrado"}</code>
            </div>
            {event.userAgent && (
              <div className="py-1">
                <span className="block mb-1">User Agent (Dispositivo/Navegador):</span>
                <p className="text-[11px] text-text-primary break-all bg-card-bg p-2 rounded border border-border-neutral/40">
                  {event.userAgent}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border-neutral bg-card-bg flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-brand-blue text-white text-sm font-semibold rounded-xl hover:bg-brand-blue/90 transition-colors shadow-md"
          >
            Fechar Detalhes
          </button>
        </div>
      </div>
    </div>
  );
}
