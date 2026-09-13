import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace";
import { PageHeader, EmptyState } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { GoalForm, goalStatuses } from "@/features/life/forms";
import { money } from "@/features/finance/money";
import { Plus } from "lucide-react";

export default async function GoalsPage() {
  const context = await getWorkspaceContext();
  const where = { workspaceId: context.workspaceId };
  const [goals, habits, tasks, applications, savings] = await Promise.all([
    prisma.goal.findMany({ where, orderBy: [{ status: "asc" }, { targetDate: "asc" }] }),
    prisma.habit.findMany({ where: { ...where, isArchived: false }, select: { id: true, name: true } }),
    prisma.task.findMany({ where: { ...where, status: { notIn: ["DONE", "CANCELED"] } }, select: { id: true, title: true }, take: 100 }),
    prisma.application.findMany({ where, select: { id: true, jobTitle: true }, take: 100 }),
    prisma.savingsGoal.findMany({ where, select: { id: true, name: true }, take: 100 }),
  ]);
  const links = [...habits.map(x=>({module:"HABITS",id:x.id,label:x.name})), ...tasks.map(x=>({module:"TASKS",id:x.id,label:x.title})), ...applications.map(x=>({module:"CAREER",id:x.id,label:x.jobTitle})), ...savings.map(x=>({module:"FINANCE",id:x.id,label:x.name}))];
  return <div className="stack"><PageHeader eyebrow="LIFE · GOALS" title="Transforme intenção em progresso." description="Defina o alvo, acompanhe o agora e conecte seus módulos."><Modal title="Criar meta" trigger={<><Plus size={15}/>Nova meta</>}><GoalForm links={links}/></Modal></PageHeader>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{goals.map(goal=>{const percent=Math.min(100,Math.round(goal.current/goal.target*100));const value=goal.type==="MONEY"?money(goal.current):`${goal.current.toLocaleString(context.workspace.locale)} ${goal.unit}`;const target=goal.type==="MONEY"?money(goal.target):`${goal.target.toLocaleString(context.workspace.locale)} ${goal.unit}`;return <article className="panel stack" key={goal.id}><div className="row justify-between"><span className="badge">{goalStatuses[goal.status]}</span><strong>{percent}%</strong></div><div><h2>{goal.name}</h2><p className="muted mt-1">{value} de {target}</p></div><progress value={percent} max={100}/><div className="row justify-between"><small className="muted">{goal.linkedModule ? `Ligada a ${goal.linkedModule}` : "Meta independente"}</small><Modal title="Editar meta" trigger="Editar"><GoalForm goal={goal} links={links}/></Modal></div></article>})}{!goals.length&&<div className="panel md:col-span-2 xl:col-span-3"><EmptyState title="Qual é a sua próxima conquista?" description="Crie uma meta mensurável e acompanhe seu avanço."/></div>}</div>
  </div>;
}
