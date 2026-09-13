"use client";

import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { StickyNote, Tag, CheckSquare, Plus, Trash2, Pin, PinOff, Check, Loader2 } from "lucide-react";
import {
  createPatientNoteAction,
  updatePatientNoteAction,
  deletePatientNoteAction,
  upsertPatientTagAction,
  deletePatientTagAction,
  createPatientTaskAction,
  updatePatientTaskAction,
  deletePatientTaskAction,
} from "@/actions/prontuario.action";
import type { PatientTaskStatus, PatientTaskPriority } from "@prisma/client";
import { AsyncButton } from "@/components/ui/AsyncButton";

type NoteTag = { tagId: string; tag: { id: string; label: string; color: string } };
type Note = {
  id: string;
  title: string | null;
  body: string;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  tags: NoteTag[];
};
type PTag = { id: string; label: string; color: string; createdAt: Date };
type Task = {
  id: string;
  title: string;
  description: string | null;
  status: PatientTaskStatus;
  priority: PatientTaskPriority;
  dueDate: Date | null;
  completedAt: Date | null;
  createdAt: Date;
};

interface Props {
  tenantSlug: string;
  patientId: string;
  initialNotes: Note[];
  initialTags: PTag[];
  initialTasks: Task[];
}

const PRIORITY_LABEL: Record<PatientTaskPriority, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
};

const PRIORITY_COLOR: Record<PatientTaskPriority, string> = {
  LOW: "bg-gray-100 text-gray-600",
  MEDIUM: "bg-amber-100 text-amber-700",
  HIGH: "bg-red-100 text-red-700",
};

const STATUS_LABEL: Record<PatientTaskStatus, string> = {
  PENDING: "Pendente",
  IN_PROGRESS: "Em andamento",
  DONE: "Concluída",
  CANCELED: "Cancelada",
};

export function ProntuarioPanel({ tenantSlug, patientId, initialNotes, initialTags, initialTasks }: Props) {
  const [activeTab, setActiveTab] = useState<"notes" | "tasks" | "tags">("notes");
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [tags, setTags] = useState<PTag[]>(initialTags);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [pendingActions, setPendingActions] = useState<Set<string>>(() => new Set());

  // Notes state
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteBody, setNewNoteBody] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  // Tasks state
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<PatientTaskPriority>("MEDIUM");
  const [addingTask, setAddingTask] = useState(false);

  // Tags state
  const [newTagLabel, setNewTagLabel] = useState("");
  const [newTagColor, setNewTagColor] = useState("#6366f1");

  const runPendingAction = async (key: string, action: () => Promise<void>) => {
    if (pendingActions.has(key)) return;
    setPendingActions((previous) => new Set(previous).add(key));
    try {
      await action();
    } finally {
      setPendingActions((previous) => {
        const next = new Set(previous);
        next.delete(key);
        return next;
      });
    }
  };

  // ─── Notes handlers ─────────────────────────────────────────────────────────

  const handleAddNote = async () => {
    if (!newNoteBody.trim()) return;
    await runPendingAction("note:add", async () => {
      const res = await createPatientNoteAction(tenantSlug, patientId, {
        title: newNoteTitle || undefined,
        body: newNoteBody,
      });
      if (res.note) {
        setNotes((prev) => [res.note!, ...prev]);
        setNewNoteTitle("");
        setNewNoteBody("");
        setAddingNote(false);
        toast.success("Nota criada.");
      } else {
        toast.error(res.error ?? "Erro ao criar nota.");
      }
    });
  };

  const handlePinNote = async (note: Note) => {
    await runPendingAction(`note:pin:${note.id}`, async () => {
      const res = await updatePatientNoteAction(tenantSlug, note.id, { isPinned: !note.isPinned });
      if (res.note) {
        setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, isPinned: !note.isPinned } : n))
          .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)));
      }
    });
  };

  const handleDeleteNote = async (noteId: string) => {
    await runPendingAction(`note:delete:${noteId}`, async () => {
      const res = await deletePatientNoteAction(tenantSlug, noteId, patientId);
      if (res.success) {
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
        toast.success("Nota removida.");
      } else {
        toast.error(res.error ?? "Erro ao remover nota.");
      }
    });
  };

  // ─── Tags handlers ───────────────────────────────────────────────────────────

  const handleAddTag = async () => {
    if (!newTagLabel.trim()) return;
    await runPendingAction("tag:add", async () => {
      const res = await upsertPatientTagAction(tenantSlug, patientId, newTagLabel.trim(), newTagColor);
      if (res.tag) {
        setTags((prev) => {
          const exists = prev.find((t) => t.id === res.tag!.id);
          return exists ? prev.map((t) => (t.id === res.tag!.id ? res.tag! : t)) : [...prev, res.tag!];
        });
        setNewTagLabel("");
        toast.success("Tag adicionada.");
      } else {
        toast.error(res.error ?? "Erro ao criar tag.");
      }
    });
  };

  const handleDeleteTag = async (tagId: string) => {
    await runPendingAction(`tag:delete:${tagId}`, async () => {
      const res = await deletePatientTagAction(tenantSlug, tagId);
      if (res.success) {
        setTags((prev) => prev.filter((t) => t.id !== tagId));
        toast.success("Tag removida.");
      } else {
        toast.error(res.error ?? "Erro ao remover tag.");
      }
    });
  };

  // ─── Tasks handlers ──────────────────────────────────────────────────────────

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    await runPendingAction("task:add", async () => {
      const res = await createPatientTaskAction(tenantSlug, patientId, {
        title: newTaskTitle,
        priority: newTaskPriority,
      });
      if (res.task) {
        setTasks((prev) => [res.task!, ...prev]);
        setNewTaskTitle("");
        setNewTaskPriority("MEDIUM");
        setAddingTask(false);
        toast.success("Tarefa criada.");
      } else {
        toast.error(res.error ?? "Erro ao criar tarefa.");
      }
    });
  };

  const handleToggleTaskStatus = async (task: Task) => {
    const nextStatus: PatientTaskStatus = task.status === "DONE" ? "PENDING" : "DONE";
    await runPendingAction(`task:status:${task.id}`, async () => {
      const res = await updatePatientTaskAction(tenantSlug, task.id, { status: nextStatus });
      if (res.task) {
        setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus, completedAt: res.task!.completedAt } : t)));
      }
    });
  };

  const handleDeleteTask = async (taskId: string) => {
    await runPendingAction(`task:delete:${taskId}`, async () => {
      const res = await deletePatientTaskAction(tenantSlug, taskId, patientId);
      if (res.success) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        toast.success("Tarefa removida.");
      } else {
        toast.error(res.error ?? "Erro ao remover tarefa.");
      }
    });
  };

  const pendingTasks = tasks.filter((t) => t.status !== "DONE" && t.status !== "CANCELED");
  const doneTasks = tasks.filter((t) => t.status === "DONE" || t.status === "CANCELED");

  return (
    <div className="bg-card-bg rounded-xl border border-border-neutral">
      {/* Header tabs */}
      <div className="flex items-center gap-1 p-4 border-b border-border-neutral">
        {[
          { id: "notes" as const, label: "Notas", icon: StickyNote, count: notes.length },
          { id: "tasks" as const, label: "Tarefas", icon: CheckSquare, count: pendingTasks.length },
          { id: "tags" as const, label: "Tags", icon: Tag, count: tags.length },
        ].map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === id
                ? "bg-brand-blue text-white"
                : "text-text-secondary hover:bg-warm-beige hover:text-text-primary"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === id ? "bg-white/20" : "bg-gray-100 text-gray-600"}`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="p-4">
        {/* ─── Notes Tab ──────────────────────────────────────────────────────── */}
        {activeTab === "notes" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary">Notas clínicas</h3>
              <button
                onClick={() => setAddingNote(!addingNote)}
                className="flex items-center gap-1.5 text-xs font-medium text-brand-blue hover:text-brand-blue-hover transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nova nota
              </button>
            </div>

            {addingNote && (
              <div className="border border-border-neutral rounded-lg p-3 space-y-2 bg-white">
                <input
                  type="text"
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  placeholder="Título (opcional)"
                  className="w-full text-sm border border-border-neutral rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                />
                <textarea
                  value={newNoteBody}
                  onChange={(e) => setNewNoteBody(e.target.value)}
                  placeholder="Corpo da nota *"
                  rows={3}
                  className="w-full text-sm border border-border-neutral rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 resize-none"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => { setAddingNote(false); setNewNoteTitle(""); setNewNoteBody(""); }}
                    className="text-xs px-3 py-1.5 border border-border-neutral rounded-lg text-text-secondary hover:bg-gray-50"
                  >Cancelar</button>
                  <AsyncButton
                    onClick={handleAddNote}
                    disabled={!newNoteBody.trim()}
                    pending={pendingActions.has("note:add")}
                    pendingLabel="Salvando..."
                    className="text-xs px-3 py-1.5 bg-brand-blue text-white rounded-lg disabled:opacity-50"
                  >Salvar</AsyncButton>
                </div>
              </div>
            )}

            {notes.length === 0 && !addingNote && (
              <p className="text-sm text-text-secondary text-center py-6">Nenhuma nota registrada.</p>
            )}

            <div className="space-y-2">
              {notes.map((note) => {
                const pinPending = pendingActions.has(`note:pin:${note.id}`);
                const deletePending = pendingActions.has(`note:delete:${note.id}`);
                return (
                <div key={note.id} className={`border rounded-lg p-3 ${note.isPinned ? "border-brand-blue/40 bg-brand-blue-soft" : "border-border-neutral bg-white"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {note.title && <p className="text-sm font-medium text-text-primary mb-1">{note.title}</p>}
                      <p className="text-sm text-text-secondary whitespace-pre-wrap">{note.body}</p>
                      <p className="text-xs text-text-secondary/60 mt-1.5">
                        {format(new Date(note.updatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                      {note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {note.tags.map(({ tag }) => (
                            <span key={tag.id} className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: tag.color + "22", color: tag.color }}>
                              {tag.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handlePinNote(note)}
                        disabled={pinPending || deletePending}
                        aria-busy={pinPending || undefined}
                        className="p-1 text-text-secondary hover:text-brand-blue transition-colors disabled:opacity-50"
                        title={note.isPinned ? "Desafixar" : "Fixar"}
                      >
                        {pinPending
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                          : note.isPinned
                            ? <PinOff className="w-3.5 h-3.5" />
                            : <Pin className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        disabled={deletePending || pinPending}
                        aria-busy={deletePending || undefined}
                        className="p-1 text-text-secondary hover:text-danger transition-colors disabled:opacity-50"
                        title="Excluir"
                        aria-label={deletePending ? "Removendo nota..." : "Excluir nota"}
                      >
                        {deletePending
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                          : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── Tasks Tab ──────────────────────────────────────────────────────── */}
        {activeTab === "tasks" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary">Tarefas e pendências</h3>
              <button
                onClick={() => setAddingTask(!addingTask)}
                className="flex items-center gap-1.5 text-xs font-medium text-brand-blue hover:text-brand-blue-hover transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nova tarefa
              </button>
            </div>

            {addingTask && (
              <div className="border border-border-neutral rounded-lg p-3 space-y-2 bg-white">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Título da tarefa *"
                  className="w-full text-sm border border-border-neutral rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-text-secondary">Prioridade:</label>
                  {(["LOW", "MEDIUM", "HIGH"] as PatientTaskPriority[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setNewTaskPriority(p)}
                      className={`text-xs px-2 py-1 rounded-full font-medium ${newTaskPriority === p ? PRIORITY_COLOR[p] + " ring-2 ring-offset-1 ring-brand-blue" : PRIORITY_COLOR[p]}`}
                    >
                      {PRIORITY_LABEL[p]}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => { setAddingTask(false); setNewTaskTitle(""); }} className="text-xs px-3 py-1.5 border border-border-neutral rounded-lg text-text-secondary hover:bg-gray-50">
                    Cancelar
                  </button>
                  <AsyncButton
                    onClick={handleAddTask}
                    disabled={!newTaskTitle.trim()}
                    pending={pendingActions.has("task:add")}
                    pendingLabel="Salvando..."
                    className="text-xs px-3 py-1.5 bg-brand-blue text-white rounded-lg disabled:opacity-50"
                  >
                    Salvar
                  </AsyncButton>
                </div>
              </div>
            )}

            {tasks.length === 0 && !addingTask && (
              <p className="text-sm text-text-secondary text-center py-6">Nenhuma tarefa registrada.</p>
            )}

            {pendingTasks.length > 0 && (
              <div className="space-y-1.5">
                {pendingTasks.map((task) => {
                  const statusPending = pendingActions.has(`task:status:${task.id}`);
                  const deletePending = pendingActions.has(`task:delete:${task.id}`);
                  return (
                  <div key={task.id} className="flex items-start gap-3 p-3 border border-border-neutral rounded-lg bg-white">
                    <button
                      onClick={() => handleToggleTaskStatus(task)}
                      disabled={statusPending || deletePending}
                      aria-busy={statusPending || undefined}
                      aria-label={statusPending ? "Atualizando tarefa..." : "Marcar tarefa como concluída"}
                      className="mt-0.5 w-4 h-4 border-2 border-gray-300 rounded hover:border-brand-blue transition-colors shrink-0 inline-flex items-center justify-center disabled:opacity-50"
                    >
                      {statusPending && <Loader2 className="w-2.5 h-2.5 animate-spin" aria-hidden="true" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_COLOR[task.priority]}`}>{PRIORITY_LABEL[task.priority]}</span>
                        <span className="text-xs text-text-secondary">{STATUS_LABEL[task.status]}</span>
                        {task.dueDate && (
                          <span className="text-xs text-text-secondary">Vence: {format(new Date(task.dueDate), "dd/MM/yyyy", { locale: ptBR })}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      disabled={deletePending || statusPending}
                      aria-busy={deletePending || undefined}
                      aria-label={deletePending ? "Removendo tarefa..." : "Remover tarefa"}
                      className="p-1 text-text-secondary hover:text-danger transition-colors shrink-0 disabled:opacity-50"
                    >
                      {deletePending
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                        : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  );
                })}
              </div>
            )}

            {doneTasks.length > 0 && (
              <details className="group">
                <summary className="text-xs font-medium text-text-secondary cursor-pointer select-none hover:text-text-primary transition-colors">
                  {doneTasks.length} concluídas/canceladas
                </summary>
                <div className="space-y-1.5 mt-2">
                  {doneTasks.map((task) => {
                    const statusPending = pendingActions.has(`task:status:${task.id}`);
                    const deletePending = pendingActions.has(`task:delete:${task.id}`);
                    return (
                    <div key={task.id} className="flex items-start gap-3 p-3 border border-border-neutral rounded-lg bg-gray-50 opacity-60">
                      <button
                        onClick={() => handleToggleTaskStatus(task)}
                        disabled={statusPending || deletePending}
                        aria-busy={statusPending || undefined}
                        aria-label={statusPending ? "Atualizando tarefa..." : "Reabrir tarefa"}
                        className="mt-0.5 w-4 h-4 bg-green-500 border-2 border-green-500 rounded flex items-center justify-center shrink-0 disabled:opacity-50"
                      >
                        {statusPending
                          ? <Loader2 className="w-2.5 h-2.5 text-white animate-spin" aria-hidden="true" />
                          : <Check className="w-2.5 h-2.5 text-white" />}
                      </button>
                      <p className="text-sm text-text-secondary line-through flex-1">{task.title}</p>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        disabled={deletePending || statusPending}
                        aria-busy={deletePending || undefined}
                        aria-label={deletePending ? "Removendo tarefa..." : "Remover tarefa"}
                        className="p-1 text-text-secondary hover:text-danger transition-colors shrink-0 disabled:opacity-50"
                      >
                        {deletePending
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                          : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    );
                  })}
                </div>
              </details>
            )}
          </div>
        )}

        {/* ─── Tags Tab ───────────────────────────────────────────────────────── */}
        {activeTab === "tags" && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-text-primary">Tags do paciente</h3>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newTagLabel}
                onChange={(e) => setNewTagLabel(e.target.value)}
                placeholder="Ex: Diabético, Vegano..."
                className="flex-1 text-sm border border-border-neutral rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
              />
              <input
                type="color"
                value={newTagColor}
                onChange={(e) => setNewTagColor(e.target.value)}
                className="w-9 h-9 rounded-lg border border-border-neutral cursor-pointer"
                title="Cor da tag"
              />
              <AsyncButton
                onClick={handleAddTag}
                disabled={!newTagLabel.trim()}
                pending={pendingActions.has("tag:add")}
                pendingLabel={null}
                aria-label={pendingActions.has("tag:add") ? "Adicionando tag..." : "Adicionar tag"}
                className="px-3 py-1.5 bg-brand-blue text-white text-sm font-medium rounded-lg disabled:opacity-50 hover:bg-brand-blue-hover transition-colors"
              >
                <Plus className="w-4 h-4" />
              </AsyncButton>
            </div>

            {tags.length === 0 && (
              <p className="text-sm text-text-secondary text-center py-6">Nenhuma tag registrada.</p>
            )}

            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const deletePending = pendingActions.has(`tag:delete:${tag.id}`);
                return (
                <div key={tag.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium" style={{ backgroundColor: tag.color + "22", color: tag.color }}>
                  {tag.label}
                  <button
                    onClick={() => handleDeleteTag(tag.id)}
                    disabled={deletePending}
                    aria-busy={deletePending || undefined}
                    aria-label={deletePending ? `Removendo tag ${tag.label}...` : `Remover tag ${tag.label}`}
                    className="hover:opacity-70 transition-opacity ml-1 disabled:opacity-50"
                  >
                    {deletePending
                      ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                      : <Trash2 className="w-3 h-3" />}
                  </button>
                </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
