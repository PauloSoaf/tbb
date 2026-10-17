import "server-only";
import { prisma } from "@/lib/prisma";
import { dateOnly } from "../money";
import { shiftMonth } from "../calendar-core";
import { limitWindow } from "./spending-limits";
import { projectionDate } from "./forecast";
export type PlanningMarker = { id: string; date: string; kind: "limits" | "goals" | "plan"; label: string; amountCents: number; href: string };
export async function financePlanningMarkers(workspaceId: string, month: string): Promise<PlanningMarker[]> {
  const start = dateOnly(month + "-01"), end = dateOnly(shiftMonth(month, 1) + "-01");
  const [limits, goals, fixed] = await Promise.all([
    prisma.budget.findMany({ where: { workspaceId, kind: "SPENDING_LIMIT", status: "ACTIVE", OR: [{ recurring: true }, { endDate: { gte: start, lt: end } }] }, select: { id: true, name: true, limitCents: true, startDate: true, endDate: true, recurring: true } }),
    prisma.savingsGoal.findMany({ where: { workspaceId, status: "ACTIVE", targetDate: { gte: start, lt: end } }, select: { id: true, name: true, targetDate: true, targetAmountCents: true } }),
    prisma.fixedExpense.findMany({ where: { workspaceId, isActive: true, paymentMethod: { in: ["PIX", "BANK_DEBIT", "BOLETO", "CASH", "OTHER"] }, dueDay: { not: null }, AND: [{ OR: [{ startsOn: null }, { startsOn: { lt: end } }] }, { OR: [{ endsOn: null }, { endsOn: { gte: start } }] }] }, select: { id: true, name: true, dueDay: true, amountCents: true, paymentMethod: true } }),
  ]);
  return [
    ...limits.flatMap(row => { const windows = (row.recurring ? [shiftMonth(month, -1), month] : [undefined]).map(cycle => limitWindow({ ...row, startDate: row.startDate.toISOString().slice(0, 10), endDate: row.endDate.toISOString().slice(0, 10) }, cycle)); return windows.flatMap(window => window.end.startsWith(month) && window.start >= row.startDate.toISOString().slice(0, 10) ? [{ id: `limit:${row.id}`, date: window.end, kind: "limits" as const, label: row.name || "Limite", amountCents: row.limitCents, href: "/finance/limits" }] : []); }),
    ...goals.map(row => ({ id: `goal:${row.id}`, date: row.targetDate!.toISOString().slice(0, 10), kind: "goals" as const, label: row.name, amountCents: row.targetAmountCents, href: "/finance/savings" })),
    ...fixed.map(row => ({ id: `fixed:${row.id}`, date: projectionDate(month, row.dueDay!), kind: "plan" as const, label: `${row.name} · ${row.paymentMethod}`, amountCents: row.amountCents, href: "/finance/forecasts?tab=audit" })),
  ].sort((a, b) => a.date.localeCompare(b.date));
}
