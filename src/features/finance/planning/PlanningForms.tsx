"use client";
import { useRef, useState } from "react";
import { ActionForm } from "@/components/ui/ActionForm";
import { moneyInput } from "../money";
import { saveFutureGoal, saveMonthlyForecast, saveSpendingLimit, recordGoalContribution } from "./actions";
import type { FinancialPlanningData } from "./query";
import { usePlanningCopy } from "./copy";

type Option = { id: string; name: string; type?: string };
export function PlanningMoney({ name, label, value, required = false, readOnly = false }: { name: string; label: string; value?: number | null; required?: boolean; readOnly?: boolean }) {
  return <label>{label}<input name={name} inputMode="decimal" defaultValue={value == null ? "" : moneyInput(value)} required={required} readOnly={readOnly}/></label>;
}
export function LimitForm({ data, limit }: { data: Pick<FinancialPlanningData, "today" | "accounts" | "categories" | "statements">; limit?: FinancialPlanningData["limits"][number] }) {
  const t = usePlanningCopy(), [scope, setScope] = useState(limit?.scope ?? "GLOBAL"), [card, setCard] = useState(limit?.filterAccountIds[0] ?? "");
  return <ActionForm action={saveSpendingLimit} className="form-grid">
    {limit && <><input type="hidden" name="id" value={limit.id}/><input type="hidden" name="version" value={limit.version}/></>}
    <label>{t("name")}<input name="name" defaultValue={limit?.name} required maxLength={200}/></label>
    <PlanningMoney name="limit" label={t("amount")} value={limit?.limitCents} required/>
    <label>{t("startsOn")}<input name="startsOn" type="date" defaultValue={limit?.startDate ?? data.today} required readOnly={Boolean(limit)}/></label>
    <label>{t("endsOn")}<input name="endsOn" type="date" defaultValue={limit?.endDate} required readOnly={Boolean(limit)}/></label>
    <label>{t("scope")}<select name="scope" value={scope} onChange={event => setScope(event.target.value)}>{(limit ? [limit.scope] : ["GLOBAL", "CATEGORY", "ACCOUNT", "CARD_CYCLE"]).map(key => <option key={key} value={key}>{t(key)}</option>)}</select></label>
    {scope === "CARD_CYCLE" ? <><label>{t("card")}<select name="accounts" value={card} onChange={event => setCard(event.target.value)} required><option value="">{t("none")}</option>{data.accounts.filter(account => account.type === "CREDIT_CARD" && (!limit || limit.filterAccountIds.includes(account.id))).map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label><label>{t("statement")}<select name="statementId" defaultValue={limit?.statementId ?? ""} required><option value="">{t("none")}</option>{data.statements.filter(row => row.accountId === card && row.kind === "STATEMENT" && (!limit || limit.statementId === row.id)).map(row => <option key={row.id} value={row.id}>{row.accountName} · {row.dueDate ?? row.referenceMonth}</option>)}</select></label></> : <fieldset className="planning-options"><legend>{t("accounts")}</legend>{data.accounts.map(account => <label key={account.id}><input name="accounts" value={account.id} type="checkbox" defaultChecked={limit?.filterAccountIds.includes(account.id)} disabled={Boolean(limit)}/>{account.name} · {account.type === "CREDIT_CARD" ? t("card") : t("cash")}</label>)}{limit?.filterAccountIds.map(id => <input key={id} name="accounts" value={id} type="hidden"/>)}</fieldset>}
    <fieldset className="planning-options"><legend>{t("categories")}</legend>{data.categories.map(category => <label key={category.id}><input name="categories" value={category.id} type="checkbox" defaultChecked={limit?.filterCategoryIds.includes(category.id)} disabled={Boolean(limit)}/>{category.name}</label>)}{limit?.filterCategoryIds.map(id => <input key={id} name="categories" value={id} type="hidden"/>)}</fieldset>
    <label><input name="excludeFixed" type="checkbox" defaultChecked={limit?.excludeFixed ?? true}/>{t("excludeFixed")}</label>
    {!limit && <label><input name="incremental" type="checkbox"/>{t("incremental")}</label>}
    <label><input name="recurring" type="checkbox" defaultChecked={limit?.recurring} disabled={Boolean(limit)}/>{t("recurring")}</label>{limit?.recurring && <input name="recurring" type="hidden" value="on"/>}
    <label>{t("status")}<select name="status" defaultValue={limit?.status ?? "ACTIVE"}>{["ACTIVE", "PAUSED", "CLOSED"].map(key => <option key={key} value={key}>{t(key)}</option>)}</select></label>
    <label>{t("notes")}<textarea name="notes" maxLength={2000} defaultValue={limit?.notes ?? ""}/></label>
    <p className="planning-wide muted text-xs">{t("limitHint")}</p><button className="button">{t("save")}</button>
  </ActionForm>;
}
export function MonthForecastForm({ month, override, accounts }: { month: string; override?: FinancialPlanningData["overrides"][number]; accounts: Option[] }) {
  const t = usePlanningCopy();
  return <ActionForm action={saveMonthlyForecast} className="form-grid">
    <input name="month" type="hidden" value={month}/><input name="version" type="hidden" value={override?.version ?? 1}/>
    <PlanningMoney name="income" label={t("income")} value={override?.incomeOverrideCents}/><p className="muted text-xs">{t("incomeHint")}</p>
    <PlanningMoney name="extraIncome" label={t("extra")} value={override?.extraIncomeCents}/><label>{t("status")}<select name="extraIncomeStatus" defaultValue={override?.extraIncomeStatus ?? "EXPECTED"}>{["EXPECTED", "CONFIRMED"].map(key => <option key={key} value={key}>{t(key)}</option>)}</select></label>
    <PlanningMoney name="variableBudget" label={t("variableBudget")} value={override?.variableBudgetCents}/><label>{t("card")}<select name="variableCardAccountId" defaultValue={override?.variableCardAccountId ?? ""}><option value="">{t("cash")}</option>{accounts.filter(account => account.type === "CREDIT_CARD").map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
    <PlanningMoney name="otherOutflow" label={t("other")} value={override?.otherOutflowCents}/><label>{t("description")}<input name="otherOutflowDescription" maxLength={300} defaultValue={override?.otherOutflowDescription ?? ""}/></label>
    <label>{t("notes")}<textarea name="notes" maxLength={2000} defaultValue={override?.notes ?? ""}/></label><button className="button">{t("save")}</button>
  </ActionForm>;
}
export type GoalRow = { id: string; name: string; targetAmountCents: number; currentAmountCents: number; targetDate: string | null; monthlyContributionCents: number | null; linkedAccountId: string | null; kind: string; contributionFrequency: string; priority: number; notes: string | null; recurrence: string; debtId: string | null; status: string; version: number };
export function FutureGoalForm({ goal, accounts, debts }: { goal?: GoalRow; accounts: Option[]; debts: Option[] }) {
  const t = usePlanningCopy();
  return <ActionForm action={saveFutureGoal} className="form-grid">
    {goal && <><input name="id" type="hidden" value={goal.id}/><input name="version" type="hidden" value={goal.version}/></>}
    <label>{t("name")}<input name="name" defaultValue={goal?.name} maxLength={200} required/></label><label>{t("kind")}<select name="kind" defaultValue={goal?.kind ?? "OTHER"}>{["IPVA", "INSURANCE", "MAINTENANCE", "TRAVEL", "WEDDING", "DEBT_AMORTIZATION", "EARLY_PAYOFF", "EMERGENCY", "PURCHASE", "OTHER"].map(key => <option key={key} value={key}>{t(key)}</option>)}</select></label>
    <PlanningMoney name="targetAmount" label={t("target")} value={goal?.targetAmountCents} required/><PlanningMoney name="currentAmount" label={t("reserved")} value={goal?.currentAmountCents ?? 0} required readOnly={Boolean(goal)}/>
    <label>{t("deadline")}<input name="targetDate" type="date" defaultValue={goal?.targetDate ?? ""}/></label><PlanningMoney name="monthlyContribution" label={t("monthly")} value={goal?.monthlyContributionCents}/>
    <label>{t("frequency")}<select name="frequency" defaultValue={goal?.contributionFrequency ?? "MONTHLY"}>{["MONTHLY", "ONE_TIME"].map(key => <option key={key} value={key}>{t(key)}</option>)}</select></label><label>{t("priority")}<select name="priority" defaultValue={goal?.priority ?? 2}>{[1, 2, 3].map(value => <option key={value}>{value}</option>)}</select></label>
    <label>{t("bankReserve")}<select name="linkedAccountId" defaultValue={goal?.linkedAccountId ?? ""}><option value="">{t("none")}</option>{accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label><label>{t("debt")}<select name="debtId" defaultValue={goal?.debtId ?? ""}><option value="">{t("none")}</option>{debts.map(debt => <option key={debt.id} value={debt.id}>{debt.name}</option>)}</select></label>
    <label>{t("recurring")}<select name="recurrence" defaultValue={goal?.recurrence ?? "NONE"}>{["NONE", "YEARLY", "CUSTOM"].map(key => <option key={key} value={key}>{t(key)}</option>)}</select></label><label>{t("status")}<select name="status" defaultValue={goal?.status ?? "ACTIVE"}>{["ACTIVE", "PAUSED", "COMPLETED"].map(key => <option key={key} value={key}>{t(key)}</option>)}</select></label>
    <label>{t("notes")}<textarea name="notes" defaultValue={goal?.notes ?? ""} maxLength={2000}/></label><p className="planning-wide muted text-xs">{t("goalHint")}</p><button className="button">{t("save")}</button>
  </ActionForm>;
}
export function GoalContributionForm({ goal, accounts, today }: { goal: GoalRow; accounts: Option[]; today: string }) {
  const t = usePlanningCopy(), [kind, setKind] = useState("ALLOCATION"), token = useRef("");
  return <ActionForm className="stack" action={async fd => { token.current ||= crypto.randomUUID(); fd.set("token", token.current); const result = await recordGoalContribution(fd); if (!("error" in result)) token.current = ""; return result; }}>
    <input name="goalId" type="hidden" value={goal.id}/><input name="version" type="hidden" value={goal.version}/>
    <label>{t("kind")}<select name="kind" value={kind} onChange={event => setKind(event.target.value)}>{["ALLOCATION", "TRANSFER", "PAYMENT"].map(key => <option key={key} value={key}>{t(key)}</option>)}</select></label>
    <PlanningMoney name="amount" label={t("amount")} required/><label>{t("date")}<input name="date" type="date" defaultValue={today} max={today} required/></label>
    {kind !== "ALLOCATION" && <label>{t("origin")}<select name="accountId" required><option value="">{t("none")}</option>{accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>}
    <p className="muted text-xs">{t("goalHint")}</p><label><input name="confirm" type="checkbox" required/>{t("confirm")}</label><button className="button">{t("save")}</button>
  </ActionForm>;
}
