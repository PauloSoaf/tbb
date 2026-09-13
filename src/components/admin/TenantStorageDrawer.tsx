"use client";

import { useEffect, useState } from "react";
import { X, Loader2, Users, FolderOpen, History } from "lucide-react";
import { getTenantStorageDetailAdminAction } from "@/actions/admin-storage.action";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 MB";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

interface Props {
  tenantId: string;
  tenantName: string;
  onClose: () => void;
}

type Detail = Awaited<ReturnType<typeof getTenantStorageDetailAdminAction>>;

export function TenantStorageDrawer({ tenantId, tenantName, onClose }: Props) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getTenantStorageDetailAdminAction(tenantId).then((res) => {
      if (!cancelled) {
        setDetail(res);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <button type="button" aria-label="Fechar" className="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px]" onClick={onClose} />
      <div className="relative w-full max-w-md h-full bg-card-bg border-l border-border-neutral shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200">
        <div className="sticky top-0 bg-card-bg border-b border-border-neutral p-4 flex items-center justify-between z-10">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-text-primary truncate">{tenantName}</h2>
            <p className="text-xs text-text-secondary">Detalhes de armazenamento</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-text-secondary hover:bg-background hover:text-text-primary shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-text-secondary">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : detail?.error ? (
            <p className="text-xs text-danger">{detail.error}</p>
          ) : (
            <>
              <section>
                <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                  <FolderOpen className="w-3.5 h-3.5" /> Consumo por tipo de arquivo
                </h3>
                {detail?.breakdown.length === 0 ? (
                  <p className="text-xs text-text-secondary">Nenhum arquivo enviado.</p>
                ) : (
                  <div className="space-y-1.5">
                    {detail?.breakdown.map((b) => (
                      <div key={b.purpose} className="flex items-center justify-between text-xs border-b border-border-neutral/40 py-1.5 last:border-0">
                        <span className="text-text-primary">{b.purpose}</span>
                        <span className="text-text-secondary">{formatBytes(b.sizeBytes)} · {b.fileCount} arq.</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                  <Users className="w-3.5 h-3.5" /> Consumo por membro
                </h3>
                {detail?.byUploader.length === 0 ? (
                  <p className="text-xs text-text-secondary">Sem dados de uploader (arquivos anteriores ao rastreamento por usuário).</p>
                ) : (
                  <div className="space-y-1.5">
                    {detail?.byUploader.map((u) => (
                      <div key={u.uploadedByUserId ?? "unknown"} className="flex items-center justify-between text-xs border-b border-border-neutral/40 py-1.5 last:border-0">
                        <span className="text-text-primary truncate">{u.userName}</span>
                        <span className="text-text-secondary shrink-0 ml-2">{formatBytes(u.sizeBytes)} · {u.fileCount} arq.</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                  <History className="w-3.5 h-3.5" /> Histórico (30 dias)
                </h3>
                {detail?.history.length === 0 ? (
                  <p className="text-xs text-text-secondary">Sem snapshots ainda — rodam diariamente ou sob demanda em &quot;Atualizar snapshot&quot;.</p>
                ) : (
                  <div className="space-y-1">
                    {detail?.history.map((h) => (
                      <div key={h.date} className="flex items-center justify-between text-[11px] text-text-secondary">
                        <span>{h.date}</span>
                        <span>{formatBytes(h.totalBytes)}{h.usedPercent !== null ? ` · ${h.usedPercent}%` : ""}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {detail && detail.overrides.length > 0 && (
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">Exceções ativas</h3>
                  <div className="space-y-1.5">
                    {detail.overrides.map((o) => (
                      <div key={o.key} className="text-xs bg-brand-blue/5 border border-brand-blue/20 rounded-lg p-2">
                        <span className="font-semibold text-brand-blue">{o.key}</span>
                        <span className="text-text-secondary"> — limite: {o.limit ?? "ilimitado"} MB</span>
                        {o.reason && <p className="text-text-secondary mt-0.5">{o.reason}</p>}
                        {o.expiresAt && <p className="text-text-secondary">Expira em {new Date(o.expiresAt).toLocaleDateString("pt-BR")}</p>}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
