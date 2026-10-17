"use client";
import { useState } from "react";
import Link from "next/link";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useReducedMotion } from "motion/react";
import { Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { money } from "../money";
import { FutureGoalForm, GoalContributionForm, type GoalRow } from "./PlanningForms";
import { goalContributionPlan } from "./goals";
import { PlanningLinks } from "./PlanningDashboard";
import { usePlanningCopy } from "./copy";
type Option = { id: string; name: string; type?: string };
type DisplayGoal = GoalRow & { contributions: { amountCents: number; date: string; kind: string }[] };
export function FutureGoals({ goals, accounts, debts, today }: { goals: DisplayGoal[]; accounts: Option[]; debts: Option[]; today: string }) {
  const t = usePlanningCopy();
  const [sort, setSort] = useState("priority");
  const ordered = [...goals].sort((a,b)=>sort === "amount" ? b.targetAmountCents-a.targetAmountCents : sort === "urgency" ? (a.targetDate??"9999").localeCompare(b.targetDate??"9999") : a.priority-b.priority || (a.targetDate??"9999").localeCompare(b.targetDate??"9999"));
  return <div className="stack planning-page"><header className="row justify-between"><div><span className="eyebrow">MONEY</span><h1>{t("goals")}</h1><p className="muted">{t("goalHint")}</p></div><Modal title={t("newGoal")} trigger={<><Plus size={15}/>{t("newGoal")}</>}><FutureGoalForm accounts={accounts} debts={debts}/></Modal></header><PlanningLinks/>
    <label className="row">{t("sort")}<select value={sort} onChange={event=>setSort(event.target.value)}><option value="priority">{t("priority")}</option><option value="urgency">{t("urgency")}</option><option value="amount">{t("amount")}</option></select></label>
    <div className="planning-limit-grid">{ordered.map(goal => {
      const paidAmountCents = goal.contributions.filter(row => row.kind === "PAYMENT").reduce((sum, row) => sum + row.amountCents, 0), progress = goalContributionPlan({ ...goal, paidAmountCents }, today);
      return <article className="panel stack" key={goal.id}><div className="row justify-between"><span className="badge">{t(goal.kind)} · {t(goal.status)}</span><strong>{Math.round(progress.progressBasisPoints / 100)}%</strong></div><h2>{goal.name}</h2><p>{t("reserved")}: <strong>{money(goal.currentAmountCents)}</strong> / {money(goal.targetAmountCents)}</p><progress max={10000} value={progress.progressBasisPoints} aria-label={goal.name}/><dl className="planning-facts"><div><dt>{t("remaining")}</dt><dd>{money(progress.remainingCents)}</dd></div><div><dt>{t("suggested")}</dt><dd>{progress.suggestedCents === null ? t("unknown") : money(progress.suggestedCents)}</dd></div><div><dt>{t("monthly")}</dt><dd>{money(progress.chosenCents)}</dd></div><div><dt>{t("paid")}</dt><dd>{money(paidAmountCents)}</dd></div></dl><p className="muted text-sm">{goal.targetDate ?? t("unknown")} · {accounts.find(account => account.id === goal.linkedAccountId)?.name ?? t("none")} · {t(goal.recurrence)}</p>{progress.atRisk && goal.status === "ACTIVE" && <p className="text-danger">{t("risk")}</p>}{goal.notes && <p className="muted text-sm">{goal.notes}</p>}<div className="row"><Modal title={`${t("edit")} · ${goal.name}`} trigger={t("edit")}><FutureGoalForm goal={goal} accounts={accounts} debts={debts}/></Modal>{goal.status === "ACTIVE" && <Modal title={`${t("contribution")} · ${goal.name}`} trigger={t("contribution")}><GoalContributionForm goal={goal} accounts={accounts} today={today}/></Modal>}</div>{goal.debtId && <Link href={`/finance/debts/simulator?goal=${goal.id}`}>{t("simulate")}</Link>}<ReserveHistory goal={goal}/><details><summary>{t("history")} ({goal.contributions.length})</summary><ul className="planning-goal-history planning-source-list">{goal.contributions.map((row, index) => <li key={index}><span>{row.date} · {t(row.kind)}</span><strong>{money(row.amountCents)}</strong></li>)}</ul></details></article>;
    })}</div>{!goals.length && <div className="panel">{t("newGoal")} · {t("intro")}</div>}
    {goals.length > 0 && <section className="panel stack"><h2>{t("deadline")}</h2><ul className="planning-source-list">{goals.filter(goal => goal.status === "ACTIVE" && goal.targetDate).sort((a, b) => a.targetDate!.localeCompare(b.targetDate!)).map(goal => <li key={goal.id}><span>{goal.targetDate} · {goal.name}</span><strong>{money(goal.targetAmountCents)}</strong></li>)}</ul></section>}
  </div>;
}
function ReserveHistory({ goal }: { goal: DisplayGoal }) {
  const t = usePlanningCopy(), reduce = useReducedMotion(), delta = (kind: string, cents: number) => (kind === "PAYMENT" ? -1 : 1) * cents;
  const opening = goal.currentAmountCents - goal.contributions.reduce((sum,row)=>sum+delta(row.kind,row.amountCents),0), byDate = new Map<string,number>();
  for (const row of goal.contributions) byDate.set(row.date,(byDate.get(row.date)??0)+delta(row.kind,row.amountCents));
  const history = [{date:t("initial"),reservedCents:opening}];
  for (const [date,cents] of [...byDate].sort(([a],[b])=>a.localeCompare(b))) history.push({date,reservedCents:history.at(-1)!.reservedCents+cents});
  return <div className="planning-mini-chart" aria-label={t("reserveEvolution")} data-finance-chart><ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{width:600,height:190}}><LineChart data={history}><XAxis dataKey="date"/><YAxis width={75} tickFormatter={value=>money(Number(value))}/><Tooltip formatter={value=>money(Number(value))}/><Line dataKey="reservedCents" name={t("reserved")} stroke="var(--chart-2)" isAnimationActive={!reduce}/></LineChart></ResponsiveContainer></div>;
}
