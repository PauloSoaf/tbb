import { requireGlobalAdmin } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";
export const metadata = { title: "Administração" };
export default async function AdminPage() {
  await requireGlobalAdmin();
  const [users, workspaces, activeSessions, storage, plans, recentWorkspaces] = await Promise.all([
    prisma.user.count(), prisma.workspace.count(),
    prisma.userSession.count({ where: { status: "ACTIVE", expiresAt: { gt: new Date() } } }),
    prisma.storageFile.aggregate({ _sum: { sizeBytes: true }, _count: true }),
    prisma.subscriptionPlan.findMany({ include: { _count: { select: { subscriptions: true } } }, orderBy: { name: "asc" } }),
    prisma.workspace.findMany({ take: 20, orderBy: { createdAt: "desc" }, select: { id: true, name: true, isActive: true, createdAt: true, _count: { select: { memberships: true } } } }),
  ]);
  return <div className="stack"><header className="page-header"><div><h1>Administração da plataforma</h1><p className="muted">Contas, espaços e uso do TBB.</p></div></header>
    <div className="form-grid">{[["Usuários", users], ["Espaços", workspaces], ["Sessões ativas", activeSessions], ["Armazenamento", `${((storage._sum.sizeBytes ?? 0) / 1048576).toFixed(2)} MB`]].map(([name, value]) => <section className="panel" key={name}><p className="muted">{name}</p><strong style={{ fontSize: 28 }}>{value}</strong></section>)}</div>
    <section className="panel stack"><h2>Planos</h2>{plans.length === 0 ? <p className="empty-state">Nenhum plano comercial cadastrado. O catálogo será publicado quando preços e condições forem definidos.</p> : plans.map((plan) => <div className="row" key={plan.id}><strong>{plan.name}</strong><span>{plan.priceCents === null ? "Preço não definido" : (plan.priceCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span><span className="muted">{plan._count.subscriptions} assinaturas</span></div>)}</section>
    <section className="panel stack"><h2>Espaços recentes</h2>{recentWorkspaces.map((workspace) => <div className="row" key={workspace.id} style={{ justifyContent: "space-between" }}><strong>{workspace.name}</strong><span className="muted">{workspace._count.memberships} membros · {workspace.isActive ? "Ativo" : "Inativo"}</span></div>)}</section>
  </div>;
}
