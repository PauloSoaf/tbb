import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/prisma", async () => {
  const { PrismaClient } = await import("@prisma/client");
  const url = process.env.FINANCE_PLANNING_TEST_DB_URL;
  if (url && !/^\/tbb_(planning_sprint_qa|planning_test)$/.test(new URL(url).pathname)) throw Error("Disposable database required");
  return { prisma: new PrismaClient({ datasourceUrl: url ?? "postgresql://test:test@localhost:1/tbb_planning_test" }) };
});
import { prisma } from "@/lib/prisma";
import { financeSummary } from "@/features/finance/queries";
import { confirmFinancialEvidence, previewFinancialEvidence, reviewEvidenceCandidate, runFinancialImport } from "@/features/finance/document-import";
import { candidateSchema } from "@/features/finance/import-candidates";
import { addConnection } from "../connections";
import { configureAllAccounts, syncEverything } from "../setup";
import { latestCreditBills } from "../credit-bills";
import type { PluggyAccount, PluggyTransaction, PluggyBill } from "../pluggy-schemas";
import type { PluggyClient } from "../pluggy-client";

const NOW = new Date("2032-10-20T16:00:00Z"), DUE = "2032-11-03";
describe.skipIf(!process.env.FINANCE_PLANNING_TEST_DB_URL)("default full-history setup", () => {
  let actor: { workspaceId: string; userId: string; role: string }, connectionId: string, bankId: string, cardId: string, statementId: string;
  let products: PluggyAccount[], transactions: Record<string, PluggyTransaction[]>, bills: PluggyBill[], calls: { id: string; dateFrom?: string }[];
  const client = {
    getItem: async () => ({ id: "synthetic-item", status: "UPDATED", lastUpdatedAt: NOW.toISOString() }),
    listAccounts: async () => ({ invalid: 0, items: products }),
    listTransactions: async (id: string, filter: { dateFrom?: string } = {}) => { calls.push({ id, ...filter }); return { invalid: 0, pages: 1, items: transactions[id] ?? [] }; },
    listBills: async () => ({ invalid: 0, items: bills }),
  } as unknown as PluggyClient;
  const deps = { prisma, client, now: () => NOW };
  const ledger = () => prisma.financeTransaction.findMany({ where: { workspaceId: actor.workspaceId }, orderBy: { id: "asc" } });
  const cash = async () => (await financeSummary(actor.workspaceId, "2032-10-20")).accounts.find(row => row.id === bankId)!.balanceCents;
  beforeEach(async () => {
    const key = randomUUID();
    const user = await prisma.user.create({ data: { email: `history-${key}@example.invalid`, name: "Synthetic history", passwordHash: "test" } });
    const workspace = await prisma.workspace.create({ data: { name: "Synthetic history", slug: `history-${key}`, timezone: "America/Manaus", memberships: { create: { userId: user.id, role: "OWNER" } } } });
    actor = { workspaceId: workspace.id, userId: user.id, role: "OWNER" };
    bankId = (await prisma.account.create({ data: { workspaceId: workspace.id, name: "Nubank", institution: "Nubank", type: "CHECKING", initialBalanceCents: 100000 } })).id;
    cardId = (await prisma.account.create({ data: { workspaceId: workspace.id, name: "Nubank crédito", institution: "Nubank", type: "CREDIT_CARD" } })).id;
    statementId = (await prisma.cardStatement.create({ data: { workspaceId: workspace.id, accountId: cardId, kind: "STATEMENT", status: "OPEN", amountCents: 10000, dueDate: new Date(DUE), closingDate: new Date("2032-10-26"), periodKey: `due:${DUE}`, externalKey: randomUUID(), sourceRecordType: "CURRENT_STATEMENT", sourceAsOf: new Date("2032-10-01") } })).id;
    await prisma.financeTransaction.create({ data: { workspaceId: workspace.id, accountId: bankId, type: "ADJUSTMENT", amountCents: 0, date: new Date("2032-10-10"), source: "BALANCE_RECONCILIATION", description: "Confirmed cash checkpoint", isConsumption: false } });
    connectionId = await addConnection(prisma, actor, { itemId: randomUUID(), label: "Nubank" });
    products = [{ id: "bank", name: "Conta Nubank", type: "BANK", currencyCode: "BRL", balance: 995 }, { id: "card", name: "Nubank cartão", type: "CREDIT", currencyCode: "BRL", creditData: { balanceDueDate: DUE, balanceCloseDate: "2032-10-26" } }];
    transactions = { bank: [
      { id: "old-purchase", description: "Old synthetic purchase", amount: 10, type: "DEBIT", status: "POSTED", currencyCode: "BRL", date: "2032-10-01" },
      { id: "new-purchase", description: "New synthetic purchase", amount: 5, type: "DEBIT", status: "POSTED", currencyCode: "BRL", date: "2032-10-15" },
    ], card: [] };
    bills = [{ id: "current", dueDate: DUE, billClosingDate: "2032-10-26", totalAmount: 100, totalAmountCurrencyCode: "BRL" }]; calls = [];
  }, 30000);
  afterAll(async () => { await prisma.$disconnect(); });

  it("reuses existing accounts, imports the earliest available data, and preserves the confirmed cash checkpoint", async () => {
    const before = await prisma.account.findMany({ where: { workspaceId: actor.workspaceId }, orderBy: { id: "asc" } });
    expect(await syncEverything(deps, actor, connectionId)).toMatchObject({ status: "SUCCESS", configured: 2, created: 0, autoCreated: 2 });
    expect(calls.every(call => !call.dateFrom)).toBe(true);
    expect(await prisma.account.findMany({ where: { workspaceId: actor.workspaceId }, orderBy: { id: "asc" } })).toEqual(before);
    expect(await cash()).toBe(99500);
    expect((await ledger()).filter(row => row.source === "OPEN_FINANCE_HISTORY")).toMatchObject([{ amountCents: 1000, isConsumption: false }]);
    const count = (await ledger()).length;
    expect(await syncEverything(deps, actor, connectionId)).toMatchObject({ status: "SUCCESS", created: 0, autoCreated: 0 });
    expect(await ledger()).toHaveLength(count);
    expect(await cash()).toBe(99500);
  });

  it("clears an old date cursor when expanding a previously limited link", async () => {
    await configureAllAccounts(deps, actor, connectionId);
    await prisma.openFinanceAccountLink.updateMany({ where: { connectionId, kind: "BANK" }, data: { syncFromDate: new Date("2032-10-19"), lastTransactionDate: new Date("2032-10-20") } });
    await syncEverything(deps, actor, connectionId);
    expect(calls.find(call => call.id === "bank")?.dateFrom).toBeUndefined();
    expect((await prisma.openFinanceAccountLink.findFirstOrThrow({ where: { connectionId, kind: "BANK" } })).syncFromDate).toBeNull();
    expect((await ledger()).some(row => row.description === "Old synthetic purchase")).toBe(true);
    expect(await cash()).toBe(99500);
  });

  it("does not let a default discovery date override an earlier explicit cash checkpoint", async () => {
    await prisma.openFinanceAccountLink.create({ data: { workspaceId: actor.workspaceId, connectionId, externalAccountId: "bank", kind: "BANK", displayName: "Conta descoberta", syncFromDate: new Date("2032-10-20"), isEnabled: false } });
    expect(await syncEverything(deps, actor, connectionId)).toMatchObject({ status: "SUCCESS" });
    expect(await cash()).toBe(99500);
    expect((await ledger()).filter(row => row.source === "OPEN_FINANCE_HISTORY")).toMatchObject([{ amountCents: 1000 }]);
  });

  it("preserves the cash checkpoint when historical evidence is confirmed later by the owner", async () => {
    transactions.bank[0].type = undefined;
    transactions.bank[0].amount = -10;
    expect(await syncEverything(deps, actor, connectionId)).toMatchObject({ status: "SUCCESS", autoCreated: 1 });
    const pending = await prisma.financialEvidence.findFirstOrThrow({ where: { workspaceId: actor.workspaceId, decision: "NEEDS_REVIEW" } });
    const before = await cash();
    await runFinancialImport(prisma, async db => {
      await reviewEvidenceCandidate(db, actor, pending.id, { ...candidateSchema.parse(pending.candidate), confidence: "CONFIRMED", problems: [] }, pending.version);
      const preview = await previewFinancialEvidence(db, actor, [pending.sourceId]);
      await confirmFinancialEvidence(db, actor, [pending.sourceId], preview.token, [{ id: pending.id, action: "CREATE" }]);
    });
    expect(await cash()).toBe(before);
    expect((await ledger()).filter(row => row.source === "OPEN_FINANCE_HISTORY")).toHaveLength(1);
  });

  it("creates a missing cash account once and preserves the bank opening snapshot while backfilling", async () => {
    await prisma.account.update({ where: { id: bankId }, data: { isArchived: true } });
    expect(await syncEverything(deps, actor, connectionId)).toMatchObject({ status: "SUCCESS", created: 1 });
    const link = await prisma.openFinanceAccountLink.findFirstOrThrow({ where: { connectionId, kind: "BANK" } });
    const summary = await financeSummary(actor.workspaceId, "2032-10-20");
    expect(summary.accounts.find(row => row.id === link.accountId)?.balanceCents).toBe(99500);
    expect(await syncEverything(deps, actor, connectionId)).toMatchObject({ created: 0, autoCreated: 0 });
  });

  it("does not guess which legacy card represents several remote cards", async () => {
    products.push({ ...products[1], id: "card-two", name: "Outro Nubank cartão" });
    const result = await configureAllAccounts(deps, actor, connectionId);
    expect(result).toMatchObject({ configured: 1, created: 0, unresolved: 2 });
    expect(await prisma.account.count({ where: { workspaceId: actor.workspaceId } })).toBe(2);
  });

  it("scheduled setup respects a disabled link and a custom date chosen in advanced settings", async () => {
    await configureAllAccounts(deps, actor, connectionId);
    await prisma.openFinanceAccountLink.updateMany({ where: { connectionId, kind: "BANK" }, data: { isEnabled: false, syncFromDate: new Date("2032-10-17") } });
    await configureAllAccounts(deps, actor, connectionId, false);
    expect(await prisma.openFinanceAccountLink.findFirst({ where: { connectionId, kind: "BANK" } })).toMatchObject({ isEnabled: false, syncFromDate: new Date("2032-10-17") });
  });

  it("full sync reconciles a proven current balance once without fabricating or duplicating payments", async () => {
    bills = []; products[1].balance = 90;
    await prisma.cardStatementPayment.create({ data: { workspaceId: actor.workspaceId, accountId: cardId, cardStatementId: statementId, amountCents: 2000, date: new Date("2032-10-15"), sourceId: "synthetic-manual", locator: "payment", fingerprint: randomUUID() } });
    expect(await syncEverything(deps, actor, connectionId)).toMatchObject({ status: "SUCCESS" });
    expect(await prisma.cardStatement.findUnique({ where: { id: statementId } })).toMatchObject({ amountCents: 11000, status: "OPEN" });
    expect((await latestCreditBills(prisma, actor.workspaceId)).filter(row => row.kind === "OPEN_FINANCE_BILL_REVIEW")).toHaveLength(0);
    expect(await prisma.cardStatementPayment.count({ where: { workspaceId: actor.workspaceId } })).toBe(1);
    expect(await syncEverything(deps, actor, connectionId)).toMatchObject({ status: "SUCCESS", autoCreated: 0 });
  });
});
