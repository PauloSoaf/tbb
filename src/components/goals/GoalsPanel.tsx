"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Target, Plus, Check, Trash2, Bell, BellOff, TrendingUp, Loader2 } from "lucide-react";
import {
  createPatientGoalAction, updateGoalStatusAction, addGoalCheckInAction, deletePatientGoalAction,
  createPatientReminderAction, toggleReminderAction, deletePatientReminderAction,
} from "@/actions/goals.action";
import type { GoalType, GoalStatus, ReminderFrequency } from "@prisma/client";
import { AsyncButton } from "@/components/ui/AsyncButton";

type CheckIn = { id: string; value: number | null; note: string | null; checkedAt: Date };
type Goal = {
  id: string;
  type: GoalType;
  title: string;
  description: string | null;
  targetValue: number | null;
  targetUnit: string | null;
  initialValue: number | null;
  currentValue: number | null;
  status: GoalStatus;
  targetDate: Date | null;
  achievedAt: Date | null;
  createdAt: Date;
  checkIns: CheckIn[];
};
type Reminder = {
  id: string;
  title: string;
  body: string | null;
  frequency: ReminderFrequency;
  nextSendAt: Date;
  isActive: boolean;
  sentCount: number;
};

interface Props {
  tenantSlug: string;
  patientId: string;
  initialGoals: Goal[];
  initialReminders: Reminder[];
}

const GOAL_TYPE_LABEL: Record<GoalType, string> = {
  WEIGHT_LOSS: "Perda de peso",
  WEIGHT_GAIN: "Ganho de peso",
  MAINTAIN_WEIGHT: "Manutenção de peso",
  REDUCE_BODY_FAT: "Reduzir gordura corporal",
  INCREASE_LEAN_MASS: "Aumentar massa magra",
  IMPROVE_EATING_HABITS: "Melhorar hábitos alimentares",
  CUSTOM: "Personalizado",
};

const FREQ_LABEL: Record<ReminderFrequency, string> = {
  DAILY: "Diário",
  WEEKLY: "Semanal",
  BIWEEKLY: "Quinzenal",
  MONTHLY: "Mensal",
};

const STATUS_COLOR: Record<GoalStatus, string> = {
  ACTIVE: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  ACHIEVED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  ABANDONED: "bg-gray-100 text-gray-600 dark:bg-card-bg dark:text-slate-400",
};

export function GoalsPanel({ tenantSlug, patientId, initialGoals, initialReminders }: Props) {
  const [activeTab, setActiveTab] = useState<"goals" | "reminders">("goals");
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [reminders, setReminders] = useState<Reminder[]>(initialReminders);
  const [pendingActions, setPendingActions] = useState<Set<string>>(() => new Set());

  // Goal form
  const [addingGoal, setAddingGoal] = useState(false);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalType, setGoalType] = useState<GoalType>("CUSTOM");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalUnit, setGoalUnit] = useState("kg");

  // Reminder form
  const [addingReminder, setAddingReminder] = useState(false);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderBody, setReminderBody] = useState("");
  const [reminderFreq, setReminderFreq] = useState<ReminderFrequency>("WEEKLY");

  // Check-in state
  const [checkInGoalId, setCheckInGoalId] = useState<string | null>(null);
  const [checkInValue, setCheckInValue] = useState("");

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
    if (!goalTitle.trim()) return;
    await runPendingAction("goal:add", async () => {
      const res = await createPatientGoalAction(tenantSlug, patientId, {
        type: goalType,
        title: goalTitle,
        targetValue: goalTarget ? parseFloat(goalTarget) : undefined,
        targetUnit: goalUnit || undefined,
      });
      if (res.goal) {
        setGoals((prev) => [res.goal!, ...prev]);
        setGoalTitle(""); setGoalTarget(""); setAddingGoal(false);
        toast.success("Meta criada!");
      } else toast.error(res.error ?? "Erro ao criar meta.");
    });
  };

  const handleGoalStatus = async (goal: Goal, status: GoalStatus) => {
    await runPendingAction(`goal:status:${goal.id}`, async () => {
      const res = await updateGoalStatusAction(tenantSlug, goal.id, status, patientId);
      if (res.goal) setGoals((prev) => prev.map((g) => g.id === goal.id ? { ...g, status, achievedAt: res.goal!.achievedAt } : g));
      else toast.error(res.error ?? "Erro.");
    });
  };

  const handleCheckIn = async (goalId: string) => {
    if (!checkInValue) return;
    await runPendingAction(`goal:check-in:${goalId}`, async () => {
      const res = await addGoalCheckInAction(tenantSlug, goalId, parseFloat(checkInValue));
      if (res.checkIn) {
        setGoals((prev) => prev.map((g) => g.id === goalId
          ? { ...g, currentValue: parseFloat(checkInValue), checkIns: [res.checkIn!, ...g.checkIns] }
          : g));
        setCheckInGoalId(null); setCheckInValue("");
        toast.success("Check-in registrado!");
      } else toast.error(res.error ?? "Erro.");
    });
  };

  const handleDeleteGoal = async (goalId: string) => {
    await runPendingAction(`goal:delete:${goalId}`, async () => {
      const res = await deletePatientGoalAction(tenantSlug, goalId, patientId);
      if (res.success) { setGoals((prev) => prev.filter((g) => g.id !== goalId)); toast.success("Meta removida."); }
      else toast.error(res.error ?? "Erro.");
    });
  };

  const handleAddReminder = async () => {
    if (!reminderTitle.trim()) return;
    await runPendingAction("reminder:add", async () => {
      const res = await createPatientReminderAction(tenantSlug, patientId, {
        title: reminderTitle,
        body: reminderBody || undefined,
        frequency: reminderFreq,
      });
      if (res.reminder) {
        setReminders((prev) => [...prev, res.reminder!]);
        setReminderTitle(""); setReminderBody(""); setAddingReminder(false);
        toast.success("Lembrete criado!");
      } else toast.error(res.error ?? "Erro ao criar lembrete.");
    });
  };

  const handleToggleReminder = async (id: string) => {
    await runPendingAction(`reminder:toggle:${id}`, async () => {
      const res = await toggleReminderAction(tenantSlug, id);
      if (res.reminder) setReminders((prev) => prev.map((r) => r.id === id ? { ...r, isActive: !r.isActive } : r));
    });
  };

  const handleDeleteReminder = async (id: string) => {
    await runPendingAction(`reminder:delete:${id}`, async () => {
      const res = await deletePatientReminderAction(tenantSlug, id, patientId);
      if (res.success) { setReminders((prev) => prev.filter((r) => r.id !== id)); toast.success("Lembrete removido."); }
      else toast.error(res.error ?? "Erro.");
    });
  };

  const activeGoals = goals.filter((g) => g.status === "ACTIVE");
  const doneGoals = goals.filter((g) => g.status !== "ACTIVE");

  return (
    <div className="bg-card-bg rounded-xl border border-border-neutral">
      <div className="flex items-center gap-1 p-4 border-b border-border-neutral">
        {[
          { id: "goals" as const, label: "Metas", icon: Target, count: activeGoals.length },
          { id: "reminders" as const, label: "Lembretes", icon: Bell, count: reminders.filter((r) => r.isActive).length },
        ].map(({ id, label, icon: Icon, count }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === id ? "bg-brand-blue text-white" : "text-text-secondary hover:bg-warm-beige hover:bg-warm-beige"}`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {count > 0 && <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === id ? "bg-white/20" : "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300"}`}>{count}</span>}
          </button>
        ))}
      </div>

      <div className="p-4">
        {activeTab === "goals" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary dark:text-slate-200">Metas clínicas</h3>
              <button onClick={() => setAddingGoal(!addingGoal)} className="flex items-center gap-1.5 text-xs font-medium text-brand-blue hover:text-brand-blue-hover">
                <Plus className="w-4 h-4" /> Nova meta
              </button>
            </div>

            {addingGoal && (
              <div className="border border-border-neutral rounded-lg p-3 space-y-2 bg-card-bg">
                <select value={goalType} onChange={(e) => setGoalType(e.target.value as GoalType)}
                  className="w-full text-sm border border-border-neutral rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 bg-card-bg text-text-primary dark:text-slate-200"
                >
                  {(Object.keys(GOAL_TYPE_LABEL) as GoalType[]).map((t) => (
                    <option key={t} value={t}>{GOAL_TYPE_LABEL[t]}</option>
                  ))}
                </select>
                <input type="text" value={goalTitle} onChange={(e) => setGoalTitle(e.target.value)} placeholder="Título da meta *"
                  className="w-full text-sm border border-border-neutral rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 bg-card-bg text-text-primary dark:text-slate-200"
                />
                <div className="flex gap-2">
                  <input type="number" value={goalTarget} onChange={(e) => setGoalTarget(e.target.value)} placeholder="Valor alvo"
                    className="flex-1 text-sm border border-border-neutral rounded px-2 py-1.5 focus:outline-none bg-card-bg text-text-primary dark:text-slate-200"
                  />
                  <input type="text" value={goalUnit} onChange={(e) => setGoalUnit(e.target.value)} placeholder="Unidade"
                    className="w-20 text-sm border border-border-neutral rounded px-2 py-1.5 focus:outline-none bg-card-bg text-text-primary dark:text-slate-200"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setAddingGoal(false)} className="text-xs px-3 py-1.5 border border-border-neutral rounded-lg text-text-secondary">Cancelar</button>
                  <AsyncButton
                    onClick={handleAddGoal}
                    disabled={!goalTitle.trim()}
                    pending={pendingActions.has("goal:add")}
                    pendingLabel="Salvando..."
                    className="text-xs px-3 py-1.5 bg-brand-blue text-white rounded-lg disabled:opacity-50"
                  >
                    Salvar
                  </AsyncButton>
                </div>
              </div>
            )}

            {goals.length === 0 && !addingGoal && (
              <p className="text-sm text-text-secondary text-center py-6">Nenhuma meta definida.</p>
            )}

            <div className="space-y-2">
              {activeGoals.map((goal) => {
                const statusPending = pendingActions.has(`goal:status:${goal.id}`);
                const deletePending = pendingActions.has(`goal:delete:${goal.id}`);
                return (
                <div key={goal.id} className="border border-border-neutral rounded-lg p-3 bg-card-bg">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[goal.status]}`}>{goal.status === "ACTIVE" ? "Ativa" : goal.status === "ACHIEVED" ? "Alcançada" : "Abandonada"}</span>
                        <p className="text-sm font-medium text-text-primary dark:text-slate-200 truncate">{goal.title}</p>
                      </div>
                      {goal.targetValue && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-blue rounded-full" style={{ width: `${Math.min(((goal.currentValue ?? goal.initialValue ?? 0) / goal.targetValue) * 100, 100)}%` }} />
                          </div>
                          <span className="text-xs text-text-secondary whitespace-nowrap">
                            {goal.currentValue ?? goal.initialValue ?? 0} / {goal.targetValue} {goal.targetUnit}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => setCheckInGoalId(checkInGoalId === goal.id ? null : goal.id)} className="p-1 text-text-secondary hover:text-brand-blue transition-colors" title="Check-in">
                        <TrendingUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleGoalStatus(goal, "ACHIEVED")}
                        disabled={statusPending || deletePending}
                        aria-busy={statusPending || undefined}
                        className="p-1 text-text-secondary hover:text-green-600 transition-colors disabled:opacity-50"
                        title="Marcar como alcançada"
                      >
                        {statusPending
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                          : <Check className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleDeleteGoal(goal.id)}
                        disabled={deletePending || statusPending}
                        aria-busy={deletePending || undefined}
                        className="p-1 text-text-secondary hover:text-danger transition-colors disabled:opacity-50"
                        aria-label={deletePending ? "Removendo meta..." : "Remover meta"}
                      >
                        {deletePending
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                          : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  {checkInGoalId === goal.id && (
                    <div className="mt-2 flex gap-2">
                      <input type="number" step="0.1" value={checkInValue} onChange={(e) => setCheckInValue(e.target.value)}
                        placeholder={`Valor atual ${goal.targetUnit ? `(${goal.targetUnit})` : ""}`}
                        className="flex-1 text-sm border border-border-neutral rounded px-2 py-1.5 focus:outline-none bg-card-bg text-text-primary dark:text-slate-200"
                      />
                      <AsyncButton
                        onClick={() => handleCheckIn(goal.id)}
                        disabled={!checkInValue}
                        pending={pendingActions.has(`goal:check-in:${goal.id}`)}
                        pendingLabel={null}
                        aria-label={pendingActions.has(`goal:check-in:${goal.id}`) ? "Registrando check-in..." : "Registrar check-in"}
                        className="text-xs px-3 py-1.5 bg-brand-blue text-white rounded-lg disabled:opacity-50"
                      >
                        OK
                      </AsyncButton>
                    </div>
                  )}
                </div>
                );
              })}
            </div>

            {doneGoals.length > 0 && (
              <details>
                <summary className="text-xs font-medium text-text-secondary cursor-pointer select-none hover:text-text-primary">{doneGoals.length} finalizadas</summary>
                <div className="space-y-1 mt-2">
                  {doneGoals.map((goal) => {
                    const deletePending = pendingActions.has(`goal:delete:${goal.id}`);
                    return (
                    <div key={goal.id} className="flex items-center justify-between p-2 border border-border-neutral rounded-lg bg-gray-50 dark:bg-card-bg opacity-60">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[goal.status]}`}>{goal.status === "ACHIEVED" ? "Alcançada" : "Abandonada"}</span>
                        <p className="text-sm text-text-secondary line-through">{goal.title}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteGoal(goal.id)}
                        disabled={deletePending}
                        aria-busy={deletePending || undefined}
                        className="p-1 text-text-secondary hover:text-danger disabled:opacity-50"
                        aria-label={deletePending ? "Removendo meta..." : "Remover meta"}
                      >
                        {deletePending
                          ? <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                          : <Trash2 className="w-3 h-3" />}
                      </button>
                    </div>
                    );
                  })}
                </div>
              </details>
            )}
          </div>
        )}

        {activeTab === "reminders" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary dark:text-slate-200">Lembretes</h3>
              <button onClick={() => setAddingReminder(!addingReminder)} className="flex items-center gap-1.5 text-xs font-medium text-brand-blue hover:text-brand-blue-hover">
                <Plus className="w-4 h-4" /> Novo lembrete
              </button>
            </div>

            {addingReminder && (
              <div className="border border-border-neutral rounded-lg p-3 space-y-2 bg-card-bg">
                <input type="text" value={reminderTitle} onChange={(e) => setReminderTitle(e.target.value)} placeholder="Título *"
                  className="w-full text-sm border border-border-neutral rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 bg-card-bg text-text-primary dark:text-slate-200"
                />
                <textarea value={reminderBody} onChange={(e) => setReminderBody(e.target.value)} placeholder="Mensagem (opcional)" rows={2}
                  className="w-full text-sm border border-border-neutral rounded px-2 py-1.5 focus:outline-none resize-none bg-card-bg text-text-primary dark:text-slate-200"
                />
                <select value={reminderFreq} onChange={(e) => setReminderFreq(e.target.value as ReminderFrequency)}
                  className="w-full text-sm border border-border-neutral rounded px-2 py-1.5 focus:outline-none bg-card-bg text-text-primary dark:text-slate-200"
                >
                  {(Object.keys(FREQ_LABEL) as ReminderFrequency[]).map((f) => (
                    <option key={f} value={f}>{FREQ_LABEL[f]}</option>
                  ))}
                </select>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setAddingReminder(false)} className="text-xs px-3 py-1.5 border border-border-neutral rounded-lg text-text-secondary">Cancelar</button>
                  <AsyncButton
                    onClick={handleAddReminder}
                    disabled={!reminderTitle.trim()}
                    pending={pendingActions.has("reminder:add")}
                    pendingLabel="Salvando..."
                    className="text-xs px-3 py-1.5 bg-brand-blue text-white rounded-lg disabled:opacity-50"
                  >
                    Salvar
                  </AsyncButton>
                </div>
              </div>
            )}

            {reminders.length === 0 && !addingReminder && (
              <p className="text-sm text-text-secondary text-center py-6">Nenhum lembrete configurado.</p>
            )}

            <div className="space-y-2">
              {reminders.map((rem) => {
                const togglePending = pendingActions.has(`reminder:toggle:${rem.id}`);
                const deletePending = pendingActions.has(`reminder:delete:${rem.id}`);
                return (
                <div key={rem.id} className={`border rounded-lg p-3 flex items-start justify-between gap-2 ${rem.isActive ? "border-border-neutral bg-card-bg" : "border-border-neutral bg-gray-50 dark:bg-card-bg opacity-60"}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary dark:text-slate-200">{rem.title}</p>
                    {rem.body && <p className="text-xs text-text-secondary mt-0.5">{rem.body}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-text-secondary">{FREQ_LABEL[rem.frequency]}</span>
                      <span className="text-xs text-text-secondary">·</span>
                      <span className="text-xs text-text-secondary">
                        Próximo: {format(new Date(rem.nextSendAt), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleToggleReminder(rem.id)}
                      disabled={togglePending || deletePending}
                      aria-busy={togglePending || undefined}
                      className="p-1 text-text-secondary hover:text-brand-blue transition-colors disabled:opacity-50"
                      title={rem.isActive ? "Desativar" : "Ativar"}
                    >
                      {togglePending
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                        : rem.isActive
                          ? <Bell className="w-3.5 h-3.5" />
                          : <BellOff className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleDeleteReminder(rem.id)}
                      disabled={deletePending || togglePending}
                      aria-busy={deletePending || undefined}
                      className="p-1 text-text-secondary hover:text-danger transition-colors disabled:opacity-50"
                      aria-label={deletePending ? "Removendo lembrete..." : "Remover lembrete"}
                    >
                      {deletePending
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                        : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
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
