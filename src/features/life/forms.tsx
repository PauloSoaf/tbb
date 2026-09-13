import type { Goal, Project, Task } from "@prisma/client";
import { ActionForm } from "@/components/ui/ActionForm";
import { PendingSubmitButton } from "@/components/ui/PendingSubmitButton";
import { localDateTimeValue } from "@/lib/dates";
import { saveGoal, saveProject, saveTask } from "./actions";

export const taskStatuses = { TODO: "A fazer", IN_PROGRESS: "Em andamento", DONE: "Concluída", CANCELED: "Cancelada" };
export const priorities = { LOW: "Baixa", MEDIUM: "Média", HIGH: "Alta", URGENT: "Urgente" };
export const projectStatuses = { ACTIVE: "Em andamento", PAUSED: "Pausado", DONE: "Concluído", ARCHIVED: "Arquivado" };
export const goalStatuses = { ACTIVE: "Em andamento", PAUSED: "Pausada", ACHIEVED: "Alcançada", ARCHIVED: "Arquivada" };

export function TaskForm({ task, projects, today, timezone }: { task?: Task; projects: Pick<Project, "id" | "name">[]; today: string; timezone: string }) {
  return <ActionForm action={saveTask} className="stack" resetOnSuccess={!task}>
    {task && <input type="hidden" name="id" value={task.id} />}
    <div className="form-grid"><label className="field">Tarefa<input name="title" required maxLength={200} defaultValue={task?.title} placeholder="Qual é o próximo passo?" /></label><label className="field">Prazo<input name="dueDate" type="date" defaultValue={task?.dueDate ?? (task ? "" : today)} /></label></div>
    <details open={task ? true : undefined}><summary className="muted" style={{ cursor: "pointer", marginBottom: 12 }}>Mais detalhes</summary><div className="stack"><div className="form-grid"><label className="field">Projeto<select name="projectId" defaultValue={task?.projectId ?? ""}><option value="">Sem projeto</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label><label className="field">Prioridade<select name="priority" defaultValue={task?.priority ?? "MEDIUM"}>{Object.entries(priorities).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="field">Status<select name="status" defaultValue={task?.status ?? "TODO"}>{Object.entries(taskStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="field">Agendar horário<input name="scheduledAt" type="datetime-local" defaultValue={localDateTimeValue(task?.scheduledAt ?? null, timezone)} /><small className="muted">Fuso: {timezone}</small></label><label className="field">Duração estimada (minutos)<input name="estimatedDuration" type="number" min="1" max="100000" defaultValue={task?.estimatedDuration ?? ""} /></label><label className="field">Tags<input name="tags" maxLength={500} defaultValue={task?.tags.join(", ") ?? ""} placeholder="Separadas por vírgula" /></label></div><label className="field">Descrição<textarea name="description" rows={2} maxLength={5000} defaultValue={task?.description ?? ""} /></label></div></details>
    <div><PendingSubmitButton className="button">{task ? "Salvar tarefa" : "Adicionar tarefa"}</PendingSubmitButton></div>
  </ActionForm>;
}

export function ProjectForm({ project }: { project?: Project }) {
  return <ActionForm action={saveProject} className="stack" resetOnSuccess={!project}>
    {project && <input type="hidden" name="id" value={project.id} />}
    <div className="form-grid"><label className="field">Nome<input name="name" required maxLength={150} defaultValue={project?.name} placeholder="Seu próximo projeto" /></label><label className="field">Status<select name="status" defaultValue={project?.status ?? "ACTIVE"}>{Object.entries(projectStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="field">Cor<input name="color" type="color" defaultValue={project?.color ?? "#6366f1"} /></label><label className="field">Ícone<input name="icon" maxLength={8} required defaultValue={project?.icon ?? "◈"} /></label><label className="field">Início<input name="startDate" type="date" defaultValue={project?.startDate ?? ""} /></label><label className="field">Entrega prevista<input name="targetDate" type="date" defaultValue={project?.targetDate ?? ""} /></label></div><label className="field">Descrição<textarea name="description" rows={2} maxLength={5000} defaultValue={project?.description ?? ""} /></label><div><PendingSubmitButton className="button">{project ? "Salvar projeto" : "Criar projeto"}</PendingSubmitButton></div>
  </ActionForm>;
}

export type GoalLinkOptions = { module: string; id: string; label: string }[];
export function GoalForm({ goal, links }: { goal?: Goal; links: GoalLinkOptions }) {
  const monetary = goal?.type === "MONEY";
  return <ActionForm action={saveGoal} className="stack" resetOnSuccess={!goal}>
    {goal && <input type="hidden" name="id" value={goal.id} />}
    <div className="form-grid"><label className="field">Nome<input name="name" required maxLength={150} defaultValue={goal?.name} placeholder="O que você quer alcançar?" /></label><label className="field">Tipo<select name="type" defaultValue={goal?.type ?? "NUMERIC"}><option value="NUMERIC">Numérica</option><option value="MONEY">Dinheiro</option><option value="BOOLEAN">Sim ou não</option></select></label><label className="field">Meta<input name="target" type="number" min="0.000001" max="1000000000" step="any" defaultValue={goal ? goal.target / (monetary ? 100 : 1) : 1} required /></label><label className="field">Progresso atual<input name="current" type="number" min="0" max="1000000000" step="any" defaultValue={goal ? goal.current / (monetary ? 100 : 1) : 0} required /></label><label className="field">Unidade<input name="unit" maxLength={30} defaultValue={goal?.unit ?? "unidades"} required placeholder="páginas, km, BRL…" /></label><label className="field">Prazo<input name="targetDate" type="date" defaultValue={goal?.targetDate ?? ""} /></label><label className="field">Status<select name="status" defaultValue={goal?.status ?? "ACTIVE"}>{Object.entries(goalStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
    <label className="field">Descrição<textarea name="description" rows={2} maxLength={5000} defaultValue={goal?.description ?? ""} /></label>
    <details><summary className="muted" style={{ cursor: "pointer", marginBottom: 12 }}>Vincular a outro módulo</summary><div className="form-grid"><label className="field">Módulo<select name="linkedModule" defaultValue={goal?.linkedModule ?? ""}><option value="">Sem vínculo</option><option value="HABITS">Hábitos</option><option value="TASKS">Tarefas</option><option value="CAREER">Carreira</option><option value="FINANCE">Finanças / reservas</option></select></label><label className="field">Registro<select name="linkedEntityId" defaultValue={goal?.linkedEntityId ?? ""}><option value="">Sem registro</option>{links.map((link) => <option key={`${link.module}:${link.id}`} value={link.id}>{link.module} · {link.label}</option>)}</select></label></div><p className="muted" style={{ marginTop: 10 }}>O vínculo conecta seu planejamento. Atualize o progresso desta meta manualmente.</p></details>
    <div><PendingSubmitButton className="button">{goal ? "Salvar meta" : "Criar meta"}</PendingSubmitButton></div>
  </ActionForm>;
}
