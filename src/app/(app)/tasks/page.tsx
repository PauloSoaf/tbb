import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace";
import { dayKey, formatDay } from "@/lib/dates";
import { PageHeader, EmptyState } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { TaskForm, priorities, taskStatuses } from "@/features/life/forms";
import { ActionForm } from "@/components/ui/ActionForm";
import { changeTaskStatus } from "@/features/life/actions";
import { Check, Plus } from "lucide-react";

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ view?: string; project?: string }> }) {
  const context = await getWorkspaceContext();
  const params = await searchParams;
  const today = dayKey(new Date(), context.workspace.timezone);
  const projects = await prisma.project.findMany({ where: { workspaceId: context.workspaceId, status: { not: "ARCHIVED" } }, orderBy: { name: "asc" } });
  const view = ["today", "upcoming", "all"].includes(params.view || "") ? params.view! : "today";
  const tasks = await prisma.task.findMany({
    where: {
      workspaceId: context.workspaceId,
      ...(params.project ? { projectId: params.project } : {}),
      ...(view === "today" ? { OR: [{ dueDate: today }, { scheduledAt: { gte: new Date(`${today}T00:00:00Z`), lt: new Date(`${today}T23:59:59Z`) } }] } : {}),
      ...(view === "upcoming" ? { dueDate: { gt: today } } : {}),
    },
    include: { project: true },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });
  return <div className="stack"><PageHeader eyebrow="LIFE · TASKS" title="Faça o próximo passo ficar óbvio." description="Capture rápido, escolha uma prioridade e conclua."><Modal title="Adicionar tarefa" trigger={<><Plus size={15}/>Adicionar</>}><TaskForm projects={projects} today={today} timezone={context.workspace.timezone}/></Modal></PageHeader>
    <form className="row"><div className="tabs">{[["today","Hoje"],["upcoming","Próximas"],["all","Todas"]].map(([id,label])=><button name="view" value={id} aria-current={view===id?"page":undefined} key={id}>{label}</button>)}</div><select name="project" defaultValue={params.project || ""} aria-label="Filtrar por projeto"><option value="">Todos os projetos</option>{projects.map(project=><option key={project.id} value={project.id}>{project.name}</option>)}</select><button className="button-secondary">Aplicar</button></form>
    <section className="panel">{tasks.map(task=><article className="list-item" key={task.id}><div className="row"><ActionForm action={changeTaskStatus}><input type="hidden" name="id" value={task.id}/><input type="hidden" name="status" value={task.status === "DONE" ? "TODO" : "DONE"}/><button className="icon-button" aria-label={task.status === "DONE" ? "Reabrir tarefa" : "Concluir tarefa"}><Check size={17}/></button></ActionForm><div><h3 style={{textDecoration:task.status==="DONE"?"line-through":undefined}}>{task.title}</h3><small>{task.project?.name || "Sem projeto"} · {priorities[task.priority]}{task.dueDate ? ` · ${formatDay(task.dueDate, context.workspace.locale)}` : ""}</small></div></div><div className="row"><span className="badge">{taskStatuses[task.status]}</span><Modal title="Editar tarefa" trigger="Editar" drawer><TaskForm task={task} projects={projects} today={today} timezone={context.workspace.timezone}/></Modal></div></article>)}{!tasks.length&&<EmptyState title="Nada para esta visão" description="Adicione uma tarefa ou mude o filtro."/>}</section>
  </div>;
}
