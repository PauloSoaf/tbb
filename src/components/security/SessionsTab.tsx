"use client";

import React, { useState, useEffect, useTransition } from "react";
import { Laptop, Globe, Smartphone, ShieldX, Loader2, Calendar, Clock, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { getSessionsAction, revokeSessionAction } from "@/actions/security.action";
import type { SessionUIData } from "@/services/session.service";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  tenantSlug: string;
}

export function SessionsTab({ tenantSlug }: Props) {
  const [sessions, setSessions] = useState<SessionUIData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [canRevokeTeam, setCanRevokeTeam] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const loadSessions = () => {
    setIsLoading(true);
    startTransition(async () => {
      const res = await getSessionsAction(tenantSlug);
      if (res.data) {
        setSessions(res.data);
        setCanRevokeTeam(!!res.canRevokeTeam);
      } else {
        toast.error(res.error || "Erro ao listar sessões.");
      }
      setIsLoading(false);
    });
  };

  useEffect(() => {
    const timeout = window.setTimeout(loadSessions, 0);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantSlug]);

  const handleRevoke = async (session: SessionUIData) => {
    const confirmMsg = session.isCurrentSession
      ? "Deseja realmente encerrar a sessão NESTE dispositivo? Você precisará fazer login novamente."
      : `Deseja realmente revogar a sessão de ${session.userName} (${session.browser || "Dispositivo"})?`;

    if (!window.confirm(confirmMsg)) return;

    setRevokingId(session.id);
    startTransition(async () => {
      const res = await revokeSessionAction(tenantSlug, session.id);
      if (res.success) {
        toast.success("Sessão revogada com sucesso!");
        loadSessions();
      } else {
        toast.error(res.error || "Erro ao revogar sessão.");
      }
      setRevokingId(null);
    });
  };

  const getDeviceIcon = (deviceType: string | null) => {
    const lower = (deviceType || "").toLowerCase();
    if (lower.includes("mobile") || lower.includes("phone") || lower.includes("android") || lower.includes("iphone")) {
      return <Smartphone className="w-5 h-5 text-brand-blue" />;
    }
    if (lower.includes("web") || lower.includes("navegador")) {
      return <Globe className="w-5 h-5 text-brand-blue" />;
    }
    return <Laptop className="w-5 h-5 text-brand-blue" />;
  };

  return (
    <div className="space-y-6">
      <div className="bg-card-bg border border-border-neutral rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-text-primary">Sessões Ativas & Conectadas</h3>
          <p className="text-xs text-text-secondary mt-1">
            Monitore dispositivos logados na clínica. Revogar uma sessão encerra imediatamente o acesso remoto via token JWT de forma ativa.
          </p>
        </div>
        <button
          onClick={() => loadSessions()}
          disabled={isLoading}
          aria-busy={isLoading || undefined}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-blue/10 hover:bg-brand-blue/20 text-brand-blue font-semibold text-xs rounded-xl transition-colors shrink-0 disabled:opacity-60"
        >
          {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {isLoading ? "Atualizando..." : "Atualizar Lista"}
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
          <Loader2 className="w-8 h-8 animate-spin text-brand-blue mb-3" />
          <p className="text-sm font-medium">Carregando sessões ativas...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="bg-card-bg border border-border-neutral rounded-2xl p-12 text-center text-text-secondary">
          <UserCheck className="w-12 h-12 text-border-neutral mx-auto mb-3 opacity-60" />
          <p className="text-base font-semibold text-text-primary">Nenhuma sessão encontrada</p>
          <p className="text-xs mt-1">As sessões ativas serão exibidas aqui quando os usuários acessarem o sistema.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sessions.map((s) => {
            const isRevoked = s.status === "REVOKED" || s.status === "EXPIRED" || new Date(s.expiresAt) < new Date();
            const canRevokeThis = !isRevoked && (s.isCurrentSession || canRevokeTeam);

            return (
              <div
                key={s.id}
                className={`bg-card-bg border rounded-2xl p-5 shadow-sm transition-all flex flex-col justify-between gap-4 ${
                  s.isCurrentSession
                    ? "border-brand-blue/60 ring-2 ring-brand-blue/10 bg-brand-blue/[0.02]"
                    : isRevoked
                    ? "border-border-neutral/40 opacity-60 bg-background/50"
                    : "border-border-neutral"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-background border border-border-neutral shadow-sm">
                        {getDeviceIcon(s.deviceType)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-text-primary">{s.browser || "Navegador Web"}</h4>
                          {s.isCurrentSession && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-brand-blue text-white shadow-xs">
                              Este Dispositivo
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-text-secondary">{s.os || "Sistema Operacional"} • {s.deviceType || "PC"}</p>
                      </div>
                    </div>

                    <div>
                      {s.status === "ACTIVE" && !isRevoked ? (
                        <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Ativa
                        </span>
                      ) : (
                        <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-red-100 text-red-800 border border-red-200">
                          Revogada / Expirada
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border-neutral/60 space-y-1.5 text-xs text-text-secondary">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-text-primary">{s.userName}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-border-neutral/40 text-text-secondary uppercase">
                        {s.userRole}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <Clock className="w-3.5 h-3.5 text-brand-blue" />
                      <span>
                        Último acesso:{" "}
                        <strong className="text-text-primary">
                          {formatDistanceToNow(new Date(s.lastSeenAt), { addSuffix: true, locale: ptBR })}
                        </strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <Calendar className="w-3.5 h-3.5 text-text-secondary" />
                      <span>Criada em: {format(new Date(s.createdAt), "dd/MM/yyyy HH:mm")}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-border-neutral/40 flex justify-end">
                  {canRevokeThis ? (
                    <button
                      type="button"
                      onClick={() => handleRevoke(s)}
                      disabled={revokingId === s.id}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-red-600 hover:text-white border border-red-200 hover:bg-red-600 rounded-xl transition-all disabled:opacity-50"
                    >
                      {revokingId === s.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ShieldX className="w-3.5 h-3.5" />
                      )}
                      <span>Revogar Acesso</span>
                    </button>
                  ) : isRevoked ? (
                    <span className="text-[11px] text-text-secondary italic">Acesso encerrado</span>
                  ) : (
                    <span className="text-[11px] text-text-secondary italic">Sem permissão para revogar</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
