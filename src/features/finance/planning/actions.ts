"use server";

import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AuthorizationError, requirePermission } from "@/lib/workspace";
import { dayKey } from "@/lib/dates";
import { dateOnly, parseMoney } from "../money";
import { reconcileBankSettlement, type BankSettlementInput } from "./bank-settlement";

const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const positive = (fd: FormData, key: string, allowZero = true) => { const value = parseMoney(text(fd, key)); if (value < (allowZero ? 0 : 1)) throw new Error("Informe um valor válido."); return value; };
const optionalMoney = (fd: FormData, key: string) => text(fd, key) ? positive(fd, key) : null;
const label = (fd: FormData) => z.string().trim().min(1).max(200).parse(text(fd, "name"));
const version = (fd: FormData) => z.coerce.number().int().min(1).parse(text(fd, "version"));
const list = (fd: FormData, key: string) => [...new Set(fd.getAll(key).map(String).filter(Boolean))].slice(0, 100);
const fresh = () => revalidatePath("/finance", "layout");
const failure = (error: unknown) => ({ error: error instanceof z.ZodError ? error.issues[0]?.message || "Confira os campos." : error instanceof Prisma.PrismaClientKnownRequestError ? "Os dados mudaram ou já foram registrados. Atualize antes de tentar novamente." : error instanceof Error ? error.message : "Não foi possível salvar." });
async function ownerWrite() { const context = await requirePermission("WRITE"); if (context.role !== "OWNER") throw new AuthorizationError("Planejamento detalhado é privado do titular."); return context; }
const monthKey = (value: string) => z.string().regex(/^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/).parse(value);

export async function saveSpendingLimit(fd: FormData) {
  const context = await ownerWrite();
  try {
    const id = text(fd, "id"), name = label(fd), limitCents = positive(fd, "limit"), status = z.enum(["ACTIVE", "PAUSED", "CLOSED"]).parse(text(fd, "status") || "ACTIVE");
    const scope = z.enum(["GLOBAL", "CATEGORY", "ACCOUNT", "CARD_CYCLE"]).parse(text(fd, "scope"));
    const startDate = dateOnly(text(fd, "startsOn")), endDate = dateOnly(text(fd, "endsOn"));
    if (endDate < startDate || endDate.getTime() - startDate.getTime() > 731 * 86400000) throw new Error("Escolha um período de até 24 meses, com fim igual ou posterior ao início.");
    const filterAccountIds = list(fd, "accounts"), filterCategoryIds = list(fd, "categories"), statementId = text(fd, "statementId") || null;
    const excludeFixed = fd.get("excludeFixed") === "on", recurring = fd.get("recurring") === "on";
    if (recurring && endDate.getTime() - startDate.getTime() > 62 * 86400000) throw new Error("O ciclo recorrente deve abranger até dois meses.");
    if (scope === "ACCOUNT" && !filterAccountIds.length || scope === "CATEGORY" && !filterCategoryIds.length) throw new Error("Selecione as contas ou categorias do limite.");
    const notes = z.string().max(2000).parse(text(fd, "notes")) || null;
    await prisma.$transaction(async tx => {
      const accounts = await tx.account.count({ where: { workspaceId: context.workspaceId, id: { in: filterAccountIds }, isArchived: false, currency: "BRL" } });
      const categories = await tx.financeCategory.count({ where: { workspaceId: context.workspaceId, id: { in: filterCategoryIds }, isArchived: false } });
      if (accounts !== filterAccountIds.length || categories !== filterCategoryIds.length) throw new Error("Selecione contas e categorias deste espaço.");
      if (scope === "CARD_CYCLE") {
        const statement = await tx.cardStatement.findFirst({ where: { id: statementId || "", workspaceId: context.workspaceId, kind: "STATEMENT" } });
        if (!statement || filterAccountIds.length !== 1 || filterAccountIds[0] !== statement.accountId) throw new Error("Vincule o ciclo à fatura e ao cartão correspondentes.");
      } else if (statementId) throw new Error("A fatura só pode ser vinculada ao escopo de ciclo.");
      if (id) {
        const current = await tx.budget.findFirst({ where: { id, workspaceId: context.workspaceId, kind: "SPENDING_LIMIT" } });
        if (!current || current.scope !== scope || current.startDate.getTime() !== startDate.getTime() || current.endDate.getTime() !== endDate.getTime() || current.statementId !== statementId || current.recurring !== recurring || JSON.stringify([...current.filterAccountIds].sort()) !== JSON.stringify([...filterAccountIds].sort()) || JSON.stringify([...current.filterCategoryIds].sort()) !== JSON.stringify([...filterCategoryIds].sort())) throw new Error("O período, ciclo e filtros preservam a linha de base. Crie outro limite para modificá-los.");
        const result = await tx.budget.updateMany({ where: { id, workspaceId: context.workspaceId, version: version(fd) }, data: { name, limitCents, status, notes, excludeFixed, version: { increment: 1 } } });
        if (result.count !== 1) throw new Error("Este limite mudou. Atualize a página.");
      } else {
        const incremental = fd.get("incremental") === "on", baselineAt = incremental ? new Date() : null;
        const item = await tx.budget.create({ data: { workspaceId: context.workspaceId, categoryId: null, kind: "SPENDING_LIMIT", scope, name, limitCents, startDate, endDate,
          filterAccountIds, filterCategoryIds, excludeFixed, statementId, recurring, status, notes, timezone: context.workspace.timezone,
          baselineAt, baselineDate: baselineAt ? dateOnly(dayKey(baselineAt, context.workspace.timezone)) : null } });
        if (baselineAt) {
          const known = await tx.financeTransaction.findMany({ where: { workspaceId: context.workspaceId, OR: [{ purchasedDate: { gte: startDate, lte: endDate } }, { purchasedDate: null, date: { gte: startDate, lte: endDate } }] }, select: { id: true }, take: 10001 });
          if (known.length > 10000) throw new Error("Há muitos lançamentos nessa linha de base. Reduza o período ou os filtros.");
          if (known.length) await tx.budgetTransactionReview.createMany({ data: known.map(row => ({ workspaceId: context.workspaceId, budgetId: item.id, transactionId: row.id, decision: "BASELINE" })) });
        }
      }
      await tx.activityEvent.create({ data: { workspaceId: context.workspaceId, actorUserId: context.userId, type: "finance.spending_limit_saved", entityType: "Budget", entityId: id || "new", source: "MANUAL" } });
    }, { isolationLevel: "Serializable" });
    fresh(); return { success: "Limite salvo. Nenhum lançamento financeiro foi criado." };
  } catch (error) { return failure(error); }
}

export async function reviewLimitTransaction(fd: FormData) {
  const context = await ownerWrite();
  try {
    const budgetId = text(fd, "budgetId"), transactionId = text(fd, "transactionId"), decision = z.enum(["COUNT", "IGNORE"]).parse(text(fd, "decision"));
    await prisma.$transaction(async tx => {
      if (!await tx.budget.findFirst({ where: { id: budgetId, workspaceId: context.workspaceId, kind: "SPENDING_LIMIT" } }) || !await tx.financeTransaction.findFirst({ where: { id: transactionId, workspaceId: context.workspaceId } })) throw new Error("Registro não encontrado neste espaço.");
      await tx.budgetTransactionReview.upsert({ where: { budgetId_transactionId: { budgetId, transactionId } }, create: { workspaceId: context.workspaceId, budgetId, transactionId, decision, reason: text(fd, "reason").slice(0, 1000) }, update: { decision, reason: text(fd, "reason").slice(0, 1000) } });
      await tx.activityEvent.create({ data: { workspaceId: context.workspaceId, actorUserId: context.userId, type: "finance.spending_limit_reviewed", entityType: "Budget", entityId: budgetId, source: "MANUAL", metadata: { transactionId, decision } } });
    }, { isolationLevel: "Serializable" });
    fresh(); return { success: "Classificação registrada." };
  } catch (error) { return failure(error); }
}

export async function saveMonthlyForecast(fd: FormData) {
  const context = await ownerWrite();
  try {
    const month = monthKey(text(fd, "month"));
    const data = { incomeOverrideCents: optionalMoney(fd, "income"), extraIncomeCents: optionalMoney(fd, "extraIncome") ?? 0, extraIncomeStatus: z.enum(["EXPECTED", "CONFIRMED"]).parse(text(fd, "extraIncomeStatus") || "EXPECTED"), variableBudgetCents: optionalMoney(fd, "variableBudget"), variableCardAccountId: text(fd, "variableCardAccountId") || null, otherOutflowCents: optionalMoney(fd, "otherOutflow") ?? 0, otherOutflowDescription: text(fd, "otherOutflowDescription").slice(0, 300) || null, notes: text(fd, "notes").slice(0, 2000) || null };
    await prisma.$transaction(async tx => {
      if (data.variableCardAccountId && !await tx.account.findFirst({ where: { id: data.variableCardAccountId, workspaceId: context.workspaceId, type: "CREDIT_CARD", isArchived: false } })) throw new Error("Selecione um cartão deste espaço.");
      const current = await tx.monthlyFinancialPlan.findUnique({ where: { workspaceId_month: { workspaceId: context.workspaceId, month } } });
      if (current) {
        const result = await tx.monthlyFinancialPlan.updateMany({ where: { id: current.id, workspaceId: context.workspaceId, version: version(fd) }, data: { ...data, version: { increment: 1 } } });
        if (result.count !== 1) throw new Error("A previsão mudou. Atualize a página.");
      } else await tx.monthlyFinancialPlan.create({ data: { workspaceId: context.workspaceId, month, ...data } });
      await tx.activityEvent.create({ data: { workspaceId: context.workspaceId, actorUserId: context.userId, type: "finance.month_forecast_saved", entityType: "MonthlyFinancialPlan", entityId: month, source: "MANUAL" } });
    }, { isolationLevel: "Serializable" });
    fresh(); return { success: "Previsão salva sem registrar receita ou despesa efetiva." };
  } catch (error) { return failure(error); }
}

export async function reviewFixedAssociation(fd: FormData) {
  const context = await ownerWrite();
  try {
    const fixedExpenseId = text(fd, "fixedExpenseId"), subjectId = text(fd, "subjectId"), subjectKind = z.enum(["TRANSACTION", "SUBSCRIPTION"]).parse(text(fd, "subjectKind"));
    const decision = z.enum(["ASSOCIATE", "UPDATE", "INDEPENDENT", "IGNORED"]).parse(text(fd, "decision"));
    await prisma.$transaction(async tx => {
      const plan = await tx.fixedExpense.findFirst({ where: { id: fixedExpenseId, workspaceId: context.workspaceId, isActive: true } });
      if (!plan) throw new Error("Previsão não encontrada neste espaço.");
      const source = subjectKind === "TRANSACTION" ? await tx.financeTransaction.findFirst({ where: { id: subjectId, workspaceId: context.workspaceId, type: { in: ["EXPENSE", "REFUND"] }, isConsumption: true } }) : await tx.subscription.findFirst({ where: { id: subjectId, workspaceId: context.workspaceId } });
      if (!source) throw new Error("Origem não encontrada neste espaço.");
      if (["ASSOCIATE", "UPDATE"].includes(decision)) {
        if (source.fixedExpenseId && source.fixedExpenseId !== plan.id) throw new Error("A origem já está associada a outro compromisso.");
        if (subjectKind === "TRANSACTION") await tx.financeTransaction.updateMany({ where: { id: subjectId, workspaceId: context.workspaceId, revision: z.coerce.number().int().min(0).parse(text(fd, "sourceVersion")) }, data: { fixedExpenseId, revision: { increment: 1 } } }).then(result => { if (result.count !== 1) throw new Error("O lançamento mudou. Atualize antes de associar."); });
        else await tx.subscription.updateMany({ where: { id: subjectId, workspaceId: context.workspaceId, updatedAt: new Date(text(fd, "sourceVersion")) }, data: { fixedExpenseId } }).then(result => { if (result.count !== 1) throw new Error("A assinatura mudou. Atualize antes de associar."); });
        if (decision === "UPDATE") {
          const result = await tx.fixedExpense.updateMany({ where: { id: fixedExpenseId, workspaceId: context.workspaceId, version: version(fd) }, data: { amountCents: source.amountCents, version: { increment: 1 } } });
          if (result.count !== 1) throw new Error("A previsão mudou. Atualize a página.");
        }
      }
      const fingerprint = `fixed:${subjectKind}:${subjectId}:${fixedExpenseId}`;
      await tx.financePlanningReview.upsert({ where: { workspaceId_fingerprint: { workspaceId: context.workspaceId, fingerprint } }, create: { workspaceId: context.workspaceId, fingerprint, subjectKind, subjectId, fixedExpenseId, title: "Conciliação de compromisso", status: ["ASSOCIATE", "UPDATE"].includes(decision) ? "CONFIRMED" : decision, confidence: "CONFIRMED" }, update: { status: ["ASSOCIATE", "UPDATE"].includes(decision) ? "CONFIRMED" : decision, version: { increment: 1 } } });
      await tx.activityEvent.create({ data: { workspaceId: context.workspaceId, actorUserId: context.userId, type: "finance.fixed_association_reviewed", entityType: "FixedExpense", entityId: fixedExpenseId, source: "MANUAL", metadata: { subjectKind, subjectId, decision } } });
    }, { isolationLevel: "Serializable" });
    fresh(); return { success: "Revisão registrada. Nenhuma compra foi duplicada." };
  } catch (error) { return failure(error); }
}

export async function reconcileExistingPayment(fd: FormData) {
  const context = await ownerWrite();
  try {
    await prisma.$transaction(async tx => {
      const payment = await tx.cardStatementPayment.findFirst({ where: { id: text(fd, "paymentId"), workspaceId: context.workspaceId } });
      if (!payment || payment.bankTransactionId) throw new Error("Pagamento não encontrado ou já conciliado.");
      const today = dayKey(new Date(), context.workspace.timezone), enteredDate = text(fd, "paidOn") ? dateOnly(text(fd, "paidOn")).toISOString().slice(0, 10) : null;
      if (enteredDate && enteredDate > today) throw new Error("Informe a data real, não futura, do pagamento.");
      // Learn an unknown date through the settlement, while preserving any previously confirmed date.
      const verifiedDate = payment.date?.toISOString().slice(0, 10) ?? enteredDate;
      const bank = await reconcileBankSettlement(tx, context, { ...payment, date: verifiedDate }, { mode: z.enum(["UNRECONCILED", "STATUS_ONLY", "LINKED", "CREATED"]).parse(text(fd, "bankMode")) as BankSettlementInput["mode"], accountId: text(fd, "bankAccountId"), transactionId: text(fd, "bankTransactionId"), balanceConfirmed: fd.get("balanceConfirmed") === "on" }, today);
      if (!payment.date && verifiedDate && bank.bankMode !== "UNRECONCILED") await tx.cardStatementPayment.updateMany({ where: { id: payment.id, workspaceId: context.workspaceId, date: null }, data: { date: dateOnly(verifiedDate) } });
    }, { isolationLevel: "Serializable" });
    fresh(); return { success: "Conciliação bancária registrada." };
  } catch (error) { return failure(error); }
}

export async function saveFutureGoal(fd: FormData) {
  const context = await requirePermission("WRITE");
  try {
    const id = text(fd, "id"), targetAmountCents = positive(fd, "targetAmount", false), currentAmountCents = positive(fd, "currentAmount"), monthlyContributionCents = optionalMoney(fd, "monthlyContribution");
    const data = { name: label(fd), targetAmountCents, currentAmountCents, targetDate: text(fd, "targetDate") ? dateOnly(text(fd, "targetDate")) : null,
      linkedAccountId: text(fd, "linkedAccountId") || null, kind: z.enum(["IPVA", "INSURANCE", "MAINTENANCE", "TRAVEL", "WEDDING", "DEBT_AMORTIZATION", "EARLY_PAYOFF", "EMERGENCY", "PURCHASE", "OTHER"]).parse(text(fd, "kind") || "OTHER"),
      contributionFrequency: z.enum(["MONTHLY", "ONE_TIME"]).parse(text(fd, "frequency") || "MONTHLY"), monthlyContributionCents, priority: z.coerce.number().int().min(1).max(3).parse(text(fd, "priority") || "2"), notes: text(fd, "notes").slice(0, 2000) || null,
      recurrence: z.enum(["NONE", "YEARLY", "CUSTOM"]).parse(text(fd, "recurrence") || "NONE"), debtId: text(fd, "debtId") || null, status: z.enum(["ACTIVE", "PAUSED", "COMPLETED"]).parse(text(fd, "status") || "ACTIVE") };
    await prisma.$transaction(async tx => {
      if (data.linkedAccountId && !await tx.account.findFirst({ where: { id: data.linkedAccountId, workspaceId: context.workspaceId, isArchived: false, type: { in: ["CHECKING", "SAVINGS", "CASH", "DIGITAL_WALLET"] } } })) throw new Error("Selecione uma conta ou reserva deste espaço.");
      if (data.debtId && !await tx.debt.findFirst({ where: { id: data.debtId, workspaceId: context.workspaceId } })) throw new Error("Selecione uma dívida deste espaço.");
      if (id) {
        const current = await tx.savingsGoal.findFirst({ where: { id, workspaceId: context.workspaceId } });
        if (!current || current.currentAmountCents !== currentAmountCents) throw new Error("Use Registrar contribuição para alterar a reserva de um objetivo existente.");
        const result = await tx.savingsGoal.updateMany({ where: { id, workspaceId: context.workspaceId, version: version(fd) }, data: { ...data, version: { increment: 1 } } });
        if (result.count !== 1) throw new Error("O objetivo mudou. Atualize a página.");
      } else await tx.savingsGoal.create({ data: { workspaceId: context.workspaceId, ...data } });
      await tx.activityEvent.create({ data: { workspaceId: context.workspaceId, actorUserId: context.userId, type: "finance.future_goal_saved", entityType: "SavingsGoal", entityId: id || "new", source: "MANUAL" } });
    }, { isolationLevel: "Serializable" });
    fresh(); return { success: "Objetivo salvo. O patrimônio e a dívida não foram alterados." };
  } catch (error) { return failure(error); }
}

export async function recordGoalContribution(fd: FormData) {
  const context = await requirePermission("WRITE");
  try {
    const goalId = text(fd, "goalId"), amountCents = positive(fd, "amount", false), date = dateOnly(text(fd, "date")), today = dayKey(new Date(), context.workspace.timezone);
    if (date.toISOString().slice(0, 10) > today) throw new Error("Registre somente uma contribuição ou pagamento já realizado.");
    const kind = z.enum(["ALLOCATION", "TRANSFER", "PAYMENT"]).parse(text(fd, "kind"));
    const token = z.string().min(16).max(100).parse(text(fd, "token")), fingerprint = createHash("sha256").update(`goal:${context.workspaceId}:${goalId}:${token}`).digest("hex");
    if (fd.get("confirm") !== "on") throw new Error("Confirme a movimentação antes de registrar.");
    await prisma.$transaction(async tx => {
      if (await tx.savingsContribution.findUnique({ where: { workspaceId_fingerprint: { workspaceId: context.workspaceId, fingerprint } } })) return;
      const goal = await tx.savingsGoal.findFirst({ where: { id: goalId, workspaceId: context.workspaceId, status: "ACTIVE" } });
      if (!goal || goal.version !== version(fd)) throw new Error("O objetivo mudou. Atualize a página.");
      let transactionId: string | null = null;
      if (kind !== "ALLOCATION") {
        const account = await tx.account.findFirst({ where: { id: text(fd, "accountId"), workspaceId: context.workspaceId, isArchived: false, currency: "BRL", type: { in: ["CHECKING", "SAVINGS", "CASH", "DIGITAL_WALLET"] } } });
        if (!account) throw new Error("Escolha a conta em que a movimentação ocorreu.");
        if (kind === "TRANSFER") {
          const target = await tx.account.findFirst({ where: { id: goal.linkedAccountId || "", workspaceId: context.workspaceId, isArchived: false, currency: "BRL", type: "SAVINGS" } });
          if (!target || target.id === account.id) throw new Error("Vincule uma conta de reserva diferente da conta de origem.");
        }
        if (kind === "PAYMENT" && amountCents > goal.currentAmountCents) throw new Error("O pagamento excede o valor reservado para este objetivo.");
        const debtPayment = kind === "PAYMENT" && goal.debtId && ["DEBT_AMORTIZATION", "EARLY_PAYOFF"].includes(goal.kind);
        if (debtPayment) {
          const debt = await tx.debt.findFirst({ where: { id: goal.debtId!, workspaceId: context.workspaceId, status: "ACTIVE" } });
          if (!debt || amountCents > debt.remainingBalanceCents) throw new Error("Confira o valor de principal amortizado e a dívida selecionada.");
          const changedDebt = await tx.debt.updateMany({ where: { id: debt.id, workspaceId: context.workspaceId, remainingBalanceCents: debt.remainingBalanceCents }, data: { remainingBalanceCents: { decrement: amountCents }, ...(amountCents === debt.remainingBalanceCents ? { status: "PAID" } : {}) } });
          if (changedDebt.count !== 1) throw new Error("A dívida mudou. Atualize antes de registrar a amortização.");
        }
        const row = await tx.financeTransaction.create({ data: { workspaceId: context.workspaceId, accountId: account.id, destinationAccountId: kind === "TRANSFER" ? goal.linkedAccountId : null,
          type: kind === "TRANSFER" ? "TRANSFER" : "EXPENSE", description: `${kind === "TRANSFER" ? "Reserva" : "Pagamento"} · ${goal.name}`, amountCents, date,
          isConsumption: kind === "PAYMENT" && !debtPayment, eventKind: kind === "TRANSFER" ? "GOAL_RESERVE" : debtPayment ? "DEBT_SETTLEMENT" : "PURCHASE", source: "SAVINGS_GOAL", fingerprint: `movement:${fingerprint}` } });
        transactionId = row.id;
      }
      const nextAmount = goal.currentAmountCents + (kind === "PAYMENT" ? -amountCents : amountCents);
      if (nextAmount > 2147483647) throw new Error("A reserva excede o limite monetário.");
      const paid = kind === "PAYMENT" ? await tx.savingsContribution.aggregate({ where: { workspaceId: context.workspaceId, goalId, kind: "PAYMENT" }, _sum: { amountCents: true } }) : null;
      const changed = await tx.savingsGoal.updateMany({ where: { id: goalId, workspaceId: context.workspaceId, version: goal.version }, data: { currentAmountCents: nextAmount, version: { increment: 1 }, ...(kind === "PAYMENT" && (paid?._sum.amountCents ?? 0) + amountCents >= goal.targetAmountCents ? { status: "COMPLETED" } : {}) } });
      if (changed.count !== 1) throw new Error("O objetivo mudou durante o registro.");
      await tx.savingsContribution.create({ data: { workspaceId: context.workspaceId, goalId, transactionId, amountCents, date, kind, fingerprint } });
      await tx.activityEvent.create({ data: { workspaceId: context.workspaceId, actorUserId: context.userId, type: "finance.goal_contribution_recorded", entityType: "SavingsGoal", entityId: goalId, source: "MANUAL", metadata: { kind, amountCents, transactionId } } });
    }, { isolationLevel: "Serializable" });
    fresh(); return { success: "Registro confirmado. Reservas não foram tratadas como consumo." };
  } catch (error) { return failure(error); }
}
