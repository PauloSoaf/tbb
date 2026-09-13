"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2, Circle, Bell, Loader2 } from "lucide-react";
import { updateGoalStatusAction } from "@/actions/goals.action";
import type { GoalType, ReminderFrequency } from "@prisma/client";
import { format } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { useI18n } from "@/lib/i18n/I18nContext";

type Goal = {
  id: string;
  title: string;
  type: GoalType;
  status: "ACTIVE" | "ACHIEVED" | "ABANDONED";
  targetValue: number | null;
  currentValue: number | null;
  targetUnit: string | null;
};

type Reminder = {
  id: string;
  title: string;
  body: string | null;
  frequency: ReminderFrequency;
  nextSendAt: Date | string;
};

const GOAL_TYPE_LABEL: Record<GoalType, string> = {
  WEIGHT_LOSS: "Perda de peso",
  WEIGHT_GAIN: "Ganho de peso",
  MAINTAIN_WEIGHT: "Manutenção de peso",
  REDUCE_BODY_FAT: "Reduzir gordura",
  INCREASE_LEAN_MASS: "Aumentar massa magra",
  IMPROVE_EATING_HABITS: "Melhorar hábitos",
  CUSTOM: "Personalizado",
};

const FREQUENCY_LABEL: Record<ReminderFrequency, string> = {
  DAILY: "Diário",
  WEEKLY: "Semanal",
  BIWEEKLY: "Quinzenal",
  MONTHLY: "Mensal",
};

interface Props {
  tenantSlug: string;
  patientId: string;
  initialGoals: Goal[];
  initialReminders: Reminder[];
}

export function MetasClient({ tenantSlug, patientId, initialGoals, initialReminders }: Props) {
  const { t, locale } = useI18n();
  const dateLocale = locale === "en" ? enUS : locale === "es" ? es : ptBR;

  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [isPending, startTransition] = useTransition();
  const [pendingGoalId, setPendingGoalId] = useState<string | null>(null);

  const toggle = (goal: Goal) => {
    const next = goal.status === "ACHIEVED" ? "ACTIVE" : "ACHIEVED";
    setPendingGoalId(goal.id);
    startTransition(async () => {
      setGoals((prev) => prev.map((g) => g.id === goal.id ? { ...g, status: next } : g));
      const res = await updateGoalStatusAction(tenantSlug, goal.id, next, patientId);
      if (res.error) {
        toast.error(res.error);
        setGoals((prev) => prev.map((g) => g.id === goal.id ? { ...g, status: goal.status } : g));
      } else if (next === "ACHIEVED") {
        toast.success(t("patient_portal.goals.achieved_success", { defaultValue: "Meta alcançada! Parabéns!" }));
      }
      setPendingGoalId(null);
    });
  };

  const active = goals.filter((g) => g.status === "ACTIVE");
  const achieved = goals.filter((g) => g.status === "ACHIEVED");

  return (
    <div className="space-y-8">
      {/* Goals section */}
      <section>
        <h2 className="text-base font-semibold text-text-primary mb-3">{t("patient_portal.goals.my_goals", { defaultValue: "Minhas Metas" })}</h2>

        {goals.length === 0 && (
          <p className="text-center text-text-secondary py-8 text-sm">{t("patient_portal.goals.no_goals", { defaultValue: "Nenhuma meta definida pelo seu nutricionista." })}</p>
        )}

        {active.length > 0 && (
          <div className="space-y-3">
            {active.map((g) => (
              <div key={g.id} className="bg-white border border-border-neutral rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <button onClick={() => toggle(g)} disabled={isPending} className="mt-0.5 text-text-secondary hover:text-brand-blue transition-colors">
                    {pendingGoalId === g.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <Circle className="w-5 h-5" />}
                  </button>
                  <div className="flex-1">
                    <p className="font-medium text-text-primary">{g.title}</p>
                    <p className="text-xs text-text-secondary mt-0.5">{GOAL_TYPE_LABEL[g.type]}</p>
                    {g.targetValue != null && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-blue rounded-full" style={{ width: `${Math.min(((g.currentValue ?? 0) / g.targetValue) * 100, 100)}%` }} />
                        </div>
                        <span className="text-xs text-text-secondary">{g.currentValue ?? 0} / {g.targetValue} {g.targetUnit}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {achieved.length > 0 && (
          <details className="mt-2">
            <summary className="text-sm font-medium text-text-secondary cursor-pointer select-none">{t("patient_portal.goals.achieved_count", { count: achieved.length.toString(), defaultValue: `${achieved.length} meta(s) alcançada(s)` })}</summary>
            <div className="space-y-2 mt-2">
              {achieved.map((g) => (
                <div key={g.id} className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-start gap-3 opacity-70">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-green-800 line-through">{g.title}</p>
                    <p className="text-xs text-green-600">{GOAL_TYPE_LABEL[g.type]}</p>
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
      </section>

      {/* Reminders section */}
      {initialReminders.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-500" />
            {t("patient_portal.goals.reminders_title", { defaultValue: "Lembretes do Nutricionista" })}
          </h2>
          <div className="space-y-3">
            {initialReminders.map((r) => (
              <div key={r.id} className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-medium text-amber-900">{r.title}</p>
                    {r.body && <p className="text-sm text-amber-800 mt-0.5">{r.body}</p>}
                  </div>
                  <span className="text-xs text-amber-600 shrink-0 font-medium">{FREQUENCY_LABEL[r.frequency]}</span>
                </div>
                <p className="text-xs text-amber-600 mt-2">
                  {t("patient_portal.goals.next_reminder", { defaultValue: "Próximo" })}: {format(new Date(r.nextSendAt), `dd/MM '${t("patient_portal.goals.at", { defaultValue: "às" })}' HH:mm`, { locale: dateLocale })}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
