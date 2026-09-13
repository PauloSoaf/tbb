"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { RefreshCw, ShieldCheck, Download, Database, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  refreshStorageSnapshotAdminAction,
  runStorageReconciliationAdminAction,
  getDbInfraMetricsAdminAction,
} from "@/actions/admin-storage.action";
import type { StorageReconciliationReport } from "@/services/admin/storage-reconciliation.service";
import type { DatabaseMetrics } from "@/services/admin/db-metrics.service";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

export function StorageAdminToolbar() {
  const [snapshotPending, startSnapshot] = useTransition();
  const [reconcilePending, startReconcile] = useTransition();
  const [dbPending, startDb] = useTransition();
  const [report, setReport] = useState<StorageReconciliationReport | null>(null);
  const [dbMetrics, setDbMetrics] = useState<DatabaseMetrics | null>(null);
  const [showDbMetrics, setShowDbMetrics] = useState(false);

  const handleSnapshot = () => {
    startSnapshot(async () => {
      const res = await refreshStorageSnapshotAdminAction();
      if ("error" in res) toast.error(res.error);
      else toast.success(`Snapshot atualizado: ${res.tenantsSnapshotted} clínica(s).`);
    });
  };

  const handleReconcile = () => {
    startReconcile(async () => {
      const res = await runStorageReconciliationAdminAction();
      if (res.error) {
        toast.error(res.error);
      } else {
        setReport(res.report);
        toast.success("Reconciliação concluída (somente leitura — nada foi alterado).");
      }
    });
  };

  const handleToggleDbMetrics = () => {
    if (showDbMetrics) {
      setShowDbMetrics(false);
      return;
    }
    setShowDbMetrics(true);
    if (!dbMetrics) {
      startDb(async () => {
        const res = await getDbInfraMetricsAdminAction();
        if (res.error) toast.error(res.error);
        else setDbMetrics(res.metrics);
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleSnapshot}
          disabled={snapshotPending}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-blue/10 hover:bg-brand-blue text-brand-blue hover:text-white text-xs font-semibold transition-all disabled:opacity-50"
        >
          {snapshotPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Atualizar snapshot
        </button>
        <button
          type="button"
          onClick={handleReconcile}
          disabled={reconcilePending}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-card-bg border border-border-neutral hover:border-brand-blue text-text-primary text-xs font-semibold transition-all disabled:opacity-50"
        >
          {reconcilePending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />}
          Rodar reconciliação (dry-run)
        </button>
        <button
          type="button"
          onClick={handleToggleDbMetrics}
          disabled={dbPending}
          aria-busy={dbPending || undefined}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-card-bg border border-border-neutral hover:border-brand-blue text-text-primary text-xs font-semibold transition-all disabled:opacity-50"
        >
          {dbPending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-600" /> : <Database className="h-3.5 w-3.5 text-purple-600" />}
          {dbPending ? "Carregando banco..." : `${showDbMetrics ? "Ocultar" : "Ver"} banco de dados`}
        </button>
        <Link
          href="/api/admin/storage/export"
          data-navigation-feedback="off"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-card-bg border border-border-neutral hover:border-brand-blue text-text-primary text-xs font-semibold transition-all"
        >
          <Download className="w-3.5 h-3.5" />
          Exportar CSV
        </Link>
      </div>

      {report && (
        <div className="bg-card-bg border border-border-neutral rounded-2xl p-4 text-xs space-y-1.5">
          <p className="font-bold text-text-primary">Relatório de reconciliação (somente leitura)</p>
          <p className="text-text-secondary">Total no ledger: <strong className="text-text-primary">{report.totalLedgerFiles}</strong></p>
          <p className="text-text-secondary">Com tamanho desconhecido (0 bytes): <strong className="text-text-primary">{report.missingSizeCount}</strong></p>
          <p className="text-text-secondary">URLs duplicadas: <strong className="text-text-primary">{report.duplicateUrlCount}</strong></p>
          {report.providerCheckApplicable ? (
            <>
              <p className="text-text-secondary">
                Verificados no provider (amostra): <strong className="text-text-primary">{report.providerSampledCount}</strong>
              </p>
              <p className={report.providerMissingCount > 0 ? "text-amber-600 font-semibold" : "text-text-secondary"}>
                {report.providerMissingCount > 0 && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                Ausentes no provider: {report.providerMissingCount}
              </p>
            </>
          ) : (
            <p className="text-text-secondary italic">Checagem contra o provider não aplicável (STORAGE_PROVIDER não é vercel-blob nesta configuração).</p>
          )}
          <p className="text-text-secondary/70">Rodado em {new Date(report.ranAt).toLocaleString("pt-BR")}</p>
        </div>
      )}

      {showDbMetrics && (
        <div className="bg-card-bg border border-border-neutral rounded-2xl p-4">
          {dbPending || !dbMetrics ? (
            <div className="flex items-center justify-center py-6 text-text-secondary">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : (
            <>
              <p className="text-xs font-bold text-text-primary mb-1">
                Banco de dados: {formatBytes(dbMetrics.databaseBytes)} (Postgres — pg_database_size)
              </p>
              <p className="text-[11px] text-text-secondary mb-3">
                Métrica real de infraestrutura, direto do Postgres. Não inclui CPU/RAM (provedor serverless não expõe isso via API).
              </p>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-text-secondary uppercase text-[10px] border-b border-border-neutral">
                    <th className="py-1.5">Tabela</th>
                    <th className="py-1.5 text-right">Total</th>
                    <th className="py-1.5 text-right">Índices</th>
                    <th className="py-1.5 text-right">Linhas</th>
                    <th className="py-1.5 text-right">Mortas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-neutral/40">
                  {dbMetrics.topTables.map((t) => (
                    <tr key={t.tableName}>
                      <td className="py-1.5 font-mono text-text-primary">{t.tableName}</td>
                      <td className="py-1.5 text-right text-text-primary font-semibold">{formatBytes(t.totalBytes)}</td>
                      <td className="py-1.5 text-right text-text-secondary">{formatBytes(t.indexBytes)}</td>
                      <td className="py-1.5 text-right text-text-secondary">{t.rowEstimate.toLocaleString("pt-BR")}</td>
                      <td className="py-1.5 text-right text-text-secondary">{t.deadRowEstimate.toLocaleString("pt-BR")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </div>
  );
}
