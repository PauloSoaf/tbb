import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace";
import { PageHeader, EmptyState } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { ProjectForm, projectStatuses } from "@/features/life/forms";
import { Plus } from "lucide-react";

export default async function ProjectsPage() {
  const context = await getWorkspaceContext();
  const projects = await prisma.project.findMany({ where: { workspaceId: context.workspaceId }, include: { _count: { select: { tasks: true } } }, orderBy: [{ status: "asc" }, { updatedAt: "desc" }] });
  return <div className="stack"><PageHeader eyebrow="LIFE · PROJECTS" title="Resultados maiores, em passos menores." description="Reúna tarefas que levam ao mesmo resultado."><Modal title="Criar projeto" trigger={<><Plus size={15}/>Novo projeto</>}><ProjectForm/></Modal></PageHeader>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{projects.map(project=><article className="panel stack" key={project.id}><div className="row justify-between"><span className="text-xl" aria-hidden>{project.icon}</span><span className="badge">{projectStatuses[project.status]}</span></div><div><h2>{project.name}</h2><p className="muted mt-1">{project.description || "Sem descrição"}</p></div><div className="row justify-between"><small className="muted">{project._count.tasks} tarefas</small><Modal title="Editar projeto" trigger="Editar"><ProjectForm project={project}/></Modal></div></article>)}{!projects.length&&<div className="panel md:col-span-2 xl:col-span-3"><EmptyState title="Nenhum projeto ainda" description="Crie um projeto para organizar tarefas relacionadas."/></div>}</div>
  </div>;
}
