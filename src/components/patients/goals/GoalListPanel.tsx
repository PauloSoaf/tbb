"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Target, CheckCircle2, Circle, Loader2, Plus, Trash2 } from "lucide-react";
import { createPatientGoalAction, updateGoalStatusAction, deletePatientGoalAction } from "@/actions/goals.action";
import type { PatientGoal, GoalStatus, GoalType } from "@prisma/client";
import { AsyncButton } from "@/components/ui/AsyncButton";

interface GoalListPanelProps {
  tenantSlug: string;
  patientId: string;
  initialGoals: PatientGoal[];
}

const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  WEIGHT_LOSS: "Perda de Peso",
  WEIGHT_GAIN: "Ganho de Peso",
  MAINTAIN_WEIGHT: "Manter Peso",
  REDUCE_BODY_FAT: "Reduzir Gordura",
  INCREASE_LEAN_MASS: "Aumentar Massa Magra",
  IMPROVE_EATING_HABITS: "Melhorar Hábitos",
  CUSTOM: "Personalizado"
};

export function GoalListPanel({ tenantSlug, patientId, initialGoals }: GoalListPanelProps) {
  const [goals, setGoals] = useState<PatientGoal[]>(initialGoals);
  const [pendingActions, setPendingActions] = useState<Set<string>>(() => new Set());
  const [addingGoal, setAddingGoal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<GoalType>("CUSTOM");

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

  const handleAddGoal = async () => {
    if (!newTitle.trim()) return;
    await runPendingAction("add", async () => {
      const res = await createPatientGoalAction(tenantSlug, patientId, {
        title: newTitle,
        type: newType,
      });
      if (res.goal) {
        setGoals(prev => [res.goal as PatientGoal, ...prev]);
        setNewTitle("");
        setAddingGoal(false);
        toast.success("Meta adicionada com sucesso!");
      } else {
        toast.error(res.error || "Erro ao adicionar meta");
      }
    });
  };

  const handleToggleStatus = async (goalId: string, currentStatus: GoalStatus) => {
    const newStatus: GoalStatus = currentStatus === "ACHIEVED" ? "ACTIVE" : "ACHIEVED";
    await runPendingAction(`status:${goalId}`, async () => {
      setGoals(prev => prev.map(g => g.id === goalId ? { ...g, status: newStatus } : g));
      const res = await updateGoalStatusAction(tenantSlug, goalId, newStatus, patientId);
      if (res.error) {
        toast.error(res.error);
        setGoals(prev => prev.map(g => g.id === goalId ? { ...g, status: currentStatus } : g)); // rollback
      }
    });
  };

  const handleDelete = async (goalId: string) => {
    await runPendingAction(`delete:${goalId}`, async () => {
      const res = await deletePatientGoalAction(tenantSlug, goalId, patientId);
      if (res.error) {
        toast.error(res.error);
      } else {
        setGoals(prev => prev.filter(g => g.id !== goalId));
        toast.success("Meta removida");
      }
    });
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-border-neutral">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-text-primary flex items-center gap-2">
          <Target className="w-5 h-5 text-indigo-500" />
          Metas do Paciente
        </h3>
        <button 
          onClick={() => setAddingGoal(!addingGoal)}
          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium p-1 rounded hover:bg-indigo-50"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {addingGoal && (
        <div className="mb-4 bg-surface-warm p-3 rounded-2xl space-y-3">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Ex: Beber 2L de água por dia"
            className="w-full text-sm p-2 rounded-xl border-border-neutral focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            disabled={pendingActions.has("add")}
            onKeyDown={(e) => e.key === "Enter" && handleAddGoal()}
          />
          <div className="flex gap-2">
            <select 
              value={newType} 
              onChange={(e) => setNewType(e.target.value as GoalType)}
              className="text-sm rounded-xl border-border-neutral"
              disabled={pendingActions.has("add")}
            >
              {Object.entries(GOAL_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <AsyncButton
              onClick={handleAddGoal} 
              disabled={!newTitle.trim()}
              pending={pendingActions.has("add")}
              pendingLabel="Salvando..."
              className="flex-1 bg-indigo-600 text-white text-sm font-medium py-2 rounded-xl disabled:opacity-50 hover:bg-indigo-700 transition-colors"
            >
              Salvar
            </AsyncButton>
          </div>
        </div>
      )}

      {goals.length === 0 ? (
        <p className="text-sm text-text-secondary text-center py-4">Nenhuma meta cadastrada.</p>
      ) : (
        <ul className="space-y-3 group">
          {goals.map(goal => {
            const statusPending = pendingActions.has(`status:${goal.id}`);
            const deletePending = pendingActions.has(`delete:${goal.id}`);
            return (
            <li key={goal.id} className={`flex items-start gap-3 p-3 rounded-2xl border transition-all ${goal.status === "ACHIEVED" ? "bg-emerald-50 border-emerald-100" : "bg-white border-border-neutral hover:border-indigo-200"}`}>
              <button 
                onClick={() => handleToggleStatus(goal.id, goal.status)}
                className="mt-0.5 text-text-secondary hover:text-indigo-600 transition-colors"
                disabled={statusPending || deletePending}
                aria-busy={statusPending || undefined}
              >
                {statusPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                ) : goal.status === "ACHIEVED" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Circle className="w-5 h-5" />
                )}
              </button>
              <div className="flex-1">
                <p className={`text-sm font-medium ${goal.status === "ACHIEVED" ? "text-emerald-800 line-through" : "text-text-primary"}`}>
                  {goal.title}
                </p>
                <span className="text-xs text-text-tertiary bg-surface-warm px-2 py-0.5 rounded-full mt-1 inline-block">
                  {GOAL_TYPE_LABELS[goal.type]}
                </span>
              </div>
              <button 
                onClick={() => handleDelete(goal.id)}
                className="text-text-tertiary hover:text-red-500 opacity-0 md:opacity-100 transition-opacity"
                disabled={deletePending || statusPending}
                aria-busy={deletePending || undefined}
                title="Remover meta"
              >
                {deletePending
                  ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  : <Trash2 className="w-4 h-4" />}
              </button>
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
