"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/workspace";
import { dayKey, isDateKey } from "@/lib/dates";
import { dateOnly, parseMoney } from "./money";
import { periodKeyFor } from "./card-statements";
import { applyStatementPayment, undoStatementPayment } from "./statement-payment-service";
import type { PaymentMode } from "./statement-payment";

/** Corrections preserve statement identity and linked purchases; no ledger entry is created. */
export async function correctCardStatement(fd: FormData) {
  const ctx = await requirePermission("WRITE");
  if (ctx.role !== "OWNER") return { error: "Somente o titular pode corrigir faturas." };
  const text = (key: string) => String(fd.get(key) || "").trim();
  try {
    const id = text("id");
    const amountCents = parseMoney(text("amount"));
    if (amountCents < 0) throw new Error("O valor não pode ser negativo.");
    const notes = text("notes") || null;
    if ((notes?.length || 0) > 2000) throw new Error("Use até 2000 caracteres na observação.");
    await prisma.$transaction(async tx => {
      const before = await tx.cardStatement.findFirst({ where: { id, workspaceId: ctx.workspaceId } });
      if (!before) throw new Error("Fatura não encontrada neste espaço.");
      if (before.updatedAt.toISOString() !== text("version")) throw new Error("Esta fatura mudou. Atualize a página antes de corrigir.");
      if (before.status === "PAID") throw new Error("Esta fatura já foi paga e deve preservar seu registro.");
      const projection = before.kind === "MONTHLY_PROJECTION";
      const dueDate = projection ? null : text("dueDate");
      const closingDate = projection ? null : text("closingDate") || null;
      const referenceMonth = text("referenceMonth") || null;
      if (!projection && (!dueDate || !isDateKey(dueDate))) throw new Error("Informe um vencimento válido.");
      if (closingDate && !isDateKey(closingDate)) throw new Error("Informe uma data de fechamento válida.");
      if (closingDate && dueDate && closingDate > dueDate) throw new Error("O fechamento deve ocorrer até o vencimento. Confira também o mês e o ano.");
      if ((referenceMonth && !/^\d{4}-(0[1-9]|1[0-2])$/.test(referenceMonth)) || (projection && !referenceMonth)) throw new Error("Informe uma competência válida.");
      const recurringDay = text("closingDay") ? Number(text("closingDay")) : null;
      if (recurringDay !== null && (!Number.isInteger(recurringDay) || recurringDay < 1 || recurringDay > 31)) throw new Error("O dia de fechamento deve estar entre 1 e 31.");
      const details = await tx.financeTransaction.findMany({ where: { workspaceId: ctx.workspaceId, cardStatementId: id, type: "EXPENSE" }, select: { amountCents: true, statementDetailMode: true } });
      const addedCents = details.reduce((sum, item) => sum + (item.statementDetailMode === "ADDED_TO_STATEMENT" ? item.amountCents : 0), 0);
      const detailedCents = details.reduce((sum, item) => sum + item.amountCents, 0);
      if (amountCents + addedCents < detailedCents) throw new Error("O valor corrigido não pode ficar abaixo dos gastos já detalhados nesta fatura.");
      const data = {
        amountCents, dueDate: dueDate ? dateOnly(dueDate) : null,
        closingDate: closingDate ? dateOnly(closingDate) : null,
        closingDay: projection ? null : closingDate ? Number(closingDate.slice(8)) : recurringDay,
        referenceMonth, notes, periodKey: periodKeyFor(before.kind, dueDate, referenceMonth),
      };
      const collision = await tx.cardStatement.findFirst({ where: { workspaceId: ctx.workspaceId, accountId: before.accountId, periodKey: data.periodKey, id: { not: id } }, select: { id: true } });
      if (collision) throw new Error("Já existe uma fatura deste cartão nesse vencimento ou competência. Confira os registros antes de corrigir.");
      await tx.cardStatement.updateMany({ where: { id, workspaceId: ctx.workspaceId }, data });
      await tx.activityEvent.create({ data: { workspaceId: ctx.workspaceId, actorUserId: ctx.userId, type: "statement.corrected", entityType: "CardStatement", entityId: id, metadata: {
        before: { amountCents: before.amountCents, dueDate: before.dueDate?.toISOString().slice(0, 10) || null, closingDate: before.closingDate?.toISOString().slice(0, 10) || null, closingDay: before.closingDay, referenceMonth: before.referenceMonth, notes: before.notes },
        after: { amountCents, dueDate, closingDate, closingDay: data.closingDay, referenceMonth, notes },
      } } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    revalidatePath("/finance", "layout");
    return { success: "Fatura corrigida. Saldos e previsões foram atualizados." };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) return { error: error.code === "P2002" ? "Já existe uma fatura neste vencimento ou competência." : "Não foi possível salvar. Atualize a página e tente novamente." };
    return { error: error instanceof Error ? error.message : "Não foi possível corrigir a fatura." };
  }
}

const PAYMENT_MODES: readonly PaymentMode[] = ["FULL", "PARTIAL", "CARRY", "CLOSE_CARRIED"];
const revalidateFinance = () => { revalidatePath("/finance", "layout"); revalidatePath("/today"); revalidatePath("/insights"); };

/** "Marcar como paga": settles, partly pays or carries over a bill. Owner only, in the session's workspace,
 * in one serializable transaction. It never creates an expense or moves a bank balance. */
export async function registerStatementPayment(fd: FormData) {
  const ctx = await requirePermission("WRITE");
  if (ctx.role !== "OWNER") return { error: "Somente o titular pode registrar pagamentos de fatura." };
  const text = (key: string) => String(fd.get(key) || "").trim();
  try {
    const mode = PAYMENT_MODES.find((item) => item === text("mode"));
    if (!mode) throw new Error("Escolha o que aconteceu com a fatura.");
    const outcome = await prisma.$transaction((tx) => applyStatementPayment(tx, ctx, {
      statementId: text("id"), version: text("version"), mode, amountCents: text("amount") ? parseMoney(text("amount")) : null,
      paidOn: text("paidOn") || null, unknownDate: fd.get("unknownDate") === "on", nextStatementId: text("nextStatementId") || null,
      carryIncluded: fd.get("carryIncluded") === "on", confirmed: fd.get("confirm") === "on", token: text("token"), today: dayKey(new Date(), ctx.workspace.timezone),
    }), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    revalidateFinance();
    return { success: outcome.message, already: outcome.already };
  } catch (error) {
    // The unique fingerprint is the last line of defense against two simultaneous submissions of one token.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { success: "Este pagamento já estava registrado.", already: true };
    return { error: error instanceof Error ? error.message : "Não foi possível registrar o pagamento." };
  }
}

/** Undoes the latest manual payment of a bill, only while nothing else changed it since. Audited. */
export async function undoManualStatementPayment(fd: FormData) {
  const ctx = await requirePermission("WRITE");
  if (ctx.role !== "OWNER") return { error: "Somente o titular pode desfazer pagamentos de fatura." };
  const text = (key: string) => String(fd.get(key) || "").trim();
  try {
    const result = await prisma.$transaction((tx) => undoStatementPayment(tx, ctx, { statementId: text("id"), version: text("version"), confirmed: fd.get("confirm") === "on" }), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    revalidateFinance();
    return { success: result.message };
  } catch (error) { return { error: error instanceof Error ? error.message : "Não foi possível desfazer o pagamento." }; }
}
