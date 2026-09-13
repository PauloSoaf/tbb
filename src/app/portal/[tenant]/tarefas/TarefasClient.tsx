"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2, Circle, Clock, AlertTriangle, Loader2 } from "lucide-react";
import { completePatientTaskAction, reopenPatientTaskAction } from "@/actions/patient-portal.action";
import { format, isPast } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import type { PatientTaskStatus, PatientTaskPriority } from "@prisma/client";
import { useI18n } from "@/lib/i18n/I18nContext";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: PatientTaskStatus;
  priority: PatientTaskPriority;
  dueDate: Date | string | null;
  completedAt: Date | string | null;
};

const PRIORITY_COLOR: Record<PatientTaskPriority, string> = {
  LOW: "text-gray-400",
  MEDIUM: "text-amber-500",
  HIGH: "text-red-500",
};

interface Props {
  tenantSlug: string;
  initialTasks: Task[];
}

export function TarefasClient({ tenantSlug, initialTasks }: Props) {
  const { t, locale } = useI18n();
  const dateLocale = locale === "en" ? enUS : locale === "es" ? es : ptBR;

  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [isPending, startTransition] = useTransition();
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);

  const toggle = (task: Task) => {
    const isDone = task.status === "DONE";
    setPendingTaskId(task.id);
    startTransition(async () => {
      setTasks((prev) => prev.map((t) =>
        t.id === task.id ? { ...t, status: isDone ? "PENDING" : "DONE" } : t
      ));
      const res = isDone
        ? await reopenPatientTaskAction(tenantSlug, task.id)
        : await completePatientTaskAction(tenantSlug, task.id);
      if (!res.success) {
        toast.error(res.error);
        setTasks((prev) => prev.map((t) => t.id === task.id ? task : t));
      } else if (!isDone) {
        toast.success(t("patient_portal.tasks.success", { defaultValue: "Tarefa concluída! 🎉" }));
      }
      setPendingTaskId(null);
    });
  };

  const pending = tasks.filter((task) => task.status !== "DONE");
  const done = tasks.filter((task) => task.status === "DONE");

  return (
    <div className="space-y-6">
      {tasks.length === 0 && (
        <p className="text-center text-text-secondary py-12 text-sm">
          Nenhuma tarefa atribuída pelo seu nutricionista.
        </p>
      )}

      {pending.length > 0 && (
        <div className="space-y-3">
          {pending.map((task) => {
            const overdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== "DONE";
            return (
              <div
                key={task.id}
                className={`bg-white border rounded-xl p-4 ${overdue ? "border-red-200" : "border-border-neutral"}`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggle(task)}
                    disabled={isPending}
                    className="mt-0.5 text-text-secondary hover:text-brand-blue transition-colors shrink-0"
                  >
                    {pendingTaskId === task.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <Circle className="w-5 h-5" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-text-primary">{task.title}</p>
                      <AlertTriangle className={`w-3 h-3 shrink-0 ${PRIORITY_COLOR[task.priority]}`} />
                    </div>
                    {task.description && (
                      <p className="text-sm text-text-secondary mt-0.5">{task.description}</p>
                    )}
                    {task.dueDate && (
                      <p className={`text-xs mt-1 flex items-center gap-1 ${overdue ? "text-red-500 font-medium" : "text-text-secondary"}`}>
                        <Clock className="w-3 h-3" />
                        {overdue ? "Vencida em " : "Prazo: "}
                        {format(new Date(task.dueDate), "dd/MM/yyyy", { locale: dateLocale })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {done.length > 0 && (
        <details>
          <summary className="text-sm font-medium text-text-secondary cursor-pointer select-none">
            {done.length} tarefa(s) concluída(s)
          </summary>
          <div className="space-y-2 mt-2">
            {done.map((task) => (
              <div key={task.id} className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-start gap-3 opacity-75">
                <button
                  onClick={() => toggle(task)}
                  disabled={isPending}
                  className="mt-0.5 text-green-500 hover:text-text-secondary transition-colors shrink-0"
                >
                  {pendingTaskId === task.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                </button>
                <div>
                  <p className="font-medium text-green-800 line-through">{task.title}</p>
                  {task.description && (
                    <p className="text-xs text-green-600 mt-0.5">{task.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
