import { describe, expect, it, vi } from "vitest";
import { applyCardStatementImport, previewCardStatementImport, type CardStatementDb } from "../card-statement-import";
import { summarizeCardStatements, type StatementRow } from "../card-statements";
import { AS_OF, EXPECTED, KEYS, syntheticKnownStatementFile, syntheticStatementFile } from "./statement-fixture";

type NewRow = Record<string, unknown> & { workspaceId: string };
type Row = NewRow & { id: string };
const day = (value: unknown) => (value instanceof Date ? value.toISOString().slice(0, 10) : null);

/** In-memory stand-in for the three tables the importer may touch. It enforces the same
 * uniqueness, tenant and integrity rules as the migration, and refuses any other table. */
function fakeDb() {
  const accounts: Row[] = [], statements: Row[] = [], events: Row[] = [], purchases: Row[] = [];
  let sequence = 0;
  const id = (prefix: string) => `${prefix}-${++sequence}`;
  const pick = (row: Row, select?: Record<string, unknown>) => select ? Object.fromEntries(Object.keys(select).filter((key) => key in row).map((key) => [key, structuredClone(row[key])])) : structuredClone(row);
  const matches = (row: Row, where: Record<string, unknown>) => Object.entries(where).every(([key, value]) => row[key] === value);
  function check(row: Row) {
    const account = accounts.find((item) => item.id === row.accountId);
    if (!account || account.workspaceId !== row.workspaceId) throw new Error("FK: account outside workspace");
    if (statements.some((item) => item.id !== row.id && item.workspaceId === row.workspaceId && (item.externalKey === row.externalKey || (item.accountId === row.accountId && item.periodKey === row.periodKey)))) throw new Error("Unique constraint");
    if ((row.amountCents as number) < 0 || !Number.isInteger(row.amountCents)) throw new Error("CHECK amount");
    if ((row.kind === "MONTHLY_PROJECTION") !== (row.status === "FORECAST")) throw new Error("CHECK kind/status");
    const expectedPeriod = row.kind === "STATEMENT" ? `due:${day(row.dueDate)}` : `month:${row.referenceMonth}`;
    if (row.periodKey !== expectedPeriod || (row.kind === "MONTHLY_PROJECTION" && row.dueDate)) throw new Error("CHECK period");
    if (row.paidAt && row.status !== "PAID") throw new Error("CHECK paidAt");
    if ((row.reconciliation === "NOT_REQUIRED") !== (row.overlapsStatementId == null)) throw new Error("CHECK overlap");
    if (row.overlapsStatementId && !statements.some((item) => item.id === row.overlapsStatementId && item.workspaceId === row.workspaceId)) throw new Error("FK: overlap outside workspace");
  }
  const db = {
    account: {
      findMany: async ({ where, select }: { where: Record<string, unknown>; select?: Record<string, unknown> }) => accounts.filter((row) => matches(row, where)).map((row) => pick(row, select)),
      create: async ({ data, select }: { data: NewRow; select?: Record<string, unknown> }) => { const row: Row = { isArchived: false, ...data, id: id("acc") }; accounts.push(row); return pick(row, select); },
    },
    cardStatement: {
      findMany: async ({ where, select }: { where: Record<string, unknown>; select?: Record<string, unknown> }) => statements.filter((row) => matches(row, where)).map((row) => pick(row, select)),
      create: async ({ data, select }: { data: NewRow; select?: Record<string, unknown> }) => {
        const row: Row = { reconciliation: "NOT_REQUIRED", overlapsStatementId: null, currency: "BRL", source: "MANUAL_IMPORT", ...data, id: id("st") };
        check(row); statements.push(row); return pick(row, select);
      },
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        const targets = statements.filter((row) => matches(row, where));
        for (const row of targets) { const next = { ...row, ...data }; check(next); Object.assign(row, next); }
        return { count: targets.length };
      },
    },
    activityEvent: { create: async ({ data }: { data: Record<string, unknown> }) => { const row = { ...data, id: id("ev") } as Row; events.push(row); return row; } },
    // Read-only: the importer may look up expenses added to a bill, but has no way to write them.
    financeTransaction: { findMany: async () => purchases },
  };
  const touched = new Set<string>();
  const guarded = new Proxy(db, { get(target, property: string) {
    touched.add(property);
    if (!(property in target)) throw new Error(`Importer touched forbidden table: ${property}`);
    return target[property as keyof typeof target];
  } });
  return { db: guarded as unknown as CardStatementDb, accounts, statements, events, purchases, touched };
}

const W1 = { workspaceId: "w1", userId: "u1" };
async function importInto(fake: ReturnType<typeof fakeDb>, raw = syntheticStatementFile(), actor = W1) {
  const report = await previewCardStatementImport(fake.db, actor.workspaceId, raw, AS_OF);
  if (!report.fingerprint) throw new Error(report.errors.join("\n"));
  return { report, result: await applyCardStatementImport(fake.db, actor, raw, { fingerprint: report.fingerprint, acceptConflicts: false, fileSha256: "test" }) };
}
function rowsOf(fake: ReturnType<typeof fakeDb>, workspaceId: string): StatementRow[] {
  return fake.statements.filter((row) => row.workspaceId === workspaceId).map((row) => ({
    id: row.id, accountId: row.accountId as string, accountName: String(fake.accounts.find((account) => account.id === row.accountId)?.name),
    kind: row.kind as StatementRow["kind"], status: row.status as StatementRow["status"], amountCents: row.amountCents as number,
    dueDate: day(row.dueDate), closingDate: day(row.closingDate), closingDay: (row.closingDay as number | null) ?? null, referenceMonth: (row.referenceMonth as string | null) ?? null,
    paidAt: day(row.paidAt), reconciliation: row.reconciliation as StatementRow["reconciliation"], overlapsStatementId: (row.overlapsStatementId as string | null) ?? null, notes: (row.notes as string | null) ?? null,
  }));
}
function neighbour(fake: ReturnType<typeof fakeDb>) {
  // Another tenant owning a same-named card and statements with the very same external keys.
  fake.accounts.push({ id: "w2-alfa", workspaceId: "w2", name: "Alfa Bank", institution: "Alfa Bank", type: "CREDIT_CARD", isArchived: false });
  const first = syntheticStatementFile().records[0];
  fake.statements.push({ id: "w2-st", workspaceId: "w2", accountId: "w2-alfa", externalKey: first.externalKey, periodKey: `due:${first.dueDate}`, kind: "STATEMENT", status: "OPEN",
    amountCents: 123, dueDate: new Date(`${first.dueDate}T00:00:00.000Z`), closingDate: null, closingDay: null, referenceMonth: null, paidAt: null,
    reconciliation: "NOT_REQUIRED", overlapsStatementId: null, sourceRecordType: "CURRENT_STATEMENT", sourceAsOf: new Date("2031-03-01T00:00:00.000Z"), notes: null });
  return structuredClone(fake.statements.filter((row) => row.workspaceId === "w2"));
}

describe("card statement import against the database layer", () => {
  it("persists the 27 records only in the session workspace and leaves the neighbour untouched", async () => {
    const fake = fakeDb();
    const before = neighbour(fake);
    const { report, result } = await importInto(fake);
    expect(report.counts).toEqual({ create: 27, update: 0, promote: 0, keep: 0, conflict: 0 });
    expect(report.accounts.map((account) => account.action)).toEqual(["CREATE", "CREATE", "CREATE"]);
    expect(result).toEqual({ counts: report.counts, accountsCreated: 3, persisted: 27 });
    expect(fake.statements.filter((row) => row.workspaceId === "w1")).toHaveLength(27);
    expect(fake.accounts.filter((row) => row.workspaceId === "w1").map((row) => [row.name, row.type, row.creditLimitCents ?? null, row.closingDay ?? null, row.dueDay ?? null]))
      .toEqual([["Alfa Bank", "CREDIT_CARD", null, null, null], ["Bétula", "CREDIT_CARD", null, null, null], ["Cometa Pay", "CREDIT_CARD", null, null, null]]);
    expect(fake.statements.filter((row) => row.workspaceId === "w2")).toEqual(before);
    expect(fake.events).toHaveLength(1);
    expect(fake.events[0]).toMatchObject({ workspaceId: "w1", actorUserId: "u1", type: "finance.card_statements_imported" });
  });

  it("is idempotent: importing the same file twice creates nothing new", async () => {
    const fake = fakeDb();
    await importInto(fake);
    const snapshot = structuredClone(fake.statements);
    const creates = vi.spyOn(fake.db.cardStatement, "create");
    const updates = vi.spyOn(fake.db.cardStatement, "updateMany");
    const accountCreates = vi.spyOn(fake.db.account, "create");
    const audits = vi.spyOn(fake.db.activityEvent, "create");
    const { report, result } = await importInto(fake);
    expect(report.counts).toEqual({ create: 0, update: 0, promote: 0, keep: 27, conflict: 0 });
    expect(result.persisted).toBe(0);
    expect(fake.statements).toEqual(snapshot);
    expect(fake.accounts).toHaveLength(3);
    expect(creates).not.toHaveBeenCalled();
    expect(updates).not.toHaveBeenCalled();
    expect(accountCreates).not.toHaveBeenCalled();
    expect(audits).not.toHaveBeenCalled();
  });

  it("preserves statuses, the two zero-value paid statements and unknown payment dates", async () => {
    const fake = fakeDb();
    await importInto(fake);
    const rows = rowsOf(fake, "w1");
    const count = (status: string) => rows.filter((row) => row.status === status).length;
    expect([count("PAID"), count("OPEN"), count("FUTURE_KNOWN"), count("FORECAST")]).toEqual([12, 3, 5, 7]);
    expect(rows.filter((row) => row.status === "PAID" && row.amountCents === 0)).toHaveLength(2);
    expect(rows.every((row) => row.paidAt === null)).toBe(true);
    expect(rows.filter((row) => row.kind === "MONTHLY_PROJECTION").every((row) => row.dueDate === null && row.referenceMonth)).toBe(true);
    expect(rows.find((row) => row.status === "OPEN" && row.accountName === "Bétula")).toMatchObject({ closingDate: null, closingDay: 27, dueDate: "2031-05-06" });
    expect(rows.reduce((sum, row) => sum + row.amountCents, 0)).toBe(EXPECTED.paidCents + EXPECTED.openCents + EXPECTED.futureKnownCents + EXPECTED.forecastCents);
  });

  it("keeps the overlapping forecast pending and out of the current debt", async () => {
    const fake = fakeDb();
    await importInto(fake);
    const forecast = fake.statements.find((row) => row.externalKey === KEYS.betulaFirstForecast)!;
    const target = fake.statements.find((row) => row.externalKey === KEYS.betulaCurrent)!;
    expect(forecast).toMatchObject({ reconciliation: "PENDING", overlapsStatementId: target.id });
    const summary = summarizeCardStatements(rowsOf(fake, "w1"), AS_OF);
    expect(summary.openCents).toBe(EXPECTED.openCents);
    expect(summary.pendingCents).toBe(EXPECTED.pendingCents);
    expect(summary.forecastCountedCents).toBe(EXPECTED.forecastCents - EXPECTED.pendingCents);
  });

  it("only reads the ledger and never touches debts", async () => {
    const fake = fakeDb();
    await importInto(fake);
    expect([...fake.touched].sort()).toEqual(["account", "activityEvent", "cardStatement", "financeTransaction"]);
  });

  it("writes nothing when the workspace changed after the preview", async () => {
    const fake = fakeDb();
    const raw = syntheticStatementFile();
    const report = await previewCardStatementImport(fake.db, "w1", raw, AS_OF);
    fake.accounts.push({ id: "late", workspaceId: "w1", name: "Alfa Bank", institution: "Alfa Bank", type: "CREDIT_CARD", isArchived: false });
    await expect(applyCardStatementImport(fake.db, W1, raw, { fingerprint: report.fingerprint!, acceptConflicts: false, fileSha256: "test" })).rejects.toThrow("mudaram desde a prévia");
    expect(fake.statements).toHaveLength(0);
    expect(fake.events).toHaveLength(0);
  });

  it("requires explicit consent to skip conflicts and records a restore snapshot of updated rows", async () => {
    const fake = fakeDb();
    await importInto(fake);
    const paid = fake.statements.find((row) => row.status === "PAID")!;
    paid.amountCents = 999; // confirmed value that a later file must not overwrite
    const newer = syntheticStatementFile("2031-04-10");
    newer.records[15] = { ...newer.records[15], amountCents: 11_112 };
    const report = await previewCardStatementImport(fake.db, "w1", newer, "2031-04-10");
    expect(report.counts).toEqual({ create: 0, update: 1, promote: 0, keep: 25, conflict: 1 });
    await expect(applyCardStatementImport(fake.db, W1, newer, { fingerprint: report.fingerprint!, acceptConflicts: false, fileSha256: "test" })).rejects.toThrow("conflito");
    await applyCardStatementImport(fake.db, W1, newer, { fingerprint: report.fingerprint!, acceptConflicts: true, fileSha256: "test" });
    expect(paid.amountCents).toBe(999);
    const metadata = fake.events.at(-1)!.metadata as { updated: { before: { amountCents: number } }[]; conflicts: string[] };
    expect(metadata.updated.map((item) => item.before.amountCents)).toEqual([11_111]);
    expect(metadata.conflicts).toEqual([paid.externalKey]);
    expect(fake.statements).toHaveLength(27);
  });
});

describe("forecast promotion database integrity", () => {
  it("does not import a lower statement total than the existing included purchases", async () => {
    const fake=fakeDb();await importInto(fake);
    const open=fake.statements.find(row=>row.status==="OPEN")!;
    fake.purchases.push({id:"included",workspaceId:"w1",cardStatementId:open.id,statementDetailMode:"ALREADY_INCLUDED",amountCents:90000});
    const raw=syntheticStatementFile();raw.records[12]={...raw.records[12],amountCents:89999};raw.summary.currentOutstandingCents=EXPECTED.openCents-100001+89999;
    const report=await previewCardStatementImport(fake.db,"w1",raw,AS_OF);
    expect(report.counts).toMatchObject({conflict:1,update:0});
  });
  it("promotes all seven forecasts preserving ids and clearing reconciliation and overlap together", async () => {
    const fake=fakeDb(); await importInto(fake);
    const ids=fake.statements.filter(row=>row.kind==="MONTHLY_PROJECTION").map(row=>row.id);
    const neighbourBefore=neighbour(fake);
    const result=await importInto(fake,syntheticKnownStatementFile());
    expect(result.report.counts).toEqual({create:0,update:0,promote:7,keep:20,conflict:0});
    expect(fake.statements.filter(row=>row.workspaceId==="w1")).toHaveLength(27);
    expect(ids.map(id=>fake.statements.find(row=>row.id===id))).toEqual(expect.arrayContaining(ids.map(id=>expect.objectContaining({id,kind:"STATEMENT",status:"FUTURE_KNOWN",reconciliation:"NOT_REQUIRED",overlapsStatementId:null}))));
    expect(fake.statements.filter(row=>row.workspaceId==="w2")).toEqual(neighbourBefore);
    const metadata=fake.events.at(-1)!.metadata as {promoted:{id:string;before:{kind:string}}[]};
    expect(metadata.promoted).toHaveLength(7);
    expect(metadata.promoted.every(item=>item.before.kind==="MONTHLY_PROJECTION")).toBe(true);
  });
  it("conflicts with the old file after promotion and writes nothing, even when conflicts are skipped", async () => {
    const fake=fakeDb();await importInto(fake);await importInto(fake,syntheticKnownStatementFile());
    const before=structuredClone({statements:fake.statements,accounts:fake.accounts,events:fake.events});
    const raw=syntheticStatementFile();const report=await previewCardStatementImport(fake.db,"w1",raw,AS_OF);
    expect(report.counts).toEqual({create:0,update:0,promote:0,keep:20,conflict:7});
    await expect(applyCardStatementImport(fake.db,W1,raw,{fingerprint:report.fingerprint!,acceptConflicts:false,fileSha256:"test"})).rejects.toThrow("conflito");
    await applyCardStatementImport(fake.db,W1,raw,{fingerprint:report.fingerprint!,acceptConflicts:true,fileSha256:"test"});
    expect({statements:fake.statements,accounts:fake.accounts,events:fake.events}).toEqual(before);
  });
  it.each(["INCLUDED_IN_STATEMENT","ADDED_TO_STATEMENT"])("blocks promotion with existing user classification %s",async mode=>{
    const fake=fakeDb();await importInto(fake);
    const forecast=fake.statements.find(row=>row.kind==="MONTHLY_PROJECTION")!;
    if(mode==="INCLUDED_IN_STATEMENT") forecast.reconciliation=mode;
    else fake.purchases.push({id:"manual-purchase",workspaceId:"w1",cardStatementId:forecast.id,statementDetailMode:mode,amountCents:1});
    const raw=syntheticKnownStatementFile();const report=await previewCardStatementImport(fake.db,"w1",raw,AS_OF);
    expect(report.counts!.conflict).toBe(1);
    const snapshot=structuredClone(fake.statements);
    await expect(applyCardStatementImport(fake.db,W1,raw,{fingerprint:report.fingerprint!,acceptConflicts:false,fileSha256:"test"})).rejects.toThrow("conflito");
    expect(fake.statements).toEqual(snapshot);
  });
  it("rejects a known bill when a forecast remains in the same competence",async()=>{
    const fake=fakeDb();await importInto(fake,syntheticKnownStatementFile());
    const known=fake.statements.find(row=>row.externalKey==="known:2031-05")!;
    fake.statements.push({...known,id:"remaining",externalKey:"remaining-forecast",periodKey:"month:2031-05",kind:"MONTHLY_PROJECTION",status:"FORECAST",dueDate:null});
    const report=await previewCardStatementImport(fake.db,"w1",syntheticKnownStatementFile(),AS_OF);
    expect(report.counts).toMatchObject({create:0,conflict:1});
  });
});
