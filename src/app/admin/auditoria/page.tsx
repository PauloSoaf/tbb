import React from "react";
import { globalAdminService } from "@/services/global-admin.service";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ShieldCheck, ShieldAlert, ShieldX, FileText } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

export default async function GlobalAdminAuditPage() {
  const result = await globalAdminService.listGlobalAuditLogs(1, 40);

  return (
    <>
      <AdminPageHeader titleKey="admin.audit.title" subtitleKey="admin.audit.description" />

      <div className="space-y-6 animate-fade-in p-4 lg:p-8">
      <div className="bg-card-bg border border-border-neutral rounded-2xl overflow-hidden shadow-sm">
        {result.data.length === 0 ? (
          <div className="p-12 text-center text-text-secondary">
            <FileText className="w-12 h-12 text-border-neutral mx-auto mb-3 opacity-60" />
            <p className="text-base font-semibold text-text-primary">Nenhum evento global registrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-neutral bg-background/50 text-xs font-bold uppercase tracking-wider text-text-secondary">
                  <th className="py-3 px-4">Data / Hora</th>
                  <th className="py-3 px-4">Clínica (Tenant ID)</th>
                  <th className="py-3 px-4">Ator / Cargo</th>
                  <th className="py-3 px-4">Ação / Módulo</th>
                  <th className="py-3 px-4">Resultado</th>
                  <th className="py-3 px-4">Motivo / Mensagem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-neutral/40 text-sm">
                {result.data.map((evt) => (
                  <tr key={evt.id} className="hover:bg-brand-blue/5 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap text-xs text-text-secondary font-mono">
                      {format(new Date(evt.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-brand-blue font-bold">
                      {evt.tenantId ? evt.tenantId.slice(0, 12) + "..." : "SISTEMA / ROOT"}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-text-primary">{evt.actorNameSnapshot}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-border-neutral/40 text-text-secondary">
                          {evt.actorRoleSnapshot}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-medium text-text-primary block">{evt.action}</span>
                      <code className="text-[11px] text-text-secondary uppercase">{evt.resource}</code>
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
                    <td className="py-3.5 px-4 text-xs text-text-secondary max-w-sm truncate">
                      {evt.reason || "Sem descrição"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>
    </>
  );
}
