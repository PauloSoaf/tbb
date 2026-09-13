import Link from "next/link";
import { ArrowRight, Check, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ActionForm } from "@/components/ui/ActionForm";
import { HabitQuickActions } from "@/features/habits/components/HabitQuickActions";
import { getTodayHabits } from "@/features/habits/queries";
import { changeTaskStatus } from "@/features/life/actions";
import { buildInsights } from "@/features/insights/engine";
import { financeSummary } from "@/features/finance/queries";
import { money } from "@/features/finance/money";
import { dayKey, dateKeyToUTC, addDays } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace";

export default async function TodayPage() {
  const c = await getWorkspaceContext();
  const today = dayKey(new Date(), c.workspace.timezone);
  const tomorrow = addDays(today, 1);
  const [habits, tasks, finance, applications, interviews, goals, insights] = await Promise.all([
    getTodayHabits(c.workspaceId, today),
    prisma.task.findMany({ where: { workspaceId: c.workspaceId, status: { notIn: ["DONE", "CANCELED"] }, OR: [{ dueDate: { lte: today } }, { scheduledAt: { gte: dateKeyToUTC(today), lt: dateKeyToUTC(tomorrow) } }] }, orderBy: [{ priority: "desc" }, { dueDate: "asc" }], take: 6 }),
    financeSummary(c.workspaceId, today),
    prisma.application.findMany({ where: { workspaceId: c.workspaceId, status: { notIn: ["ACCEPTED", "REJECTED", "WITHDRAWN"] }, nextActionDate: { lte: today } }, include: { company: true }, take: 5 }),
    prisma.interview.findMany({ where: { workspaceId: c.workspaceId, scheduledAt: { gte: new Date(), lt: dateKeyToUTC(addDays(today, 8)) } }, include: { application: { include: { company: true } } }, orderBy: { scheduledAt: "asc" }, take: 4 }),
    prisma.goal.findMany({ where: { workspaceId: c.workspaceId, status: "ACTIVE" }, orderBy: { targetDate: "asc" }, take: 4 }),
    buildInsights(c.workspaceId, today),
  ]);
  const habitDone = habits.filter((habit) => habit.progress.completed).length;
  return <div className="stack">
    <PageHeader eyebrow={new Intl.DateTimeFormat(c.workspace.locale, { timeZone: c.workspace.timezone, dateStyle: "full" }).format(new Date()).toUpperCase()} title={`Olá, ${c.user.name.split(" ")[0]}. O que importa hoje?`} description="Seu centro operacional, composto somente por dados reais."><Link className="button-secondary" href="/weekly-review">Revisão semanal</Link></PageHeader>
    <div className="quick-actions"><Link href="/tasks?action=new"><Plus size={15}/>Tarefa</Link><Link href="/habits?action=new"><Plus size={15}/>Hábito</Link><Link href="/finance/transactions?action=expense"><Plus size={15}/>Despesa</Link><Link href="/career/applications?action=new"><Plus size={15}/>Candidatura</Link></div>
    <div className="today-grid">
      <section className="panel stack"><div className="panel-header"><div><h2>Hábitos</h2><p className="muted">{habitDone} de {habits.length} concluídos</p></div><Link href="/habits?view=today">Ver todos</Link></div>{habits.map((habit) => <div className="list-item" key={habit.id}><div><h3>{habit.icon} {habit.name}</h3><small>{habit.progress.value.toLocaleString(c.workspace.locale)} / {habit.target.toLocaleString(c.workspace.locale)} {habit.unit}</small></div><HabitQuickActions habitId={habit.id} date={today} type={habit.type} completed={habit.progress.completed} value={habit.entries.find((entry) => entry.date === today)?.value || 0}/></div>)}{!habits.length && <p className="empty-state muted">Nenhum hábito programado para hoje.</p>}</section>
      <section className="panel stack"><div className="panel-header"><div><h2>Tarefas</h2><p className="muted">{tasks.length} pedem atenção</p></div><Link href="/tasks">Ver todas</Link></div>{tasks.map((task) => <div className="list-item" key={task.id}><div><h3>{task.title}</h3><small>{task.dueDate && task.dueDate < today ? "Atrasada" : task.dueDate === today ? "Vence hoje" : "Agendada hoje"} · {task.priority}</small></div><ActionForm action={changeTaskStatus}><input type="hidden" name="id" value={task.id}/><input type="hidden" name="status" value="DONE"/><button className="icon-button" aria-label="Concluir tarefa"><Check size={16}/></button></ActionForm></div>)}{!tasks.length && <p className="empty-state muted">Nenhuma tarefa pendente para hoje.</p>}</section>
      <section className="panel stack"><div className="panel-header"><div><h2>Dinheiro</h2><p className="muted">Resumo deste mês</p></div><Link href="/finance">Abrir</Link></div><div className="list-item"><span>Despesas</span><strong className="text-danger">{money(finance.expenses)}</strong></div><div className="list-item"><span>Saldo do mês</span><strong>{money(finance.income-finance.expenses)}</strong></div><div className="list-item"><span>Assinaturas mensais</span><strong>{money(finance.subscriptionMonthly)}</strong></div></section>
      <section className="panel stack"><div className="panel-header"><div><h2>Carreira</h2><p className="muted">Próximas ações</p></div><Link href="/career">Abrir</Link></div>{applications.map((application) => <Link href={`/career/applications/${application.id}`} className="list-item" key={application.id}><div><h3>{application.jobTitle}</h3><small>Follow-up · {application.company.name}</small></div><ArrowRight size={15}/></Link>)}{interviews.map((interview) => <Link href={`/career/applications/${interview.applicationId}`} className="list-item" key={interview.id}><div><h3>{interview.title}</h3><small>{interview.application.company.name} · {interview.scheduledAt.toLocaleString(c.workspace.locale, { timeZone: c.workspace.timezone, dateStyle: "short", timeStyle: "short" })}</small></div><span className="badge">Entrevista</span></Link>)}{!applications.length && !interviews.length && <p className="empty-state muted">Nenhuma ação ou entrevista próxima.</p>}</section>
    </div>
    <div className="split-grid">
      <section className="panel stack"><div className="panel-header"><h2>Metas em andamento</h2><Link href="/goals">Ver metas</Link></div>{goals.map((goal) => { const percent=Math.min(100,Math.round(goal.current/goal.target*100)); return <div className="stack" key={goal.id}><div className="row justify-between"><span>{goal.name}</span><strong>{percent}%</strong></div><progress max={100} value={percent}/></div>; })}{!goals.length && <p className="empty-state muted">Nenhuma meta ativa.</p>}</section>
      <section className="panel stack"><div className="panel-header"><h2>Insights</h2><Link href="/insights">Ver todos</Link></div>{insights.slice(0,3).map((insight) => <Link href={insight.href} className="insight-card" data-tone={insight.tone} key={insight.id}><span className="badge">{insight.module}</span><strong>{insight.title}</strong><small>{insight.detail}</small></Link>)}{!insights.length && <p className="empty-state muted">Use o TBB para formar seus primeiros insights.</p>}</section>
    </div>
  </div>;
}
