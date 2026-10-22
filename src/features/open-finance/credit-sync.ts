import { Prisma, type PrismaClient } from "@prisma/client";
import { runFinancialImport, type ImportActor } from "@/features/finance/document-import";
import { billingDay, normalizeCreditBill, normalizeCreditTransaction } from "./credit-normalize";
import { reconcileCreditBills } from "./credit-bills";
import { PluggyError, type PluggyClient } from "./pluggy-client";
import type { PluggyAccount } from "./pluggy-schemas";
import { createHash } from "node:crypto";

export async function prepareCreditSync(input: { prisma: PrismaClient; client: PluggyClient; actor: ImportActor; linkId: string; accountId: string; externalAccountId: string; remote: PluggyAccount; timezone: string; syncFrom: string | null; asOfDate: string }) {
  const [billRows, transactions] = await Promise.all([input.client.listBills(input.externalAccountId), input.client.listTransactions(input.externalAccountId, input.syncFrom ? { dateFrom: input.syncFrom } : {})]);
  let currentDue = billingDay(input.remote.creditData?.balanceDueDate);
  if (currentDue && currentDue < input.asOfDate) currentDue = null;
  const bills = billRows.items.map(bill => normalizeCreditBill(bill, currentDue));
  if (billRows.invalid || transactions.invalid || bills.some(bill => !bill)) throw new PluggyError("UNEXPECTED_RESPONSE");
  const validBills = bills.filter(bill => bill !== null);
  // /bills may contain only closed invoices. Account.balance is the current UNPAID balance, not a face total.
  // Propose the TBB's current invoice explicitly for review; never invent a due date from an old closed invoice.
  const local = await input.prisma.cardStatement.findMany({ where: { workspaceId: input.actor.workspaceId, accountId: input.accountId, kind: "STATEMENT", status: "OPEN", rolledIntoStatementId: null, dueDate: { not: null } }, include: { payments: { select: { id: true, date: true, amountCents: true } } }, orderBy: { dueDate: "asc" } });
  const current = local.find(row => row.dueDate!.toISOString().slice(0, 10) >= input.asOfDate) ?? local.at(-1);
  const balanceCents = typeof input.remote.balance === "number" ? Math.round(input.remote.balance * 100) : null;
  if (current && balanceCents !== null && Number.isSafeInteger(balanceCents) && balanceCents >= 0 && balanceCents <= 2147483647 && !validBills.some(bill => bill.dueDate === current.dueDate!.toISOString().slice(0, 10))) {
    const payments = [...current.payments].sort((a, b) => a.id.localeCompare(b.id));
    const paidBeforeSnapshot = payments.filter(payment => payment.date && payment.date.toISOString().slice(0, 10) <= input.asOfDate).reduce((sum, payment) => sum + payment.amountCents, 0);
    if (balanceCents + paidBeforeSnapshot > 2147483647) throw new PluggyError("UNEXPECTED_RESPONSE");
    currentDue = current.dueDate!.toISOString().slice(0, 10);
    validBills.push({ externalId: `account-current:${input.externalAccountId}:${current.id}`, dueDate: currentDue, closingDate: current.closingDate?.toISOString().slice(0, 10) ?? null, totalCents: balanceCents + paidBeforeSnapshot, status: "OPEN", paidOn: null, basis: "ACCOUNT_BALANCE", balanceCents, paymentDigest: createHash("sha256").update(JSON.stringify(payments)).digest("hex"), unknownPayments: payments.some(payment => !payment.date) });
  }
  const reconcile = () => runFinancialImport(input.prisma, db => reconcileCreditBills(db, input.actor, { linkId: input.linkId, accountId: input.accountId, bills: validBills, asOfDate: input.asOfDate, syncFrom: input.syncFrom }));
  const reconciled = await (async () => {
    for (let attempt = 1; ; attempt++) {
      try { return await reconcile(); }
      catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") || attempt >= 3) throw error;
        await new Promise(resolve => setTimeout(resolve, attempt * 150));
      }
    }
  })();
  const normalized = transactions.items.map(transaction => normalizeCreditTransaction(transaction, { timezone: input.timezone, syncFrom: input.syncFrom, bills: validBills, statementIds: reconciled.statementIds, currentDue }));
  return { candidates: normalized.flatMap(row => row ? [row.candidate] : []), fetched: transactions.items.length, outsideWindow: normalized.filter(row => !row).length, needsReview: reconciled.needsReview, newest: normalized.flatMap(row => row ? [row.day] : []).sort().at(-1) ?? null };
}
