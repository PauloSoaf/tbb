import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/prisma", async () => {
  const { PrismaClient } = await import("@prisma/client");
  const url = process.env.FINANCE_PLANNING_TEST_DB_URL;
  if (url && !/^\/tbb_(planning_sprint_qa|planning_test)$/.test(new URL(url).pathname)) throw new Error("Explicit disposable planning database required");
  return { prisma: new PrismaClient({ datasourceUrl: url ?? "postgresql://test:test@localhost:1/tbb_planning_test" }) };
});
import { prisma } from "@/lib/prisma";
import { financeSummary } from "@/features/finance/queries";
import { addConnection, mapAccountLink, MAX_CONNECTIONS, removeConnection, setConnectionPaused } from "../connections";
import { PluggyError, type PluggyClient } from "../pluggy-client";
import { syncConnection, syncDueConnections, type SyncSummary } from "../sync";

const NOW = new Date("2032-10-15T16:00:00Z"), TODAY = "2032-10-15";
const OWNER_TAX = "12345678909";
type Tx = Record<string, unknown>;
const state = {
  item: { id: "item", status: "UPDATED", connector: { name: "Synthetic Bank" }, consentExpiresAt: null, nextAutoSyncAt: "2032-10-16T10:00:00.000Z" } as Record<string, unknown>,
  accounts: [] as Record<string, unknown>[],
  transactions: {} as Record<string, Tx[]>,
  calls: [] as { id: string; dateFrom?: string }[],
  itemError: null as PluggyError | null,
  delayMs: 0,
};
const client = {
  getItem: async () => { if (state.delayMs) await new Promise((resolve) => setTimeout(resolve, state.delayMs)); if (state.itemError) throw state.itemError; return state.item; },
  listAccounts: async () => ({ items: state.accounts, invalid: 0 }),
  listTransactions: async (id: string, filters: { dateFrom?: string } = {}) => { state.calls.push({ id, ...filters }); return { items: state.transactions[id] ?? [], invalid: 0, pages: 1 }; },
  listBills: async () => ({ items: [], invalid: 0 }),
} as unknown as PluggyClient;
const deps = { prisma, client, now: () => NOW };
const tx = (id: string, extra: Tx = {}): Tx => ({ id, description: "Padaria Central", amount: 12.34, date: "2032-10-12T00:00:00.000Z", type: "DEBIT", status: "POSTED", currencyCode: "BRL", ...extra });

describe.skipIf(!process.env.FINANCE_PLANNING_TEST_DB_URL)("Open Finance sync in disposable PostgreSQL", () => {
  let workspaceId: string, actor: { workspaceId: string; userId: string; role: string }, checking: string, savings: string, connectionId: string;
  const itemId = randomUUID();
  const REMOTE_BANK = "11111111-aaaa-4aaa-8aaa-111111111111", REMOTE_CARD = "22222222-bbbb-4bbb-8bbb-222222222222";
  const balance = async (id: string) => (await financeSummary(workspaceId, TODAY)).accounts.find((row) => row.id === id)!.balanceCents;
  const ledger = () => prisma.financeTransaction.findMany({ where: { workspaceId, accountId: checking, source: "DOCUMENT_V2" }, orderBy: { date: "asc" } });
  const sync = (trigger: "MANUAL" | "CRON" = "MANUAL"): Promise<SyncSummary> => syncConnection(deps, actor, connectionId, trigger);

  beforeAll(async () => {
    const key = randomUUID();
    const user = await prisma.user.create({ data: { email: `open-finance-${key}@example.invalid`, name: "Synthetic open finance", passwordHash: "test-only" } });
    const workspace = await prisma.workspace.create({ data: { name: "Synthetic open finance", slug: `open-finance-${key}`, timezone: "America/Manaus", memberships: { create: { userId: user.id, role: "OWNER" } } } });
    workspaceId = workspace.id; actor = { workspaceId, userId: user.id, role: "OWNER" };
    const make = async (name: string, type: "CHECKING" | "SAVINGS", initialBalanceCents = 0) => (await prisma.account.create({ data: { workspaceId, name, type, initialBalanceCents } })).id;
    checking = await make("Synthetic checking", "CHECKING", 100000); savings = await make("Synthetic savings", "SAVINGS", 50000);
    state.accounts = [
      { id: REMOTE_BANK, type: "BANK", subtype: "CHECKING_ACCOUNT", name: "Conta", marketingName: "Conta Corrente", number: "0001234-5", balance: 100.5, currencyCode: "BRL", taxNumber: OWNER_TAX },
      { id: REMOTE_CARD, type: "CREDIT", subtype: "CREDIT_CARD", name: "Cartão", number: "5555", balance: 300, currencyCode: "BRL", taxNumber: OWNER_TAX },
    ];
  }, 30000);
  afterAll(async () => { await prisma.$disconnect(); });

  describe("connections", () => {
    it("stores the item id encrypted and refuses duplicates, bad ids and non-owners", async () => {
      connectionId = await addConnection(prisma, actor, { itemId, label: "Banco sintético" });
      const row = await prisma.openFinanceConnection.findUniqueOrThrow({ where: { id: connectionId } });
      expect(JSON.stringify(row)).not.toContain(itemId);
      expect(row.itemIdCipher.startsWith("v1.")).toBe(true);
      await expect(addConnection(prisma, actor, { itemId, label: "Outra vez" })).rejects.toThrow("já está conectado");
      await expect(addConnection(prisma, actor, { itemId: "not-a-uuid", label: "x" })).rejects.toThrow("Item ID");
      await expect(addConnection(prisma, actor, { itemId: randomUUID(), label: "   " })).rejects.toThrow("nome");
      await expect(addConnection(prisma, { ...actor, role: "MEMBER" }, { itemId: randomUUID(), label: "x" })).rejects.toThrow();
    });

    it("stops at the five connections the free plan allows", async () => {
      for (let index = 1; index < MAX_CONNECTIONS; index += 1) await addConnection(prisma, actor, { itemId: randomUUID(), label: `Extra ${index}` });
      await expect(addConnection(prisma, actor, { itemId: randomUUID(), label: "Sexta" })).rejects.toThrow("até 5");
      const extras = await prisma.openFinanceConnection.findMany({ where: { workspaceId, id: { not: connectionId } }, select: { id: true } });
      for (const extra of extras) await removeConnection(prisma, actor, extra.id);
      expect(await prisma.openFinanceConnection.count({ where: { workspaceId } })).toBe(1);
    });
  });

  describe("first sync", () => {
    it("lists the bank accounts without importing anything until each one is linked to a TBB account", async () => {
      const result = await sync();
      expect(result).toMatchObject({ status: "SUCCESS", accountsSeen: 2, staged: 0, autoCreated: 0 });
      const links = await prisma.openFinanceAccountLink.findMany({ where: { connectionId }, orderBy: { kind: "asc" } });
      expect(links.map((link) => [link.kind, link.isEnabled, link.accountId, link.maskedNumber])).toEqual([["BANK", false, null, "2345"], ["CREDIT", false, null, "5555"]]);
      expect(links[0].providerBalanceCents).toBe(10050);
      expect(links[0].syncFromDate?.toISOString().slice(0, 10)).toBe(TODAY);
      expect(state.calls).toHaveLength(0);
      const connection = await prisma.openFinanceConnection.findUniqueOrThrow({ where: { id: connectionId } });
      expect([connection.status, connection.providerStatus, connection.institutionName, connection.lastErrorCode, connection.syncLeaseUntil]).toEqual(["ACTIVE", "UPDATED", "Synthetic Bank", null, null]);
    });

    it("validates the account mapping: bank accounts only, one source per TBB account, cash accounts of this workspace", async () => {
      const [bank, card] = await prisma.openFinanceAccountLink.findMany({ where: { connectionId }, orderBy: { kind: "asc" } });
      await expect(mapAccountLink(prisma, actor, card.id, { accountId: checking, syncFromDate: "2032-10-10", enabled: true })).rejects.toThrow("cartões");
      await expect(mapAccountLink(prisma, actor, bank.id, { accountId: null, syncFromDate: "2032-10-10", enabled: true })).rejects.toThrow("Escolha a conta");
      await expect(mapAccountLink(prisma, actor, bank.id, { accountId: checking, syncFromDate: "10/10/2032", enabled: true })).rejects.toThrow("Data");
      await expect(mapAccountLink(prisma, actor, bank.id, { accountId: "someone-elses-account", syncFromDate: null, enabled: true })).rejects.toThrow("Escolha uma conta");
      await mapAccountLink(prisma, actor, bank.id, { accountId: checking, syncFromDate: "2032-10-10", enabled: true });
      // A second enabled link to the same TBB account would import the same money twice.
      const clash = await prisma.openFinanceAccountLink.create({ data: { workspaceId, connectionId, externalAccountId: "33333333-cccc-4ccc-8ccc-333333333333", kind: "BANK", displayName: "Conta duplicada" } });
      await expect(mapAccountLink(prisma, actor, clash.id, { accountId: checking, syncFromDate: null, enabled: true })).rejects.toThrow("duplicariam");
      await prisma.openFinanceAccountLink.delete({ where: { id: clash.id } });
    });
  });

  describe("importing movements", () => {
    it("creates plain income and spending, and leaves everything uncertain for review", async () => {
      // A manual purchase and a registered transfer that the bank will also show.
      await prisma.financeTransaction.create({ data: { workspaceId, accountId: checking, type: "EXPENSE", description: "Mercado", amountCents: 2000, date: new Date("2032-10-14"), currency: "BRL" } });
      await prisma.financeTransaction.create({ data: { workspaceId, accountId: savings, destinationAccountId: checking, type: "TRANSFER", description: "Transferência · Synthetic savings → Synthetic checking", amountCents: 3000, date: new Date("2032-10-14"), currency: "BRL", isConsumption: false, eventKind: "TRANSFER", source: "ACCOUNT_TRANSFER" } });
      const before = await balance(checking);
      state.transactions[REMOTE_BANK] = [
        tx("t1"),
        tx("t2", { description: "Pix recebido de Fulano", amount: 50, type: "CREDIT", date: "2032-10-13T00:00:00.000Z", paymentData: { payer: { name: "Fulano", documentNumber: { type: "CPF", value: "98765432100" } } } }),
        tx("t3", { status: "PENDING", date: "2032-10-16T00:00:00.000Z" }),
        tx("t4", { date: "2032-10-05T00:00:00.000Z", description: "Antes da janela" }),
        tx("t5", { description: "Pagamento de fatura Nubank", amount: 700, date: "2032-10-13T00:00:00.000Z" }),
        tx("t6", { description: "Pix recebido", amount: 80, type: "CREDIT", date: "2032-10-13T00:00:00.000Z", paymentData: { payer: { name: "Eu mesmo", documentNumber: { type: "CPF", value: OWNER_TAX } } } }),
        tx("t7", { description: "MERCADO CENTRAL", amount: 20, date: "2032-10-14T00:00:00.000Z" }),
        tx("t8", { description: "Pix recebido de Fulano", amount: 30, type: "CREDIT", date: "2032-10-14T00:00:00.000Z", paymentData: { payer: { name: "Fulano", documentNumber: { type: "CPF", value: "98765432100" } } } }),
      ];
      const result = await sync();
      expect(result).toMatchObject({ status: "SUCCESS", transactionsFetched: 8, pendingSkipped: 1, outsideWindow: 1, staged: 6, autoCreated: 2, needsReview: 3, alreadyKnown: 1 });
      const created = await ledger();
      expect(created.map((row) => [row.description, row.type, row.amountCents, row.date.toISOString().slice(0, 10)])).toEqual([["Padaria Central", "EXPENSE", 1234, "2032-10-12"], ["Pix recebido de Fulano", "INCOME", 5000, "2032-10-13"]]);
      expect(created.every((row) => row.tags.includes("open-finance") && row.importBatchId && row.fingerprint && row.externalId?.startsWith("pluggy:"))).toBe(true);
      expect(await balance(checking)).toBe(before - 1234 + 5000);
      // The transfer-like rows, the bill payment and the possible duplicate were not created; they wait in the review.
      const waiting = await prisma.financialEvidence.findMany({ where: { workspaceId, source: { accountId: checking }, decision: "NEEDS_REVIEW" }, select: { locator: true } });
      expect(waiting.map((row) => row.locator).sort()).toEqual(["pluggy:t5", "pluggy:t6", "pluggy:t7"]);
      // The mirror of the registered transfer is settled, not pending.
      const mirrored = await prisma.financialEvidence.findFirstOrThrow({ where: { workspaceId, locator: "pluggy:t8" } });
      expect([mirrored.decision, mirrored.reason]).toEqual(["IGNORE", "Já registrado como transferência entre suas contas."]);
    });

    it("is idempotent: syncing the same data again stages and creates nothing", async () => {
      const sources = await prisma.financialSource.count({ where: { workspaceId } }), rows = await prisma.financeTransaction.count({ where: { workspaceId } });
      const result = await sync();
      expect(result).toMatchObject({ status: "SUCCESS", staged: 0, autoCreated: 0, needsReview: 0, alreadyKnown: 6 });
      expect([await prisma.financialSource.count({ where: { workspaceId } }), await prisma.financeTransaction.count({ where: { workspaceId } })]).toEqual([sources, rows]);
    });

    it("looks a little behind the last movement but never before the chosen first day", async () => {
      state.calls.length = 0; await sync();
      expect(state.calls).toEqual([{ id: REMOTE_BANK, dateFrom: "2032-10-10" }]);
      const link = await prisma.openFinanceAccountLink.findFirstOrThrow({ where: { connectionId, kind: "BANK", accountId: checking } });
      expect(link.lastTransactionDate?.toISOString().slice(0, 10)).toBe("2032-10-14");
    });

    it("does not create a second row when the provider revises an amount but keeps the id", async () => {
      state.transactions[REMOTE_BANK] = state.transactions[REMOTE_BANK].map((row) => row.id === "t1" ? { ...row, amount: 15 } : row);
      const rows = await prisma.financeTransaction.count({ where: { workspaceId } });
      expect(await sync()).toMatchObject({ staged: 0, autoCreated: 0 });
      expect(await prisma.financeTransaction.count({ where: { workspaceId } })).toBe(rows);
    });

    it("sends a recreated movement (new id, same facts) to review instead of creating it twice", async () => {
      state.transactions[REMOTE_BANK] = [...state.transactions[REMOTE_BANK], tx("t1-recreated")];
      const rows = await prisma.financeTransaction.count({ where: { workspaceId } });
      expect(await sync()).toMatchObject({ staged: 1, autoCreated: 0, needsReview: 1 });
      expect(await prisma.financeTransaction.count({ where: { workspaceId } })).toBe(rows);
    });

    it("keeps personal data out of what it stores", async () => {
      const sources = await prisma.financialSource.findMany({ where: { workspaceId }, select: { content: true } });
      const stored = sources.map((source) => Buffer.from(source.content).toString("utf8")).join("\n");
      expect(stored).not.toContain(OWNER_TAX);
      expect(stored).not.toContain("98765432100");
      const events = await prisma.activityEvent.findMany({ where: { workspaceId, type: { startsWith: "open_finance." } } });
      expect(JSON.stringify(events.map((event) => event.metadata))).not.toMatch(/\d{4,}/);
    });
  });

  describe("failures and safety", () => {
    it("records a provider failure with a short code, releases the lease and recovers on the next run", async () => {
      state.itemError = new PluggyError("PROVIDER_UNAVAILABLE", 503);
      expect(await sync()).toMatchObject({ status: "ERROR", errorCode: "PROVIDER_UNAVAILABLE" });
      let connection = await prisma.openFinanceConnection.findUniqueOrThrow({ where: { id: connectionId } });
      expect([connection.status, connection.lastErrorCode, connection.syncLeaseUntil]).toEqual(["ERROR", "PROVIDER_UNAVAILABLE", null]);
      state.itemError = null;
      expect(await sync()).toMatchObject({ status: "SUCCESS" });
      connection = await prisma.openFinanceConnection.findUniqueOrThrow({ where: { id: connectionId } });
      expect([connection.status, connection.lastErrorCode]).toEqual(["ACTIVE", null]);
      const failed = await prisma.openFinanceSyncRun.findFirstOrThrow({ where: { connectionId, status: "ERROR" } });
      expect(failed.errorCode).toBe("PROVIDER_UNAVAILABLE");
    });

    it("asks to reconnect when the bank needs the person, without fetching anything", async () => {
      state.item = { ...state.item, status: "LOGIN_ERROR" }; state.calls.length = 0;
      expect(await sync()).toMatchObject({ status: "NEEDS_RECONNECT", errorCode: "RECONNECT_REQUIRED" });
      expect(state.calls).toHaveLength(0);
      state.item = { ...state.item, status: "UPDATED" };
      expect(await sync()).toMatchObject({ status: "SUCCESS" });
    });

    it("stops on an expired consent and needs the person to resume it", async () => {
      state.item = { ...state.item, consentExpiresAt: "2032-10-01T00:00:00.000Z" };
      expect(await sync()).toMatchObject({ status: "CONSENT_EXPIRED" });
      expect((await sync()).runId).toBeUndefined();
      state.item = { ...state.item, consentExpiresAt: null };
      await setConnectionPaused(prisma, actor, connectionId, false);
      expect(await sync()).toMatchObject({ status: "SUCCESS" });
    });

    it("never runs two syncs of one connection at once", async () => {
      state.delayMs = 150;
      const [first, second] = await Promise.all([sync(), sync()]);
      state.delayMs = 0;
      expect([first.status, second.status].sort()).toEqual(["BUSY", "SUCCESS"]);
    });

    it("does nothing while paused and picks up again when resumed", async () => {
      await setConnectionPaused(prisma, actor, connectionId, true);
      expect(await sync()).toMatchObject({ status: "PAUSED" });
      await expect(setConnectionPaused(prisma, actor, connectionId, true)).rejects.toThrow();
      await setConnectionPaused(prisma, actor, connectionId, false);
      expect(await sync()).toMatchObject({ status: "SUCCESS" });
    });

    it("runs due connections on the schedule, skipping the ones synced a moment ago", async () => {
      const runs = () => prisma.openFinanceSyncRun.count({ where: { connectionId, trigger: "CRON" } });
      const before = await runs();
      await syncDueConnections(deps, "CRON", { workspaceId });
      expect(await runs()).toBe(before);
      await prisma.openFinanceConnection.update({ where: { id: connectionId }, data: { lastSyncedAt: new Date(NOW.getTime() - 5 * 3600 * 1000) } });
      const due = await syncDueConnections(deps, "CRON", { workspaceId });
      expect(due.filter((result) => result.status === "SUCCESS")).toHaveLength(1);
      expect(await runs()).toBe(before + 1);
    });

    it("keeps imported history when a connection is removed", async () => {
      const rows = await prisma.financeTransaction.count({ where: { workspaceId, source: "DOCUMENT_V2" } });
      await removeConnection(prisma, actor, connectionId);
      expect(await prisma.openFinanceConnection.count({ where: { workspaceId } })).toBe(0);
      expect(await prisma.financeTransaction.count({ where: { workspaceId, source: "DOCUMENT_V2" } })).toBe(rows);
      await expect(removeConnection(prisma, actor, connectionId)).rejects.toThrow("não encontrada");
    });

    it("cannot be pointed at another workspace's connection", async () => {
      const other = await prisma.workspace.create({ data: { name: "Synthetic other", slug: `other-${randomUUID()}` } });
      const foreign = await prisma.openFinanceConnection.create({ data: { workspaceId: other.id, itemIdCipher: "v1.x.y.z", itemIdHash: randomUUID(), label: "Alheia" } });
      await expect(syncConnection(deps, actor, foreign.id, "MANUAL")).rejects.toThrow("não encontrada");
      await expect(removeConnection(prisma, actor, foreign.id)).rejects.toThrow("não encontrada");
      await expect(setConnectionPaused(prisma, actor, foreign.id, true)).rejects.toThrow();
      expect(await prisma.openFinanceConnection.count({ where: { workspaceId: other.id } })).toBe(1);
    });
  });
});
