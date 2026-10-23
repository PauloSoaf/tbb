import { Prisma, type PrismaClient } from "@prisma/client";
import { runFinancialImport, type ImportActor } from "@/features/finance/document-import";
import { billingDay, normalizeCreditBill, normalizeCreditTransaction } from "./credit-normalize";
import { reconcileCreditBills } from "./credit-bills";
import { PluggyError, type PluggyClient } from "./pluggy-client";
import type { PluggyAccount } from "./pluggy-schemas";

export async function prepareCreditSync(input: { prisma: PrismaClient; client: PluggyClient; actor: ImportActor; linkId: string; accountId: string; externalAccountId: string; remote: PluggyAccount; timezone: string; syncFrom: string | null; asOfDate: string }) {
  const [billRows, transactions] = await Promise.all([input.client.listBills(input.externalAccountId), input.client.listTransactions(input.externalAccountId, input.syncFrom ? { dateFrom: input.syncFrom } : {})]);
  let currentDue = billingDay(input.remote.creditData?.balanceDueDate);
  if (currentDue && currentDue < input.asOfDate) currentDue = null;
  const bills = billRows.items.map(bill => normalizeCreditBill(bill, currentDue));
  if (billRows.invalid || transactions.invalid || bills.some(bill => !bill)) throw new PluggyError("UNEXPECTED_RESPONSE");
  const validBills = bills.filter(bill => bill !== null);
  // Meu Pluggy uses Open Finance: Account.balance is the USED CREDIT LIMIT, including
  // future commitments. Only an actual published bill can establish an invoice total.
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
