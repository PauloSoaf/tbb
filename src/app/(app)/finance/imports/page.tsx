import { PageHeader } from "@/components/ui/PageHeader";
import { ActionForm } from "@/components/ui/ActionForm";
import { ImportWizard } from "@/features/finance/ImportWizard";
import { DocumentImportWizard } from "@/features/finance/DocumentImportWizard";
import { rollbackImport } from "@/features/finance/actions";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/workspace";
import { money } from "@/features/finance/money";

export default async function ImportsPage() {
  const c = await requirePermission("READ"), owner = c.role === "OWNER";
  const [allAccounts, batches, sources, statements] = await Promise.all([
    prisma.account.findMany({ where: { workspaceId: c.workspaceId, isArchived: false }, select: { id: true, name: true, institution: true, type: true }, orderBy: { name: "asc" } }),
    prisma.importBatch.findMany({ where: { workspaceId: c.workspaceId, ...(!owner ? { source: { not: "DOCUMENT_V2" } } : {}) }, orderBy: { createdAt: "desc" }, take: 40 }),
    owner ? prisma.financialSource.findMany({ where: { workspaceId: c.workspaceId }, select: { id: true, fileName: true, accountId: true }, orderBy: { createdAt: "desc" }, take: 100 }) : Promise.resolve([]),
    owner ? prisma.cardStatement.findMany({ where: { workspaceId: c.workspaceId }, select: { id: true, accountId: true, referenceMonth: true, amountCents: true, dueDate: true, updatedAt: true, account: { select: { name: true } } }, orderBy: { dueDate: "desc" } }) : Promise.resolve([]),
  ]);
  const accounts = allAccounts.filter(a => a.institution !== "__TBB_UNASSIGNED__");
  return <div className="stack finance-imports-page"><PageHeader eyebrow="MONEY · IMPORT" title="Importe com revisão." description="Confira originais, datas, pagamentos e possíveis duplicatas antes de confirmar apenas as linhas aprovadas."/>
    {owner && <DocumentImportWizard accounts={accounts} sources={sources} timezone={c.workspace.timezone} statements={statements.map(s => ({ id: s.id, accountId: s.accountId, version: s.updatedAt.toISOString(), label: `${s.account.name} · ${s.referenceMonth || s.dueDate?.toISOString().slice(0, 10) || "sem data"} · ${money(s.amountCents)}` }))}/>}
    <details><summary>Importador tabular com mapeamento personalizado</summary><ImportWizard accounts={accounts.filter(a => a.type !== "CREDIT_CARD")}/></details>
    <section className="panel stack"><h2>Histórico de lotes</h2>{batches.map(batch => <div className="list-item" key={batch.id}><div><h3>{batch.fileName}</h3><small>{batch.source} · {batch.rowCount} linhas · {batch.status} · {batch.createdAt.toLocaleString(c.workspace.locale, { timeZone: c.workspace.timezone })}</small></div><div className="row"><span className="badge">{batch.importedCount} confirmadas</span>{["COMPLETED", "NEEDS_REVIEW"].includes(batch.status) && batch.importedCount > 0 && <ActionForm action={rollbackImport} className="row"><input type="hidden" name="batchId" value={batch.id}/><input name="confirmation" placeholder="DESFAZER" aria-label="Digite DESFAZER" required/><button className="button-secondary">Desfazer lote</button></ActionForm>}</div></div>)}{!batches.length && <p className="empty-state muted">Nenhuma importação ainda.</p>}</section>
  </div>;
}
