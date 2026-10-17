import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
const state = vi.hoisted(() => ({ actor: { workspaceId: "", userId: "", role: "OWNER", workspace: { timezone: "America/Manaus" } } }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/workspace", () => ({ requirePermission: async () => state.actor, AuthorizationError: class extends Error {} }));
vi.mock("@/lib/tenancy/requirePermission", () => ({ requirePermission: async () => state.actor, AuthorizationError: class extends Error {} }));
vi.mock("@/lib/prisma", async () => {
  const { PrismaClient } = await import("@prisma/client");
  const url = process.env.FINANCE_PLANNING_TEST_DB_URL;
  if (url && !/^\/tbb_(planning_sprint_qa|planning_test)$/.test(new URL(url).pathname)) throw new Error("Explicit disposable planning database required");
  return { prisma: new PrismaClient({ datasourceUrl: url ?? "postgresql://test:test@localhost:1/tbb_planning_test" }) };
});
import { prisma } from "@/lib/prisma";
import { confirmCsvImport, prepareCsvPreview, reconcileAccountBalance, reconcileAccountBalances, transferBetweenAccounts, uploadPastedData } from "../actions";
import { financeSummary } from "../queries";

const form = (entries: [string, string][]) => { const fd = new FormData(); for (const [key, value] of entries) fd.append(key, value); return fd; };
const sync = (rows: [string, string][], transfers: [string, string, string][] = []) => form([
  ...rows.flatMap(([id, balance]) => [["accountId", id], ["balance", balance]] as [string, string][]),
  ...transfers.flatMap(([from, to, amount]) => [["transferFrom", from], ["transferTo", to], ["transferAmount", amount]] as [string, string][]),
]);

describe.skipIf(!process.env.FINANCE_PLANNING_TEST_DB_URL)("balance sync and transfers in disposable PostgreSQL", () => {
  const today = "2032-10-15";
  let main: string, other: string, reserve: string, card: string, foreign: string;
  const balances = async () => new Map((await financeSummary(state.actor.workspaceId, today)).accounts.map((row) => [row.id, row.balanceCents]));
  const ledger = () => prisma.financeTransaction.findMany({ where: { workspaceId: state.actor.workspaceId, source: { in: ["BALANCE_RECONCILIATION", "ACCOUNT_TRANSFER"] } }, orderBy: { createdAt: "asc" } });
  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(today + "T16:00:00Z"));
    const key = randomUUID();
    const user = await prisma.user.create({ data: { email: `balance-sync-${key}@example.invalid`, name: "Synthetic balance sync", passwordHash: "test-only" } });
    const workspace = await prisma.workspace.create({ data: { name: "Synthetic balance sync", slug: `balance-sync-${key}`, memberships: { create: { userId: user.id, role: "OWNER" } } } });
    state.actor = { workspaceId: workspace.id, userId: user.id, role: "OWNER", workspace: { timezone: "America/Manaus" } };
    const make = async (name: string, type: "CHECKING" | "SAVINGS" | "CREDIT_CARD", initialBalanceCents = 0) => (await prisma.account.create({ data: { workspaceId: workspace.id, name, type, initialBalanceCents } })).id;
    main = await make("Synthetic main", "CHECKING");
    other = await make("Synthetic other", "CHECKING", 5000);
    reserve = await make("Synthetic reserve", "SAVINGS", 10000);
    card = await make("Synthetic card", "CREDIT_CARD");
    // The main account went negative because an expense was typed while the real money had arrived by PIX.
    await prisma.financeTransaction.create({ data: { workspaceId: workspace.id, accountId: main, type: "EXPENSE", description: "Synthetic debit purchase", amountCents: 7000, date: new Date("2032-10-14"), currency: "BRL" } });
    const foreignWorkspace = await prisma.workspace.create({ data: { name: "Synthetic foreign", slug: `balance-foreign-${key}` } });
    foreign = (await prisma.account.create({ data: { workspaceId: foreignWorkspace.id, name: "Synthetic foreign account", type: "CHECKING", initialBalanceCents: 123 } })).id;
  }, 30000);
  afterAll(async () => { vi.useRealTimers(); await prisma.$disconnect(); });

  it("starts from the negative balance the person described", async () => {
    expect((await balances()).get(main)).toBe(-7000);
  });

  it("records the declared transfers with their real amounts and settles the rest as one adjustment", async () => {
    const before = await financeSummary(state.actor.workspaceId, today);
    expect(await reconcileAccountBalances(sync([[main, "40,00"], [other, "40,00"], [reserve, "70,00"]], [[reserve, main, "30,00"], [other, main, "10,00"]]))).toEqual({ success: "Saldos atualizados: 2 transferências entre contas e 1 ajuste." });
    const after = await balances();
    expect([after.get(main), after.get(other), after.get(reserve)]).toEqual([4000, 4000, 7000]);
    const rows = await ledger();
    const transfers = rows.filter((row) => row.type === "TRANSFER"), adjustments = rows.filter((row) => row.type === "ADJUSTMENT");
    expect(transfers.map((row) => [row.accountId, row.destinationAccountId, row.amountCents]).sort()).toEqual([[other, main, 1000], [reserve, main, 3000]].sort());
    expect(transfers.every((row) => row.isConsumption === false && row.eventKind === "TRANSFER" && row.source === "BALANCE_RECONCILIATION" && row.date.toISOString().slice(0, 10) === today)).toBe(true);
    expect(adjustments.map((row) => [row.accountId, row.amountCents])).toEqual([[main, 11000 - 4000]]);
    // Neither moved money nor an adjustment is income or spending.
    const summary = await financeSummary(state.actor.workspaceId, today);
    expect([summary.income, summary.expenses]).toEqual([before.income, before.expenses]);
  });

  it("keeps cents out of the transfers: a stale balance becomes a small adjustment, never a strange transfer amount", async () => {
    // Typed balances differ from what the real transfer of 12,00 explains by 8,00 on one side and 0,07 on the other.
    expect(await reconcileAccountBalances(sync([[main, "60,00"], [other, "27,93"]], [[other, main, "12,00"]]))).toEqual({ success: "Saldos atualizados: 1 transferência entre contas e 2 ajustes." });
    const rows = (await ledger()).slice(-3);
    expect(rows.map((row) => [row.type, row.accountId, row.amountCents]).sort()).toEqual([["ADJUSTMENT", main, 800], ["ADJUSTMENT", other, -7], ["TRANSFER", other, 1200]].sort());
    const after = await balances();
    expect([after.get(main), after.get(other)]).toEqual([6000, 2793]);
  });

  it("does nothing when the same balances are typed again", async () => {
    const count = (await ledger()).length;
    expect(await reconcileAccountBalances(sync([[main, "60,00"], [other, "27,93"], [reserve, "70,00"]]))).toEqual({ success: "Os saldos já estavam corretos." });
    expect((await ledger()).length).toBe(count);
  });

  it("records only adjustments when no transfer is declared", async () => {
    const count = (await ledger()).length;
    expect(await reconcileAccountBalances(sync([[main, "65,00"], [other, "20,00"]]))).toEqual({ success: "Saldos atualizados: 2 ajustes." });
    const rows = (await ledger()).slice(count);
    expect(rows.every((row) => row.type === "ADJUSTMENT")).toBe(true);
    const after = await balances();
    expect([after.get(main), after.get(other)]).toEqual([6500, 2000]);
  });

  it("moves an account that only appears in a transfer, without adjusting it", async () => {
    const before = await balances();
    expect(await reconcileAccountBalances(sync([], [[other, reserve, "5,00"]]))).toEqual({ success: "Saldos atualizados: 1 transferência entre contas." });
    const after = await balances();
    expect([after.get(other), after.get(reserve)]).toEqual([before.get(other)! - 500, before.get(reserve)! + 500]);
  });

  it("ignores accounts that were not edited, so a stale balance cannot overwrite a newer one", async () => {
    const count = (await ledger()).length;
    const current = (await balances()).get(reserve)!;
    expect(await reconcileAccountBalances(sync([[reserve, (current / 100).toFixed(2).replace(".", ",")]]))).toEqual({ success: "Os saldos já estavam corretos." });
    expect((await ledger()).length).toBe(count);
  });

  it("rejects bad requests without writing anything", async () => {
    const count = (await ledger()).length, before = await balances();
    const partial = form([["transferFrom", main], ["transferTo", other]]);
    for (const fd of [
      sync([[card, "10,00"]]), sync([[foreign, "10,00"]]), sync([[main, "10,00"], [main, "20,00"]]), sync([[main, ""]]), sync([[main, "abc"]]), sync([[main, "10,00"], [foreign, "1,00"]]), form([]),
      sync([], [[main, main, "1,00"]]), sync([], [[main, other, "0"]]), sync([], [[main, other, "-3,00"]]), sync([], [[main, card, "1,00"]]), sync([], [[main, foreign, "1,00"]]), sync([], [["", other, "1,00"]]), partial,
    ]) expect(await reconcileAccountBalances(fd)).toHaveProperty("error");
    expect((await ledger()).length).toBe(count);
    expect(await balances()).toEqual(before);
  });

  it("keeps the single-account reconciliation working on the shared balance rule", async () => {
    expect(await reconcileAccountBalance(form([["id", main], ["balance", "55,55"]]))).toEqual({ success: "Saldo atualizado." });
    expect((await balances()).get(main)).toBe(5555);
  });

  it("registers a transfer between two own accounts that moves both balances and nothing else", async () => {
    const before = await balances(), summary = await financeSummary(state.actor.workspaceId, today);
    expect(await transferBetweenAccounts(form([["fromAccountId", main], ["toAccountId", reserve], ["amount", "12,34"], ["date", "2032-10-15"]]))).toEqual({ success: "Transferência registrada." });
    const after = await balances();
    expect([after.get(main), after.get(reserve)]).toEqual([before.get(main)! - 1234, before.get(reserve)! + 1234]);
    const row = (await ledger()).at(-1)!;
    expect([row.type, row.source, row.isConsumption, row.eventKind, row.description]).toEqual(["TRANSFER", "ACCOUNT_TRANSFER", false, "TRANSFER", "Transferência · Synthetic main → Synthetic reserve"]);
    const next = await financeSummary(state.actor.workspaceId, today);
    expect([next.income, next.expenses]).toEqual([summary.income, summary.expenses]);
  });

  it("rejects transfers to the same account, a card, another workspace, a future date or a non-positive amount", async () => {
    const count = (await ledger()).length;
    const base = (extra: [string, string][]) => form([["fromAccountId", main], ["toAccountId", other], ["amount", "1,00"], ...extra]);
    for (const fd of [
      form([["fromAccountId", main], ["toAccountId", main], ["amount", "1,00"]]), form([["fromAccountId", main], ["toAccountId", card], ["amount", "1,00"]]),
      form([["fromAccountId", main], ["toAccountId", foreign], ["amount", "1,00"]]), base([["date", "2032-10-16"]]), form([["fromAccountId", main], ["toAccountId", other], ["amount", "0"]]),
      form([["fromAccountId", main], ["toAccountId", other], ["amount", "-3,00"]]), form([["toAccountId", other], ["amount", "1,00"]]),
    ]) expect(await transferBetweenAccounts(fd)).toHaveProperty("error");
    expect((await ledger()).length).toBe(count);
  });

  it("refuses a PIX that the ledger already holds as income or expense, unless the person says it is another movement", async () => {
    await prisma.financeTransaction.create({ data: { workspaceId: state.actor.workspaceId, accountId: reserve, type: "INCOME", description: "PIX recebido de PAULO", amountCents: 777, date: new Date("2032-10-14"), currency: "BRL", source: "CSV" } });
    const count = (await ledger()).length;
    const request = (extra: [string, string][] = []) => form([["fromAccountId", main], ["toAccountId", reserve], ["amount", "7,77"], ["date", "2032-10-15"], ...extra]);
    const refused = await transferBetweenAccounts(request());
    expect(refused).toHaveProperty("error");
    expect((refused as { error: string }).error).toContain("Possível duplicidade");
    expect((refused as { error: string }).error).toContain("Synthetic reserve");
    expect((await ledger()).length).toBe(count);
    expect(await transferBetweenAccounts(request([["confirmDuplicate", "on"]]))).toEqual({ success: "Transferência registrada." });
    expect((await ledger()).length).toBe(count + 1);
    // An amount nobody else holds is never refused.
    expect(await transferBetweenAccounts(form([["fromAccountId", main], ["toAccountId", reserve], ["amount", "7,78"], ["date", "2032-10-15"]]))).toEqual({ success: "Transferência registrada." });
  });
});

describe.skipIf(!process.env.FINANCE_PLANNING_TEST_DB_URL)("bank statement import after transfers, in disposable PostgreSQL", () => {
  const today = "2032-10-15";
  let main: string, other: string;
  const csv = (rows: [string, string, string][]) => ["Data;Descrição;Valor", ...rows.map((row) => row.join(";"))].join("\n");
  const preview = async (accountId: string, rows: [string, string, string][]) => {
    const upload = await uploadPastedData(form([["accountId", accountId], ["content", csv(rows)]])) as { batchId: string };
    const result = await prepareCsvPreview(form([["batchId", upload.batchId], ["date", "Data"], ["description", "Descrição"], ["amount", "Valor"], ["direction", "SIGNED"]]));
    return { batchId: upload.batchId, result: result as { ready: number; duplicates: number; matchedCount: number; matchedTransfers: { label: string; amountCents: number }[] } };
  };
  const balanceOf = async (id: string) => (await financeSummary(state.actor.workspaceId, today)).accounts.find((row) => row.id === id)!.balanceCents;
  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(today + "T16:00:00Z"));
    const key = randomUUID();
    const user = await prisma.user.create({ data: { email: `statement-match-${key}@example.invalid`, name: "Synthetic statement match", passwordHash: "test-only" } });
    const workspace = await prisma.workspace.create({ data: { name: "Synthetic statement match", slug: `statement-match-${key}`, memberships: { create: { userId: user.id, role: "OWNER" } } } });
    state.actor = { workspaceId: workspace.id, userId: user.id, role: "OWNER", workspace: { timezone: "America/Manaus" } };
    main = (await prisma.account.create({ data: { workspaceId: workspace.id, name: "Synthetic destination", type: "CHECKING", initialBalanceCents: 10000 } })).id;
    other = (await prisma.account.create({ data: { workspaceId: workspace.id, name: "Synthetic origin", type: "CHECKING", initialBalanceCents: 10000 } })).id;
    expect(await transferBetweenAccounts(form([["fromAccountId", other], ["toAccountId", main], ["amount", "30,00"], ["date", "2032-10-15"]]))).toHaveProperty("success");
  }, 30000);
  afterAll(async () => { vi.useRealTimers(); await prisma.$disconnect(); });

  it("does not import the incoming PIX of a transfer that is already registered, and does import everything else", async () => {
    const before = await balanceOf(main);
    const { batchId, result } = await preview(main, [["14/10/2032", "PIX recebido de PAULO", "30,00"], ["15/10/2032", "Mercado", "-12,00"], ["15/10/2032", "PIX recebido outra pessoa", "45,00"], ["01/09/2032", "PIX recebido antigo", "30,00"]]);
    expect(result.matchedCount).toBe(1);
    expect(result.matchedTransfers[0]).toMatchObject({ label: "Synthetic origin → Synthetic destination", amountCents: 3000 });
    expect([result.ready, result.duplicates]).toEqual([3, 1]);
    const confirmed = await confirmCsvImport(form([["batchId", batchId]]));
    expect(confirmed).toHaveProperty("success");
    expect((confirmed as { success: string }).success).toContain("1 já registrado(s) como transferência entre suas contas");
    // +45,00, -12,00 and the old +30,00 outside the window were imported; the matched +30,00 was not added a second time.
    expect(await balanceOf(main)).toBe(before + 4500 - 1200 + 3000);
  });

  it("still recognises the same transfer in another file, because the first file never created a row for it", async () => {
    const { result } = await preview(main, [["15/10/2032", "PIX recebido de PAULO", "30,00"]]);
    expect(result.matchedCount).toBe(1);
  });

  it("matches the outgoing side from the origin account's statement too", async () => {
    const before = await balanceOf(other);
    const { batchId, result } = await preview(other, [["15/10/2032", "PIX enviado PAULO", "-30,00"], ["15/10/2032", "Farmácia", "-9,90"]]);
    expect([result.matchedCount, result.ready]).toEqual([1, 1]);
    expect(await confirmCsvImport(form([["batchId", batchId]]))).toHaveProperty("success");
    expect(await balanceOf(other)).toBe(before - 990);
  });

  it("never matches a different amount, another direction or another account", async () => {
    const { result } = await preview(main, [["15/10/2032", "PIX enviado", "-30,00"], ["15/10/2032", "PIX recebido", "30,01"], ["15/10/2032", "Outro", "29,99"]]);
    expect(result.matchedCount).toBe(0);
  });

  it("lets the person import matched rows anyway when they are really other movements", async () => {
    const before = await balanceOf(main);
    const { batchId } = await preview(main, [["15/10/2032", "PIX recebido de outro Paulo", "30,00"]]);
    expect(await confirmCsvImport(form([["batchId", batchId], ["importMatchedTransfers", "on"]]))).toHaveProperty("success");
    expect(await balanceOf(main)).toBe(before + 3000);
  });

  it("imports the row if the matched transfer disappeared between the preview and the confirmation", async () => {
    expect(await transferBetweenAccounts(form([["fromAccountId", other], ["toAccountId", main], ["amount", "55,55"], ["date", "2032-10-15"]]))).toHaveProperty("success");
    const { batchId, result } = await preview(main, [["15/10/2032", "PIX recebido", "55,55"]]);
    expect(result.matchedCount).toBe(1);
    await prisma.financeTransaction.deleteMany({ where: { workspaceId: state.actor.workspaceId, amountCents: 5555, type: "TRANSFER" } });
    const before = await balanceOf(main);
    expect(await confirmCsvImport(form([["batchId", batchId]]))).toHaveProperty("success");
    expect(await balanceOf(main)).toBe(before + 5555);
  });
});
