export type GoalPlan = { id: string; name: string; targetAmountCents: number; currentAmountCents: number; targetDate: string | null; monthlyContributionCents: number | null; status: string; contributionFrequency?: string; paidAmountCents?: number; recurrence?: string };
export function goalContributionPlan(goal: GoalPlan, today: string) {
  const remainingCents = Math.max(0, goal.targetAmountCents - (goal.paidAmountCents ?? 0) - goal.currentAmountCents);
  const [year, month] = today.split("-").map(Number), due = goal.targetDate?.split("-").map(Number);
  const months = due ? Math.max(1, (due[0] - year) * 12 + due[1] - month + 1) : null;
  const suggestedCents = months ? Math.ceil(remainingCents / months) : null;
  const chosenCents = Math.min(remainingCents, goal.monthlyContributionCents ?? suggestedCents ?? 0);
  return { remainingCents, months, suggestedCents, chosenCents, progressBasisPoints: goal.targetAmountCents > 0 ? Math.min(10000, Math.round((goal.currentAmountCents + (goal.paidAmountCents ?? 0)) * 10000 / goal.targetAmountCents)) : 0,
    atRisk: remainingCents > 0 && Boolean(goal.targetDate && goal.targetDate < today || suggestedCents !== null && chosenCents < suggestedCents) };
}
