import { describe, expect, it } from "vitest";
import {
  issuerKey, parseCardStatementFile, planCardStatementImport, resolveIssuerAccounts, statementFileTotals, summarizeCardStatements,
  type CardStatementFile, type ExistingStatement, type StatementRow,
} from "../card-statements";
import { AS_OF, EXPECTED, KEYS, syntheticStatementFile } from "./statement-fixture";

function parsed(raw: unknown = syntheticStatementFile()): CardStatementFile {
  const result = parseCardStatementFile(raw);
  if (!result.ok) throw new Error(result.errors.join("\n"));
  return result.file;
}
function withRecord(index: number, patch: Record<string, unknown>) {
  const file = syntheticStatementFile();
  file.records[index] = { ...file.records[index], ...patch };
  return file;
}
function errorsOf(raw: unknown) {
  const result = parseCardStatementFile(raw);
  return result.ok ? [] : result.errors;
}
const OPEN_BETULA = 13, FIRST_FORECAST = 20, FIRST_PAID = 0, FIRST_FUTURE = 15;

describe("card statement file validation", () => {
  it("accepts the 27-record file and keeps every amount as exact integer cents", () => {
    const file = parsed();
    const totals = statementFileTotals(file.records);
    expect(file.records).toHaveLength(27);
    expect(totals.countsByType).toEqual({ PAST_STATEMENT: 12, CURRENT_STATEMENT: 3, FUTURE_STATEMENT: 5, FUTURE_MONTHLY_PROJECTION: 7 });
    expect(file.records.every((record) => Number.isSafeInteger(record.amountCents))).toBe(true);
    expect(totals.paidHistoricCents).toBe(EXPECTED.paidCents);
    expect(totals.currentOutstandingCents).toBe(EXPECTED.openCents);
    expect(totals.futureKnownCents).toBe(EXPECTED.futureKnownCents);
    expect(totals.forecastCents).toBe(EXPECTED.forecastCents);
    expect(totals.forecastPendingCents).toBe(EXPECTED.pendingCents);
    expect(totals.forecastCountedCents).toBe(EXPECTED.forecastCents - EXPECTED.pendingCents);
    expect(totals.paidZeroCount).toBe(2);
    expect(totals.dueDates).toEqual(EXPECTED.dueDates);
  });

  it("rejects decimal amounts instead of rounding them and enforces the column limit", () => {
    expect(errorsOf(withRecord(0, { amountCents: 4077.57 })).join()).toContain("centavos inteiros");
    expect(errorsOf(withRecord(0, { amountCents: 2_147_483_648 })).length).toBeGreaterThan(0);
    expect(errorsOf(withRecord(0, { amountCents: -1 })).join()).toContain("valor negativo");
    expect(errorsOf(withRecord(0, { amountCents: "10" })).length).toBeGreaterThan(0);
  });

  it("never accepts invented dates", () => {
    expect(errorsOf(withRecord(FIRST_FORECAST, { dueDate: "2031-05-10" })).join()).toContain("previsão mensal não pode ter vencimento");
    expect(errorsOf(withRecord(FIRST_PAID, { dueDate: null })).join()).toContain("fatura sem data de vencimento");
    expect(errorsOf(withRecord(OPEN_BETULA, { paymentDate: "2031-03-01" })).join()).toContain("só é aceita em fatura paga");
    expect(errorsOf(withRecord(FIRST_PAID, { paymentDate: "2031-03-20" })).join()).toContain("posterior à data-base");
    expect(errorsOf(withRecord(FIRST_FUTURE, { dueDate: "2031-03-01" })).join()).toContain("vencimento já ocorrido");
    expect(errorsOf(withRecord(FIRST_PAID, { dueDate: "2031-02-30" })).length).toBeGreaterThan(0);
  });

  it("rejects contradictory flags, statuses and currencies", () => {
    expect(errorsOf(withRecord(FIRST_PAID, { isCurrentOutstanding: true })).join()).toContain("isCurrentOutstanding contradiz");
    expect(errorsOf(withRecord(OPEN_BETULA, { excludeFromCurrentDebtTotal: true })).join()).toContain("excludeFromCurrentDebtTotal contradiz");
    expect(errorsOf(withRecord(FIRST_FUTURE, { paymentStatus: "PAID" })).join()).toContain("não aceita o status");
    expect(errorsOf(withRecord(FIRST_PAID, { currency: "USD" })).join()).toContain("somente BRL");
  });

  it("checks the declared summary against the records", () => {
    const file = syntheticStatementFile();
    expect(errorsOf({ ...file, summary: { ...file.summary, recordCount: 26 } }).join()).toContain("declara 26 registros");
    expect(errorsOf({ ...file, summary: { ...file.summary, counts: { ...file.summary.counts, PAST_STATEMENT: 11 } } }).join()).toContain("11 registros PAST_STATEMENT");
    expect(errorsOf({ ...file, summary: { ...file.summary, currentOutstandingCents: EXPECTED.openCents + 1 } }).join()).toContain("dívida atual");
  });

  it("rejects duplicated keys and periods instead of importing twice", () => {
    const file = syntheticStatementFile();
    file.records[1] = { ...file.records[1], externalKey: file.records[0].externalKey };
    expect(errorsOf(file).join()).toContain("externalKey repetido");
    expect(errorsOf(withRecord(1, { dueDate: file.records[0].dueDate })).join()).toContain("Mais de um registro de Alfa Bank");
  });
  it("rejects repeated card competence even with different due dates or record kinds", () => {
    const file=syntheticStatementFile();
    file.records[13]={...file.records[13],referenceMonth:"2031-05"};
    expect(errorsOf(file).join()).toContain("competência 2031-05");
  });
});

describe("card account resolution", () => {
  it("reuses the workspace card by institution or name, ignoring accents and case", () => {
    const { resolved, errors } = resolveIssuerAccounts(parsed().records, [
      { id: "acc-alfa", name: "Cartão roxo", institution: "ALFA BANK" },
      { id: "acc-betula", name: "Betula Gold", institution: null },
    ]);
    expect(errors).toEqual([]);
    expect(resolved.map(({ issuerKey: key, action, accountId }) => [key, action, accountId])).toEqual([
      ["alfa bank", "REUSE", "acc-alfa"], ["betula", "REUSE", "acc-betula"], ["cometa pay", "CREATE", null],
    ]);
    expect(issuerKey("Itaú")).toBe("itau");
  });

  it("blocks the import when two cards could match instead of guessing", () => {
    const { errors } = resolveIssuerAccounts(parsed().records, [
      { id: "a", name: "Alfa Bank", institution: null }, { id: "b", name: "Alfa Bank", institution: null },
    ]);
    expect(errors.join()).toContain("2 cartões de crédito que correspondem a Alfa Bank");
  });
});

function existingFrom(file: CardStatementFile, accountFor: (issuerKey: string) => string): ExistingStatement[] {
  return file.records.map((record, index) => ({
    id: `st-${index}`, accountId: accountFor(record.issuerKey), externalKey: record.externalKey, periodKey: record.periodKey, kind: record.kind,
    status: record.status, amountCents: record.amountCents, dueDate: record.dueDate, closingDate: record.closingDate, closingDay: record.closingDay,
    referenceMonth: record.referenceMonth, paidAt: record.paidAt, reconciliation: "NOT_REQUIRED", overlapsStatementId: null,
    sourceRecordType: record.recordType, sourceAsOf: file.asOfDate, notes: record.notes, addedCents: 0,
  }));
}
const reuseAll = (file: CardStatementFile) => resolveIssuerAccounts(file.records, [
  { id: "acc-alfa bank", name: "Alfa Bank", institution: "Alfa Bank" }, { id: "acc-betula", name: "Bétula", institution: "Bétula" }, { id: "acc-cometa pay", name: "Cometa Pay", institution: "Cometa Pay" },
]).resolved;

describe("idempotent import plan", () => {
  it("creates all 27 records in an empty workspace and flags the overlapping forecast", () => {
    const file = parsed();
    const plan = planCardStatementImport(file, resolveIssuerAccounts(file.records, []).resolved, []);
    expect(plan.errors).toEqual([]);
    expect(plan.counts).toEqual({ create: 27, update: 0, promote: 0, keep: 0, conflict: 0 });
    const forecast = plan.items.find((item) => item.record.externalKey === KEYS.betulaFirstForecast)!;
    expect(forecast.overlap).toEqual({ targetExternalKey: KEYS.betulaCurrent, targetExistingId: null, reconciliation: "PENDING" });
    expect(plan.items.filter((item) => item.overlap)).toHaveLength(1);
  });

  it("keeps everything when the same file is planned again", () => {
    const file = parsed();
    const existing = existingFrom(file, (key) => `acc-${key}`);
    existing[FIRST_FORECAST] = { ...existing[FIRST_FORECAST], reconciliation: "PENDING", overlapsStatementId: `st-${OPEN_BETULA}` };
    const plan = planCardStatementImport(file, reuseAll(file), existing);
    expect(plan.counts).toEqual({ create: 0, update: 0, promote: 0, keep: 27, conflict: 0 });
  });

  it("matches a newer file by card and period even when its keys differ, without duplicating", () => {
    const newer = syntheticStatementFile("2031-04-10", "other-run");
    newer.records[FIRST_FUTURE] = { ...newer.records[FIRST_FUTURE], recordType: "CURRENT_STATEMENT", paymentStatus: "OPEN", isCurrentOutstanding: true, excludeFromCurrentDebtTotal: false, amountCents: 12_000 };
    newer.records[14] = { ...newer.records[14], paymentStatus: "PAID", isCurrentOutstanding: false, excludeFromCurrentDebtTotal: true, recordType: "PAST_STATEMENT", dueDate: "2031-03-25" };
    newer.summary.counts = { PAST_STATEMENT: 13, CURRENT_STATEMENT: 3, FUTURE_STATEMENT: 4, FUTURE_MONTHLY_PROJECTION: 7 };
    newer.summary.currentOutstandingCents = 100_001 + 250_050 + 12_000;
    const original = parsed();
    const existing = existingFrom(original, (key) => `acc-${key}`);
    existing[FIRST_FORECAST] = { ...existing[FIRST_FORECAST], reconciliation: "PENDING", overlapsStatementId: `st-${OPEN_BETULA}` };
    const file = parsed(newer);
    const plan = planCardStatementImport(file, reuseAll(file), existing);
    expect(plan.errors).toEqual([]);
    expect(plan.counts.create).toBe(0);
    const promoted = plan.items[FIRST_FUTURE];
    expect([promoted.action, promoted.existingId, promoted.values.status, promoted.values.amountCents]).toEqual(["UPDATE", `st-${FIRST_FUTURE}`, "OPEN", 12_000]);
    expect(plan.items[14].action).toBe("UPDATE");
  });

  it("never downgrades a paid statement, never applies stale data and never erases stored values", () => {
    const file = parsed();
    const existing = existingFrom(file, (key) => `acc-${key}`);
    existing[OPEN_BETULA] = { ...existing[OPEN_BETULA], status: "PAID" };
    existing[FIRST_PAID] = { ...existing[FIRST_PAID], amountCents: 999 };
    existing[1] = { ...existing[1], sourceAsOf: "2031-12-31" };
    existing[2] = { ...existing[2], closingDate: "2030-05-28" };
    const plan = planCardStatementImport(file, reuseAll(file), existing);
    expect(plan.items[OPEN_BETULA].action).toBe("CONFLICT");
    expect(plan.items[FIRST_PAID].action).toBe("CONFLICT");
    expect(plan.items[FIRST_PAID].values.amountCents).toBe(999);
    expect(plan.items[1]).toMatchObject({ action: "KEEP", reason: expect.stringContaining("mais recente") });
    expect(plan.items[2]).toMatchObject({ action: "KEEP" });
    expect(plan.items[2].values.closingDate).toBe("2030-05-28");
  });

  it("does not let a key that already names another statement overwrite it", () => {
    const file = parsed();
    const existing = existingFrom(file, (key) => `acc-${key}`).slice(0, 1).map((row) => ({ ...row, periodKey: "due:2029-01-05" }));
    const plan = planCardStatementImport(file, reuseAll(file), existing);
    expect(plan.items[0]).toMatchObject({ action: "CONFLICT", reason: expect.stringContaining("outra fatura") });
  });
});

describe("dashboard summary", () => {
  function rows(today: string, reconciliation: StatementRow["reconciliation"] = "PENDING") {
    const file = parsed();
    const list: StatementRow[] = existingFrom(file, (key) => `acc-${key}`).map((row) => ({ ...row, accountName: row.accountId.slice(4) }));
    list[FIRST_FORECAST] = { ...list[FIRST_FORECAST], reconciliation, overlapsStatementId: `st-${OPEN_BETULA}` };
    return summarizeCardStatements(list, today);
  }

  it("counts only open statements as current debt, each with its own due date", () => {
    const summary = rows(AS_OF);
    expect(summary.openCents).toBe(EXPECTED.openCents);
    expect(summary.dueDates).toEqual(EXPECTED.dueDates);
    expect(summary.overdueCents).toBe(0);
    expect(summary.paid).toHaveLength(12);
    expect(summary.paidCents).toBe(EXPECTED.paidCents);
    expect(summary.paid.every((row) => row.paidAt === null)).toBe(true);
    expect(summary.paid.filter((row) => row.amountCents === 0)).toHaveLength(2);
  });

  it("keeps the ambiguous forecast out of every total until it is reconciled", () => {
    const pending = rows(AS_OF);
    expect(pending.pendingCents).toBe(EXPECTED.pendingCents);
    expect(pending.forecastCountedCents).toBe(EXPECTED.forecastCents - EXPECTED.pendingCents);
    expect(pending.months.find((month) => month.month === "2031-05")).toMatchObject({ openCents: 250_050, futureKnownCents: 11_111, forecastCents: 0, pendingCents: 7000 });
    expect(rows(AS_OF, "INCLUDED_IN_STATEMENT").forecastCountedCents).toBe(EXPECTED.forecastCents - EXPECTED.pendingCents);
    expect(rows(AS_OF, "SEPARATE_CHARGE").forecastCountedCents).toBe(EXPECTED.forecastCents);
  });

  it("marks open statements overdue only after their due date and never marks forecasts", () => {
    const later = rows("2031-04-06");
    expect(later.open.filter((row) => row.overdue).map((row) => row.dueDate)).toEqual(["2031-03-25", "2031-04-05"]);
    expect(later.overdueCents).toBe(30 + 100_001);
    expect(later.openCents).toBe(EXPECTED.openCents);
    expect(later.byAccount["acc-cometa pay"]).toMatchObject({ openCents: 30, overdue: true, nextDueDate: "2031-03-25", closingDate: "2031-03-18" });
    expect(later.byAccount["acc-betula"]).toMatchObject({ openCents: 250_050, overdue: false, closingDate: null, closingDay: 27 });
  });
});
