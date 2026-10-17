import { centsText, emptyBudget, emptyForm } from "../loan-comparison";
import { monthKeys } from "../salary-plan";
import { projectionDate } from "./forecast";
export function debtGoalPreset(goal: { name: string; targetAmountCents: number; currentAmountCents: number; targetDate: string | null }, debt: { remainingBalanceCents: number; installments: number | null; interestBasisPoints: number; ratePeriod: string; dueDay: number | null }, today: string, incomeCents: number, commitmentsCents: number) {
  let firstPayment = debt.dueDay ? projectionDate(today.slice(0,7),debt.dueDay) : "";
  if (firstPayment && firstPayment < today) firstPayment = projectionDate(monthKeys(today,2)[1],debt.dueDay!);
  const extraMonth = goal.targetDate && firstPayment ? Math.max(1,(Number(goal.targetDate.slice(0,4))-Number(firstPayment.slice(0,4)))*12+Number(goal.targetDate.slice(5,7))-Number(firstPayment.slice(5,7))+1) : null;
  const common = { product: "OTHER" as const, installments: debt.installments ? String(debt.installments) : "", rate: debt.ratePeriod === "MONTHLY" ? (debt.interestBasisPoints/100).toFixed(2) : "", firstPaymentOn: firstPayment };
  return { name: goal.name, forms: [emptyForm("goal-current",today,{...common,name:"Dívida sem amortização extra"}),emptyForm("goal-extra",today,{...common,name:"Com amortização planejada",extraAmount:centsText(goal.targetAmountCents),extraMonth:extraMonth===null?"":String(extraMonth)})], budget: emptyBudget({ needed:centsText(debt.remainingBalanceCents), income:centsText(incomeCents), commitments:centsText(commitmentsCents), savings:centsText(goal.currentAmountCents) }) };
}
