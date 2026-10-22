import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
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
import { addConnection, mapAccountLink } from "../connections";
import { openFinanceOverview } from "../queries";
import { PluggyError, type PluggyClient } from "../pluggy-client";
import type { PluggyTransaction } from "../pluggy-schemas";
import { syncConnection, syncDueConnections } from "../sync";

const NOW = new Date("2032-10-20T16:00:00Z"), DAY = "2032-10-20", DUE = "2032-11-03", TAX = "00000000000";
type Bank = { name: string; itemId: string; connectionId: string; checkingId: string; cardId: string; statementId: string; transactions: Record<string, PluggyTransaction[]>; billTotal: number };

describe.skipIf(!process.env.FINANCE_PLANNING_TEST_DB_URL)("Nubank, Itaú and PicPay in the same workspace", () => {
  let actor: { workspaceId: string; userId: string; role: string };
  const banks: Bank[] = [];
  let failingCard: string | null = null;
  const client = {
    getItem: async (itemId: string) => ({ id: itemId, status: "UPDATED", lastUpdatedAt: NOW.toISOString(), connector: { name: banks.find(bank => bank.itemId === itemId)!.name } }),
    listAccounts: async (itemId: string) => {
      const bank = banks.find(value => value.itemId === itemId)!;
      return { invalid: 0, items: [
        { id: `${bank.name}-bank`, name: `${bank.name} conta`, type: "BANK", currencyCode: "BRL", balance: 1000, taxNumber: TAX },
        { id: `${bank.name}-card`, name: `${bank.name} cartão`, type: "CREDIT", currencyCode: "BRL", creditData: { balanceDueDate: DUE, balanceCloseDate: "2032-10-26" } },
      ] };
    },
    listTransactions: async (accountId: string) => ({ invalid: 0, pages: 1, items: banks.flatMap(bank => bank.transactions[accountId] ?? []) }),
    listBills: async (accountId: string) => {
      if (accountId === failingCard) throw new PluggyError("PROVIDER_UNAVAILABLE");
      const bank = banks.find(value => accountId === `${value.name}-card`)!;
      return { invalid: 0, items: [{ id: "shared-bill-id", dueDate: DUE, billClosingDate: "2032-10-26", totalAmount: bank.billTotal, totalAmountCurrencyCode: "BRL" }] };
    },
  } as unknown as PluggyClient;
  const sync = (bank: Bank) => syncConnection({ prisma, client, now: () => NOW }, actor, bank.connectionId, "MANUAL");
  const movement = (extra: Partial<PluggyTransaction> = {}): PluggyTransaction => ({ id: "shared-movement-id", providerId: "shared-provider-id", date: DAY, amount: 10, type: "DEBIT", status: "POSTED", currencyCode: "BRL", description: "Synthetic shop", ...extra });

  beforeAll(async () => {
    const key = randomUUID();
    const user = await prisma.user.create({ data: { email: `multi-bank-${key}@example.invalid`, name: "Synthetic multi bank", passwordHash: "test" } });
    const workspace = await prisma.workspace.create({ data: { name: "Synthetic multi bank", slug: `multi-bank-${key}`, timezone: "America/Manaus", memberships: { create: { userId: user.id, role: "OWNER" } } } });
    actor = { workspaceId: workspace.id, userId: user.id, role: "OWNER" };
    for (const name of ["Nubank", "Itaú", "PicPay"]) {
      const checking = await prisma.account.create({ data: { workspaceId: workspace.id, name: `${name} teste conta`, institution: name, type: "CHECKING", initialBalanceCents: 100000 } });
      const card = await prisma.account.create({ data: { workspaceId: workspace.id, name: `${name} teste cartão`, institution: name, type: "CREDIT_CARD" } });
      const statement = await prisma.cardStatement.create({ data: { workspaceId: workspace.id, accountId: card.id, kind: "STATEMENT", status: "OPEN", amountCents: 10000, dueDate: new Date(DUE), closingDate: new Date("2032-10-26"), periodKey: `due:${DUE}`, referenceMonth: "2032-11", externalKey: randomUUID(), sourceRecordType: "CURRENT_STATEMENT", sourceAsOf: new Date("2032-10-01") } });
      const itemId = randomUUID(), connectionId = await addConnection(prisma, actor, { itemId, label: name });
      const bank: Bank = { name, itemId, connectionId, checkingId: checking.id, cardId: card.id, statementId: statement.id, billTotal: 100, transactions: {
        [`${name}-bank`]: [movement()],
        [`${name}-card`]: [movement({ amount: 50, status: "PENDING", creditCardMetadata: { billId: "shared-bill-id" } })],
      } };
      banks.push(bank);
      expect(await sync(bank)).toMatchObject({ status: "SUCCESS", autoCreated: 0 });
      const links = await prisma.openFinanceAccountLink.findMany({ where: { connectionId } });
      for (const link of links) await mapAccountLink(prisma, actor, link.id, { accountId: link.kind === "BANK" ? checking.id : card.id, syncFromDate: "2032-10-01", enabled: true });
    }
  }, 60000);
  afterAll(async () => { await prisma.$disconnect(); });

  it("imports debit and credit into each existing account even when provider ids and due dates coincide", async () => {
    for (const bank of banks) {
      expect(await sync(bank)).toMatchObject({ status: "SUCCESS", autoCreated: 2 });
      const rows = await prisma.financeTransaction.findMany({ where: { workspaceId: actor.workspaceId, accountId: { in: [bank.checkingId, bank.cardId] } } });
      expect(rows).toEqual(expect.arrayContaining([
        expect.objectContaining({ accountId: bank.checkingId, amountCents: 1000, type: "EXPENSE", cardStatementId: null }),
        expect.objectContaining({ accountId: bank.cardId, amountCents: 5000, type: "EXPENSE", cardStatementId: bank.statementId, statementDetailMode: "ALREADY_INCLUDED" }),
      ]));
      expect(await prisma.cardStatement.findUnique({ where: { id: bank.statementId } })).toMatchObject({ amountCents: 10000 });
      expect(await sync(bank)).toMatchObject({ status: "SUCCESS", autoCreated: 0, staged: 0 });
    }
    expect(await prisma.account.count({ where: { workspaceId: actor.workspaceId } })).toBe(6);
    expect(await prisma.cardStatement.count({ where: { workspaceId: actor.workspaceId } })).toBe(3);
    expect(await prisma.financeTransaction.count({ where: { workspaceId: actor.workspaceId } })).toBe(6);
    const summary = await financeSummary(actor.workspaceId, DAY);
    for (const bank of banks) expect(summary.accounts.find(account => account.id === bank.checkingId)?.balanceCents).toBe(99000);
  });

  it("identifies the bank on bill reviews and offers only that card's existing statements", async () => {
    for (const bank of banks) {
      await prisma.cardStatement.update({ where: { id: bank.statementId }, data: { notes: "Manual review requested" } });
      bank.billTotal = 110;
      expect(await sync(bank)).toMatchObject({ status: "SUCCESS", needsReview: 1 });
    }
    const overview = await openFinanceOverview(prisma, actor.workspaceId);
    expect(overview.creditReviews).toHaveLength(3);
    for (const bank of banks) {
      const review = overview.creditReviews.find(row => row.connectionLabel === bank.name)!;
      expect(review.accountName).toBe(`${bank.name} cartão`);
      expect(review.statements.map(row => row.id)).toEqual([bank.statementId]);
    }
  });

  it("keeps a registered PIX between connected banks from becoming another expense or income", async () => {
    const [from, to] = banks;
    await prisma.financeTransaction.create({ data: { workspaceId: actor.workspaceId, accountId: from.checkingId, destinationAccountId: to.checkingId, type: "TRANSFER", description: "Transferência própria teste", amountCents: 2000, date: new Date(DAY) } });
    from.transactions[`${from.name}-bank`].push(movement({ id: "own-pix-out", providerId: "own-pix-out", amount: 20, description: "PIX enviado", paymentData: { receiver: { documentNumber: { value: TAX } } } }));
    to.transactions[`${to.name}-bank`].push(movement({ id: "own-pix-in", providerId: "own-pix-in", amount: -20, type: "CREDIT", description: "PIX recebido", paymentData: { payer: { documentNumber: { value: TAX } } } }));
    for (const bank of [from, to]) {
      expect(await sync(bank)).toMatchObject({ status: "SUCCESS", autoCreated: 0 });
      expect(await sync(bank)).toMatchObject({ status: "SUCCESS", staged: 0 });
    }
    expect(await prisma.financeTransaction.count({ where: { workspaceId: actor.workspaceId } })).toBe(7);
    const summary = await financeSummary(actor.workspaceId, DAY);
    expect(summary.accounts.find(account => account.id === from.checkingId)?.balanceCents).toBe(97000);
    expect(summary.accounts.find(account => account.id === to.checkingId)?.balanceCents).toBe(101000);
  });

  it("continues syncing other banks when one card provider fails", async () => {
    failingCard = "Itaú-card";
    const results = await syncDueConnections({ prisma, client, now: () => NOW }, "MANUAL", { workspaceId: actor.workspaceId });
    expect(results.filter(result => result.status === "SUCCESS")).toHaveLength(2);
    expect(results.filter(result => result.status === "PARTIAL" && result.errorCode === "PROVIDER_UNAVAILABLE")).toHaveLength(1);
    failingCard = null;
    expect(await sync(banks[1])).toMatchObject({ status: "SUCCESS", autoCreated: 0 });
  });
});
