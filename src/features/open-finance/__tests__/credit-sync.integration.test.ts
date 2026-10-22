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
import { addConnection, mapAccountLink } from "../connections";
import { approveCreditBill, latestCreditBills } from "../credit-bills";
import { syncConnection } from "../sync";
import type { PluggyClient } from "../pluggy-client";
import type { PluggyBill, PluggyTransaction } from "../pluggy-schemas";

const NOW = new Date("2032-10-21T16:00:00Z"), DUE = "2032-11-03";
const bill = (extra: Partial<PluggyBill> = {}): PluggyBill => ({ id: "provider-current", dueDate: DUE, billClosingDate: "2032-10-26", totalAmount: 100, totalAmountCurrencyCode: "BRL", ...extra });
const purchase = (extra: Partial<PluggyTransaction> = {}): PluggyTransaction => ({ id: "provider-purchase", accountId: "remote-card", date: "2032-10-20T00:00:00Z", description: "Mercado teste", amount: 10, currencyCode: "BRL", type: "DEBIT", status: "PENDING", creditCardMetadata: { billId: "provider-current" }, ...extra });

describe.skipIf(!process.env.FINANCE_PLANNING_TEST_DB_URL)("credit sync against disposable PostgreSQL", () => {
  let actor: { workspaceId: string; userId: string; role: string }, cardId: string, checkingId: string, statementId: string, connectionId: string, linkId: string;
  let bills: PluggyBill[], transactions: PluggyTransaction[], accountBalance: number | undefined;
  const client = {
    getItem: async () => ({ id: "item", status: "UPDATED", lastUpdatedAt: NOW.toISOString() }),
    listAccounts: async () => ({ items: [{ id: "remote-card", type: "CREDIT", subtype: "CREDIT_CARD", currencyCode: "BRL", balance: accountBalance, name: "Synthetic card", creditData: { balanceDueDate: DUE, balanceCloseDate: "2032-10-26" } }], invalid: 0 }),
    listBills: async () => ({ items: bills, invalid: 0 }),
    listTransactions: async () => ({ items: transactions, invalid: 0, pages: 1 }),
  } as unknown as PluggyClient;
  const sync = () => syncConnection({ prisma, client, now: () => NOW }, actor, connectionId, "MANUAL");
  const statement = () => prisma.cardStatement.findUniqueOrThrow({ where: { id: statementId } });
  const ledger = () => prisma.financeTransaction.findMany({ where: { workspaceId: actor.workspaceId, accountId: cardId }, orderBy: { id: "asc" } });
  const reviews = async () => (await latestCreditBills(prisma, actor.workspaceId, cardId)).filter(row => row.kind === "OPEN_FINANCE_BILL_REVIEW");
  beforeEach(async () => {
    const key = randomUUID();
    const user = await prisma.user.create({ data: { email: `credit-${key}@example.invalid`, name: "Synthetic credit owner", passwordHash: "test" } });
    const space = await prisma.workspace.create({ data: { name: "Synthetic credit", slug: `credit-${key}`, timezone: "America/Manaus", memberships: { create: { userId: user.id, role: "OWNER" } } } });
    actor = { workspaceId: space.id, userId: user.id, role: "OWNER" };
    cardId = (await prisma.account.create({ data: { workspaceId: space.id, name: "Synthetic card", type: "CREDIT_CARD" } })).id;
    checkingId = (await prisma.account.create({ data: { workspaceId: space.id, name: "Synthetic bank", type: "CHECKING", initialBalanceCents: 100000 } })).id;
    statementId = (await prisma.cardStatement.create({ data: { workspaceId: space.id, accountId: cardId, kind: "STATEMENT", status: "OPEN", amountCents: 10000, periodKey: `due:${DUE}`, externalKey: `manual-${key}`, dueDate: new Date(DUE), closingDate: new Date("2032-10-26"), referenceMonth: "2032-11", sourceRecordType: "CURRENT_STATEMENT", sourceAsOf: new Date("2032-10-10"), notes: "Preserve this manual note" } })).id;
    bills = [bill()]; transactions = []; accountBalance = undefined;
    connectionId = await addConnection(prisma, actor, { itemId: randomUUID(), label: "Synthetic credit" });
    await sync();
    linkId = (await prisma.openFinanceAccountLink.findFirstOrThrow({ where: { connectionId } })).id;
    await mapAccountLink(prisma, actor, linkId, { accountId: cardId, syncFromDate: "2032-10-01", enabled: true });
  }, 30000);
  afterAll(async () => { await prisma.$disconnect(); });

  it("requires a real credit account, a start date, and owner authorization", async () => {
    await expect(mapAccountLink(prisma, actor, linkId, { accountId: checkingId, syncFromDate: "2032-10-01", enabled: true })).rejects.toThrow("cartões");
    await expect(mapAccountLink(prisma, actor, linkId, { accountId: cardId, syncFromDate: null, enabled: true })).rejects.toThrow("data inicial");
    await expect(syncConnection({ prisma, client }, { ...actor, role: "MEMBER" }, connectionId, "MANUAL")).rejects.toThrow("titular");
  });

  it("reuses the manual bill and imports pending purchases as already included, then replays without duplicates", async () => {
    transactions = [purchase()];
    expect(await sync()).toMatchObject({ status: "SUCCESS", autoCreated: 1 });
    expect(await prisma.cardStatement.count({ where: { workspaceId: actor.workspaceId } })).toBe(1);
    expect(await statement()).toMatchObject({ id: statementId, amountCents: 10000, notes: "Preserve this manual note" });
    expect(await ledger()).toMatchObject([{ amountCents: 1000, cardStatementId: statementId, statementDetailMode: "ALREADY_INCLUDED", type: "EXPENSE" }]);
    expect(await sync()).toMatchObject({ status: "SUCCESS", autoCreated: 0, staged: 0 });
    expect(await prisma.financeTransaction.count({ where: { workspaceId: actor.workspaceId, accountId: checkingId } })).toBe(0);
  });

  it("refreshes a managed bill total once while keeping its existing detail and id", async () => {
    transactions = [purchase()]; expect(await sync()).toMatchObject({ status: "SUCCESS", autoCreated: 1 });
    bills = [bill({ totalAmount: 120 })];
    transactions.push(purchase({ id: "second", amount: 20, description: "Another shop" }));
    expect(await sync()).toMatchObject({ status: "SUCCESS", autoCreated: 1 });
    expect(await statement()).toMatchObject({ id: statementId, amountCents: 12000, source: "OPEN_FINANCE" });
    expect((await ledger()).reduce((sum, row) => sum + row.amountCents, 0)).toBe(3000);
  });

  it("advances a known future bill to open even when its amount is unchanged", async () => {
    await prisma.cardStatement.update({ where: { id: statementId }, data: { status: "FUTURE_KNOWN", sourceRecordType: "FUTURE_STATEMENT" } });
    expect(await sync()).toMatchObject({ status: "SUCCESS", needsReview: 0 });
    expect(await statement()).toMatchObject({ id: statementId, status: "OPEN", sourceRecordType: "CURRENT_STATEMENT", amountCents: 10000 });
    expect(await prisma.cardStatement.count({ where: { workspaceId: actor.workspaceId } })).toBe(1);
  });

  it("protects manual changes, offers an explicit reconciliation and preserves user notes", async () => {
    await sync();
    await prisma.cardStatement.update({ where: { id: statementId }, data: { notes: "User changed this" } });
    bills = [bill({ totalAmount: 130 })]; transactions = [purchase()];
    expect(await sync()).toMatchObject({ status: "SUCCESS", autoCreated: 0 });
    expect((await statement()).amountCents).toBe(10000);
    const [review] = await reviews(), current = await statement();
    await approveCreditBill(prisma, actor, { snapshotId: review.id, statementId, statementVersion: current.updatedAt.toISOString(), status: "OPEN", confirmed: true });
    expect(await statement()).toMatchObject({ amountCents: 13000, notes: "User changed this" });
    expect(await sync()).toMatchObject({ status: "SUCCESS", autoCreated: 1 });
    expect(await reviews()).toHaveLength(0);
    expect(await ledger()).toHaveLength(1);
  });

  it("subtracts manually added detail from the stored base so the bank total is counted once", async () => {
    await prisma.financeTransaction.create({ data: { workspaceId: actor.workspaceId, accountId: cardId, type: "EXPENSE", description: "Manual extra", amountCents: 2000, date: new Date("2032-10-10"), cardStatementId: statementId, statementDetailMode: "ADDED_TO_STATEMENT" } });
    bills = [bill({ totalAmount: 120 })]; await sync();
    bills = [bill({ totalAmount: 130 })]; await sync();
    expect((await statement()).amountCents).toBe(11000);
    expect((await ledger())[0].amountCents).toBe(2000);
    expect((await statement()).amountCents + (await ledger())[0].amountCents).toBe(13000);
  });

  it("keeps card payments separate from expenses and leaves existing payments untouched", async () => {
    await prisma.cardStatementPayment.create({ data: { workspaceId: actor.workspaceId, accountId: cardId, cardStatementId: statementId, amountCents: 5000, date: new Date("2032-10-15"), fingerprint: randomUUID(), sourceId: "manual", locator: "manual-payment" } });
    transactions = [purchase({ id: "payment", description: "Pagamento recebido", operationType: "PAGAMENTO_FATURA", type: "CREDIT", amount: -50 })];
    expect(await sync()).toMatchObject({ status: "SUCCESS", autoCreated: 0, needsReview: 1 });
    expect(await ledger()).toHaveLength(0);
    expect(await prisma.cardStatementPayment.count({ where: { workspaceId: actor.workspaceId } })).toBe(1);
    expect((await statement()).status).toBe("OPEN");
  });

  it("does not overwrite or reopen a paid bill", async () => {
    await prisma.cardStatement.update({ where: { id: statementId }, data: { status: "PAID", paidAt: new Date("2032-10-20") } });
    expect(await sync()).toMatchObject({ autoCreated: 0, needsReview: 1 });
    expect((await statement()).status).toBe("PAID");
    const [review] = await reviews();
    await expect(approveCreditBill(prisma, actor, { snapshotId: review.id, statementId, statementVersion: (await statement()).updatedAt.toISOString(), status: "OPEN", confirmed: true })).rejects.toThrow("quitada");
  });

  it("replays a locally paid historical bill with unknown bank status without changing its metadata", async () => {
    await prisma.cardStatement.update({ where: { id: statementId }, data: { status: "PAID", paidAt: new Date("2032-09-03"), dueDate: new Date("2032-09-03"), closingDate: null, referenceMonth: "2032-09", periodKey: "due:2032-09-03" } });
    bills = [bill({ dueDate: "2032-09-03", billClosingDate: "2032-08-26" })];
    const before = await statement();
    expect(await sync()).toMatchObject({ status: "SUCCESS", needsReview: 0 });
    expect(await sync()).toMatchObject({ status: "SUCCESS", needsReview: 0, autoCreated: 0 });
    expect(await statement()).toEqual(before);
  });

  it("keeps paid history dates unchanged even when a later snapshot supplies additional metadata", async () => {
    await prisma.cardStatement.update({ where: { id: statementId }, data: { status: "PAID", paidAt: new Date("2032-09-03"), dueDate: new Date("2032-09-03"), closingDate: null, referenceMonth: "2032-09", periodKey: "due:2032-09-03" } });
    bills = [bill({ dueDate: "2032-09-03", billClosingDate: "2032-08-26", payments: [{ amount: 100, paymentDate: "2032-09-02", currencyCode: "BRL" }] })];
    const before = await statement();
    expect(await sync()).toMatchObject({ status: "SUCCESS", needsReview: 0 });
    expect(await sync()).toMatchObject({ status: "SUCCESS", needsReview: 0, autoCreated: 0 });
    expect(await statement()).toEqual(before);
  });

  it("promotes an existing forecast instead of creating a second future bill", async () => {
    const future = await prisma.cardStatement.create({ data: { workspaceId: actor.workspaceId, accountId: cardId, kind: "MONTHLY_PROJECTION", status: "FORECAST", amountCents: 8000, externalKey: randomUUID(), periodKey: "month:2032-12", referenceMonth: "2032-12", sourceRecordType: "MONTHLY_PROJECTION", sourceAsOf: new Date("2032-10-10") } });
    bills.push(bill({ id: "future", dueDate: "2032-12-03", billClosingDate: "2032-11-26", totalAmount: 75 }));
    expect((await sync()).status).toBe("SUCCESS");
    expect(await prisma.cardStatement.findUnique({ where: { id: future.id } })).toMatchObject({ kind: "STATEMENT", status: "FUTURE_KNOWN", amountCents: 7500 });
    expect(await prisma.cardStatement.count({ where: { workspaceId: actor.workspaceId } })).toBe(2);
  });

  it("keeps an unproven pending installment for review and imports it when the bank supplies its bill", async () => {
    transactions = [purchase({ date: "2032-12-20", creditCardMetadata: { installmentNumber: 3, totalInstallments: 4 } })];
    expect(await sync()).toMatchObject({ autoCreated: 0, needsReview: 1 });
    bills.push(bill({ id: "future", dueDate: "2033-01-03", billClosingDate: "2032-12-26", totalAmount: 10 }));
    transactions = [purchase({ date: "2032-12-20", creditCardMetadata: { billId: "future", installmentNumber: 3, totalInstallments: 4 } })];
    expect(await sync()).toMatchObject({ autoCreated: 1 });
    expect(await ledger()).toMatchObject([{ amountCents: 1000, installmentNumber: 3, installmentTotal: 4 }]);
    expect(await prisma.financialEvidence.count({ where: { workspaceId: actor.workspaceId, decision: "NEEDS_REVIEW" } })).toBe(0);
  });

  it("sends changed provider amounts to review instead of rewriting an imported purchase", async () => {
    transactions = [purchase()]; await sync();
    transactions = [purchase({ amount: 12 })];
    expect(await sync()).toMatchObject({ autoCreated: 0, needsReview: 1 });
    expect((await ledger())[0].amountCents).toBe(1000);
    expect(await sync()).toMatchObject({ autoCreated: 0, staged: 0 });
  });

  it("rejects a stale review and cannot map another workspace's statement", async () => {
    bills = [bill({ totalAmount: 110 })]; await sync();
    const [review] = await reviews(), originalVersion = (await statement()).updatedAt.toISOString();
    await prisma.cardStatement.update({ where: { id: statementId }, data: { notes: "Changed after preview" } });
    await expect(approveCreditBill(prisma, actor, { snapshotId: review.id, statementId, statementVersion: originalVersion, status: "OPEN", confirmed: true })).rejects.toThrow("mudou");
    await expect(approveCreditBill(prisma, actor, { snapshotId: review.id, statementId: "other-workspace-statement", statementVersion: originalVersion, status: "OPEN", confirmed: true })).rejects.toThrow("mudou");
  });

  it("protects manually added purchases made after a managed snapshot", async () => {
    expect((await sync()).status).toBe("SUCCESS");
    await prisma.financeTransaction.create({ data: { workspaceId: actor.workspaceId, accountId: cardId, type: "EXPENSE", description: "New manual purchase", amountCents: 1500, date: new Date("2032-10-21"), cardStatementId: statementId, statementDetailMode: "ADDED_TO_STATEMENT" } });
    bills = [bill({ totalAmount: 130 })];
    expect(await sync()).toMatchObject({ status: "SUCCESS", needsReview: 1 });
    expect((await statement()).amountCents).toBe(10000);
    const [review] = await reviews();
    await approveCreditBill(prisma, actor, { snapshotId: review.id, statementId, statementVersion: (await statement()).updatedAt.toISOString(), status: "OPEN", confirmed: true });
    expect((await statement()).amountCents).toBe(11500);
    expect((await ledger())[0].amountCents).toBe(1500);
  });

  it("requires the payment workflow when the bank reports a newly paid bill", async () => {
    bills = [bill({ payments: [{ amount: 100, paymentDate: "2032-10-20", currencyCode: "BRL" }] })];
    expect(await sync()).toMatchObject({ status: "SUCCESS", needsReview: 1 });
    const [review] = await reviews();
    await expect(approveCreditBill(prisma, actor, { snapshotId: review.id, statementId, statementVersion: (await statement()).updatedAt.toISOString(), status: "PAID", confirmed: true })).rejects.toThrow("fluxo de pagamento");
    expect((await statement()).status).toBe("OPEN");
    expect(await prisma.cardStatementPayment.count({ where: { workspaceId: actor.workspaceId } })).toBe(0);
  });

  it("does not duplicate a same-month bill whose bank due date differs", async () => {
    bills = [bill({ dueDate: "2032-11-04" })];
    expect(await sync()).toMatchObject({ status: "SUCCESS", needsReview: 1 });
    expect(await prisma.cardStatement.count({ where: { workspaceId: actor.workspaceId } })).toBe(1);
    const [review] = await reviews();
    await approveCreditBill(prisma, actor, { snapshotId: review.id, statementId, statementVersion: (await statement()).updatedAt.toISOString(), status: "OPEN", confirmed: true });
    expect((await statement()).dueDate?.toISOString().slice(0, 10)).toBe("2032-11-04");
    expect(await sync()).toMatchObject({ status: "SUCCESS", needsReview: 0 });
  });

  it("holds a manual date mismatch for review, and refreshes dates after a proven managed match", async () => {
    await prisma.cardStatement.update({ where: { id: statementId }, data: { closingDate: new Date("2032-10-25") } });
    expect(await sync()).toMatchObject({ status: "SUCCESS", needsReview: 1 });
    const [review] = await reviews();
    await approveCreditBill(prisma, actor, { snapshotId: review.id, statementId, statementVersion: (await statement()).updatedAt.toISOString(), status: "OPEN", confirmed: true });
    bills = [bill({ billClosingDate: "2032-10-27" })];
    expect(await sync()).toMatchObject({ status: "SUCCESS", needsReview: 0 });
    expect((await statement()).closingDate?.toISOString().slice(0, 10)).toBe("2032-10-27");
  });

  it("never replaces a newer statement with an older bank snapshot", async () => {
    await prisma.cardStatement.update({ where: { id: statementId }, data: { sourceAsOf: new Date("2032-10-22") } });
    expect(await sync()).toMatchObject({ status: "SUCCESS", needsReview: 1 });
    const [review] = await reviews();
    await expect(approveCreditBill(prisma, actor, { snapshotId: review.id, statementId, statementVersion: (await statement()).updatedAt.toISOString(), status: "OPEN", confirmed: true })).rejects.toThrow("anterior");
    expect((await statement()).sourceAsOf.toISOString().slice(0, 10)).toBe("2032-10-22");
  });

  it("fails a malformed bill before touching the existing financial records", async () => {
    bills = [bill({ totalAmountCurrencyCode: "USD" })];
    expect(await sync()).toMatchObject({ status: "PARTIAL", errorCode: "UNEXPECTED_RESPONSE", autoCreated: 0 });
    expect((await statement()).amountCents).toBe(10000);
    expect(await ledger()).toHaveLength(0);
    expect(await prisma.financialSnapshot.count({ where: { workspaceId: actor.workspaceId } })).toBe(0);
  });

  it("reconciles the current account balance explicitly and counts recorded payments once", async () => {
    await prisma.cardStatementPayment.create({ data: { workspaceId: actor.workspaceId, accountId: cardId, cardStatementId: statementId, amountCents: 2000, date: new Date("2032-10-15"), fingerprint: randomUUID(), sourceId: "manual", locator: "manual-payment" } });
    bills = []; accountBalance = 80;
    expect(await sync()).toMatchObject({ status: "SUCCESS", needsReview: 1 });
    const [review] = await reviews();
    expect(review.data.bill).toMatchObject({ basis: "ACCOUNT_BALANCE", balanceCents: 8000, totalCents: 10000 });
    await approveCreditBill(prisma, actor, { snapshotId: review.id, statementId, statementVersion: (await statement()).updatedAt.toISOString(), status: "OPEN", confirmed: true });
    expect((await statement()).amountCents).toBe(10000);
    accountBalance = 90;
    expect(await sync()).toMatchObject({ status: "SUCCESS", needsReview: 0 });
    expect((await statement()).amountCents).toBe(11000);
    expect(await prisma.cardStatementPayment.aggregate({ where: { workspaceId: actor.workspaceId }, _sum: { amountCents: true } })).toMatchObject({ _sum: { amountCents: 2000 } });
    expect((await statement()).amountCents - 2000).toBe(9000);
  });

  it("keeps a current balance with unknown payment dates in review", async () => {
    await prisma.cardStatementPayment.create({ data: { workspaceId: actor.workspaceId, accountId: cardId, cardStatementId: statementId, amountCents: 2000, date: null, origin: "MANUAL_VERIFIED", fingerprint: randomUUID(), sourceId: "manual", locator: "unknown-payment" } });
    bills = []; accountBalance = 80;
    expect(await sync()).toMatchObject({ status: "SUCCESS", needsReview: 1 });
    const [review] = await reviews();
    await expect(approveCreditBill(prisma, actor, { snapshotId: review.id, statementId, statementVersion: (await statement()).updatedAt.toISOString(), status: "OPEN", confirmed: true })).rejects.toThrow("datas dos pagamentos");
    expect((await statement()).amountCents).toBe(10000);
  });

  it("rejects a current-balance approval if payments changed after the preview", async () => {
    bills = []; accountBalance = 80; await sync();
    const [review] = await reviews(), version = (await statement()).updatedAt.toISOString();
    await prisma.cardStatementPayment.create({ data: { workspaceId: actor.workspaceId, accountId: cardId, cardStatementId: statementId, amountCents: 2000, date: new Date("2032-10-15"), fingerprint: randomUUID(), sourceId: "manual", locator: "late-recorded-payment" } });
    await expect(approveCreditBill(prisma, actor, { snapshotId: review.id, statementId, statementVersion: version, status: "OPEN", confirmed: true })).rejects.toThrow("pagamentos mudaram");
  });

  it("keeps existing overdue bills visible even when the purchase window starts later", async () => {
    await prisma.cardStatement.update({ where: { id: statementId }, data: { dueDate: new Date("2032-09-03"), closingDate: new Date("2032-08-26"), referenceMonth: "2032-09", periodKey: "due:2032-09-03" } });
    bills = [bill({ dueDate: "2032-09-03", billClosingDate: "2032-08-26" })];
    expect(await sync()).toMatchObject({ status: "SUCCESS", needsReview: 1 });
    expect((await reviews())[0].data.statementId).toBe(statementId);
    expect((await statement()).status).toBe("OPEN");
  });

  it("scopes an individual-card sync to an active link of this connection", async () => {
    transactions = [purchase()];
    expect(await syncConnection({ prisma, client, now: () => NOW, accountLinkId: linkId }, actor, connectionId, "MANUAL")).toMatchObject({ status: "SUCCESS", autoCreated: 1 });
    expect(await syncConnection({ prisma, client, now: () => NOW, accountLinkId: "unrelated-link" }, actor, connectionId, "MANUAL")).toMatchObject({ status: "ERROR" });
    expect(await ledger()).toHaveLength(1);
  });
});
