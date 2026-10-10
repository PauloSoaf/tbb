import { z } from "zod";
import type { CardStatementKind, CardStatementReconciliation, CardStatementStatus } from "@prisma/client";
import { isDateKey } from "@/lib/dates";

/** Card statements are aggregates kept beside the ledger: importing them never creates
 * FinanceTransaction rows. Amounts are integer cents and null always means "not provided". */

export const STATEMENT_RECORD_TYPES = ["PAST_STATEMENT", "CURRENT_STATEMENT", "FUTURE_STATEMENT", "FUTURE_MONTHLY_PROJECTION"] as const;
export type StatementRecordType = (typeof STATEMENT_RECORD_TYPES)[number];
const STATUSES = ["PAID", "OPEN", "FUTURE_KNOWN", "FORECAST"] as const satisfies readonly CardStatementStatus[];
const ALLOWED_STATUS: Record<StatementRecordType, readonly CardStatementStatus[]> = {
  PAST_STATEMENT: ["PAID", "OPEN"],
  CURRENT_STATEMENT: ["OPEN", "PAID"],
  FUTURE_STATEMENT: ["FUTURE_KNOWN"],
  FUTURE_MONTHLY_PROJECTION: ["FORECAST"],
};
// An import may move a statement forward (forecast → known → open → paid), never back.
const STATUS_RANK: Record<CardStatementStatus, number> = { FORECAST: 0, FUTURE_KNOWN: 1, OPEN: 2, PAID: 3 };
const MAX_CENTS = 2_147_483_647;

const dateKey = z.string().refine(isDateKey, "data inválida; use AAAA-MM-DD");
const monthKey = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "competência inválida; use AAAA-MM");
const recordSchema = z.object({
  externalKey: z.string().trim().min(1, "externalKey obrigatório").max(200),
  cardIssuer: z.string().trim().min(1, "cardIssuer obrigatório").max(60),
  recordType: z.enum(STATEMENT_RECORD_TYPES),
  amountCents: z.number().int("valor deve estar em centavos inteiros").min(0, "valor negativo").max(MAX_CENTS),
  currency: z.literal("BRL", "somente BRL é aceito"),
  dueDate: dateKey.nullish(),
  referenceMonth: monthKey.nullish(),
  closingDate: dateKey.nullish(),
  closingDayOfMonth: z.number().int().min(1).max(31).nullish(),
  paymentStatus: z.enum(STATUSES),
  paymentDate: dateKey.nullish(),
  isCurrentOutstanding: z.boolean().optional(),
  excludeFromCurrentDebtTotal: z.boolean().optional(),
  potentialOverlapKey: z.string().trim().min(1).max(200).nullish(),
  note: z.string().max(1000).nullish(),
});
const fileSchema = z.object({
  schemaVersion: z.literal("1.0", "schemaVersion deve ser 1.0"),
  source: z.string().max(100).optional(),
  asOfDate: dateKey,
  summary: z.looseObject({
    recordCount: z.number().int().optional(),
    counts: z.record(z.string(), z.number().int()).optional(),
    currentOutstandingCents: z.number().int().optional(),
  }).optional(),
  records: z.array(z.unknown()).min(1, "o arquivo não tem registros").max(500, "máximo de 500 registros por arquivo"),
});

export type CardStatementInput = {
  externalKey: string;
  issuer: string;
  issuerKey: string;
  recordType: StatementRecordType;
  kind: CardStatementKind;
  status: CardStatementStatus;
  periodKey: string;
  amountCents: number;
  dueDate: string | null;
  closingDate: string | null;
  closingDay: number | null;
  referenceMonth: string | null;
  paidAt: string | null;
  overlapsExternalKey: string | null;
  notes: string | null;
};
export type CardStatementFile = { asOfDate: string; source: string | null; records: CardStatementInput[]; declaredSummary: Record<string, unknown> | null };
export type ParseResult = { ok: true; file: CardStatementFile } | { ok: false; errors: string[] };

export function issuerKey(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function periodKeyFor(kind: CardStatementKind, dueDate: string | null, referenceMonth: string | null) {
  return kind === "STATEMENT" ? `due:${dueDate}` : `month:${referenceMonth}`;
}

export function parseCardStatementFile(raw: unknown): ParseResult {
  const parsed = fileSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: parsed.error.issues.map((issue) => `${issue.path.join(".") || "arquivo"}: ${issue.message}`) };
  const { asOfDate, summary } = parsed.data;
  const errors: string[] = [];
  const records: CardStatementInput[] = [];
  parsed.data.records.forEach((item, index) => {
    const label = `Registro ${index + 1}`;
    const result = recordSchema.safeParse(item);
    if (!result.success) {
      for (const issue of result.error.issues) errors.push(`${label}: ${issue.path.join(".")} ${issue.message}`);
      return;
    }
    const value = result.data;
    const kind: CardStatementKind = value.recordType === "FUTURE_MONTHLY_PROJECTION" ? "MONTHLY_PROJECTION" : "STATEMENT";
    const dueDate = value.dueDate ?? null, referenceMonth = value.referenceMonth ?? null, closingDate = value.closingDate ?? null;
    const paidAt = value.paymentDate ?? null, open = value.paymentStatus === "OPEN";
    const fail = (message: string) => errors.push(`${label} (${value.externalKey}): ${message}`);
    const before = errors.length;
    if (!ALLOWED_STATUS[value.recordType].includes(value.paymentStatus)) fail(`${value.recordType} não aceita o status ${value.paymentStatus}.`);
    if (kind === "STATEMENT" && !dueDate) fail("fatura sem data de vencimento.");
    if (kind === "MONTHLY_PROJECTION") {
      if (!referenceMonth) fail("previsão mensal sem competência (AAAA-MM).");
      if (dueDate) fail("previsão mensal não pode ter vencimento; use FUTURE_STATEMENT quando a data for conhecida.");
      if (closingDate) fail("previsão mensal não pode ter data de fechamento.");
      if (referenceMonth && referenceMonth < asOfDate.slice(0, 7)) fail("previsão para competência anterior à data-base.");
    }
    if (value.isCurrentOutstanding !== undefined && value.isCurrentOutstanding !== open) fail("isCurrentOutstanding contradiz o status.");
    if (value.excludeFromCurrentDebtTotal !== undefined && value.excludeFromCurrentDebtTotal === open) fail("excludeFromCurrentDebtTotal contradiz o status.");
    if (paidAt && value.paymentStatus !== "PAID") fail("data de pagamento só é aceita em fatura paga.");
    if (paidAt && paidAt > asOfDate) fail("data de pagamento posterior à data-base.");
    if (closingDate && dueDate && closingDate > dueDate) fail("fechamento posterior ao vencimento.");
    if (value.recordType === "PAST_STATEMENT" && dueDate && dueDate > asOfDate) fail("fatura passada com vencimento futuro.");
    if (value.recordType === "FUTURE_STATEMENT" && dueDate && dueDate <= asOfDate) fail("fatura futura com vencimento já ocorrido.");
    if (value.potentialOverlapKey === value.externalKey) fail("um registro não pode sobrepor a si mesmo.");
    if (errors.length > before) return;
    records.push({
      externalKey: value.externalKey, issuer: value.cardIssuer, issuerKey: issuerKey(value.cardIssuer), recordType: value.recordType,
      kind, status: value.paymentStatus, periodKey: periodKeyFor(kind, dueDate, referenceMonth), amountCents: value.amountCents,
      dueDate, closingDate, closingDay: value.closingDayOfMonth ?? null, referenceMonth, paidAt,
      overlapsExternalKey: value.potentialOverlapKey ?? null, notes: value.note?.trim() || null,
    });
  });
  if (errors.length) return { ok: false, errors };

  const byKey = new Map<string, CardStatementInput>();
  const naturalKeys = new Set<string>();
  for (const record of records) {
    if (byKey.has(record.externalKey)) errors.push(`externalKey repetido no arquivo: ${record.externalKey}`);
    byKey.set(record.externalKey, record);
    const natural = `${record.issuerKey}|${record.periodKey}`;
    if (naturalKeys.has(natural)) errors.push(`Mais de um registro de ${record.issuer} para ${record.periodKey}.`);
    naturalKeys.add(natural);
  }
  for (const record of records) {
    const target = record.overlapsExternalKey ? byKey.get(record.overlapsExternalKey) : undefined;
    if (target && (target.issuerKey !== record.issuerKey || target.kind !== "STATEMENT")) errors.push(`${record.externalKey}: a sobreposição deve apontar para uma fatura do mesmo cartão.`);
  }
  if (summary) {
    const totals = statementFileTotals(records);
    if (summary.recordCount !== undefined && summary.recordCount !== records.length) errors.push(`Resumo declara ${summary.recordCount} registros, mas o arquivo tem ${records.length}.`);
    if (summary.counts) {
      for (const type of new Set([...Object.keys(summary.counts), ...STATEMENT_RECORD_TYPES])) {
        const declared = summary.counts[type] ?? 0, actual = totals.countsByType[type as StatementRecordType] ?? 0;
        if (declared !== actual) errors.push(`Resumo declara ${declared} registros ${type}, mas o arquivo tem ${actual}.`);
      }
    }
    if (summary.currentOutstandingCents !== undefined && summary.currentOutstandingCents !== totals.currentOutstandingCents) {
      errors.push(`Resumo declara dívida atual de ${summary.currentOutstandingCents} centavos, mas as faturas abertas somam ${totals.currentOutstandingCents}.`);
    }
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, file: { asOfDate, source: parsed.data.source ?? null, records, declaredSummary: summary ?? null } };
}

const sumCents = (items: { amountCents: number }[]) => items.reduce((total, item) => total + item.amountCents, 0);

export function statementFileTotals(records: CardStatementInput[]) {
  const countsByType = Object.fromEntries(STATEMENT_RECORD_TYPES.map((type) => [type, records.filter((record) => record.recordType === type).length])) as Record<StatementRecordType, number>;
  const open = records.filter((record) => record.status === "OPEN");
  const paid = records.filter((record) => record.status === "PAID");
  const known = records.filter((record) => record.status === "FUTURE_KNOWN");
  const forecast = records.filter((record) => record.status === "FORECAST");
  const pending = forecast.filter((record) => record.overlapsExternalKey);
  const issuers = [...new Map(records.map((record) => [record.issuerKey, record.issuer])).entries()];
  return {
    recordCount: records.length,
    countsByType,
    currentOutstandingCents: sumCents(open),
    openCount: open.length,
    dueDates: [...new Set(open.map((record) => record.dueDate!))].sort(),
    paidCount: paid.length,
    paidZeroCount: paid.filter((record) => record.amountCents === 0).length,
    paidHistoricCents: sumCents(paid),
    futureKnownCount: known.length,
    futureKnownCents: sumCents(known),
    forecastCount: forecast.length,
    forecastCents: sumCents(forecast),
    forecastPendingCents: sumCents(pending),
    forecastCountedCents: sumCents(forecast) - sumCents(pending),
    byIssuer: issuers.map(([key, issuer]) => {
      const own = records.filter((record) => record.issuerKey === key);
      return {
        issuer,
        openCents: sumCents(own.filter((record) => record.status === "OPEN")),
        paidCents: sumCents(own.filter((record) => record.status === "PAID")),
        paidCount: own.filter((record) => record.status === "PAID").length,
        futureKnownCents: sumCents(own.filter((record) => record.status === "FUTURE_KNOWN")),
        forecastCents: sumCents(own.filter((record) => record.status === "FORECAST")),
      };
    }),
  };
}
export type StatementFileTotals = ReturnType<typeof statementFileTotals>;

export type CardAccountCandidate = { id: string; name: string; institution: string | null };
export type ResolvedIssuer = { issuer: string; issuerKey: string; action: "REUSE" | "CREATE"; accountId: string | null; accountName: string };

/** Reuses the workspace's own active credit-card account for each issuer. Ambiguity blocks the
 * import instead of guessing, so statements never land on the wrong card. */
export function resolveIssuerAccounts(records: CardStatementInput[], accounts: CardAccountCandidate[]) {
  const errors: string[] = [];
  const issuers = [...new Map(records.map((record) => [record.issuerKey, record.issuer])).entries()];
  const resolved = issuers.flatMap(([key, issuer]): ResolvedIssuer[] => {
    const words = (value: string | null) => ` ${issuerKey(value || "")} `;
    const levels = [
      accounts.filter((account) => issuerKey(account.institution || "") === key),
      accounts.filter((account) => issuerKey(account.name) === key),
      accounts.filter((account) => words(account.institution).includes(` ${key} `) || words(account.name).includes(` ${key} `)),
    ];
    const matches = levels.find((level) => level.length) || [];
    if (matches.length > 1) {
      errors.push(`Há ${matches.length} cartões de crédito que correspondem a ${issuer} (${matches.map((account) => account.name).join(", ")}). Arquive ou renomeie para deixar apenas um.`);
      return [];
    }
    return [matches[0]
      ? { issuer, issuerKey: key, action: "REUSE", accountId: matches[0].id, accountName: matches[0].name }
      : { issuer, issuerKey: key, action: "CREATE", accountId: null, accountName: issuer }];
  });
  return { resolved, errors };
}

export type ExistingStatement = {
  id: string; accountId: string; externalKey: string; periodKey: string; kind: CardStatementKind; status: CardStatementStatus;
  amountCents: number; dueDate: string | null; closingDate: string | null; closingDay: number | null; referenceMonth: string | null;
  paidAt: string | null; reconciliation: CardStatementReconciliation; overlapsStatementId: string | null;
  sourceRecordType: string; sourceAsOf: string; notes: string | null;
};
export type StatementValues = Pick<ExistingStatement, "kind" | "status" | "periodKey" | "amountCents" | "dueDate" | "closingDate" | "closingDay" | "referenceMonth" | "paidAt" | "sourceRecordType" | "sourceAsOf" | "notes">;
export type PlanAction = "CREATE" | "UPDATE" | "KEEP" | "CONFLICT";
export type PlannedOverlap = { targetExternalKey: string; targetExistingId: string | null; reconciliation: CardStatementReconciliation };
export type PlannedStatement = {
  record: CardStatementInput;
  accountId: string | null;
  existingId: string | null;
  action: PlanAction;
  values: StatementValues;
  overlap: PlannedOverlap | null;
  changes: string[];
  reason: string | null;
};
export type StatementPlan = { items: PlannedStatement[]; errors: string[]; counts: Record<"create" | "update" | "keep" | "conflict", number>; untouchedExisting: number };

const MATERIAL_FIELDS: [keyof StatementValues, string][] = [
  ["status", "status"], ["amountCents", "valor"], ["dueDate", "vencimento"], ["closingDate", "fechamento"], ["closingDay", "dia de fechamento"],
  ["referenceMonth", "competência"], ["paidAt", "data de pagamento"], ["notes", "observação"], ["sourceRecordType", "tipo de origem"],
];
const RESOLVED: CardStatementReconciliation[] = ["INCLUDED_IN_STATEMENT", "SEPARATE_CHARGE"];

/** Pure, deterministic diff between the file and the workspace's current statements.
 * Identity is the externalKey or, for files with another as-of date, the card + period. */
export function planCardStatementImport(file: CardStatementFile, resolved: ResolvedIssuer[], existing: ExistingStatement[]): StatementPlan {
  const errors: string[] = [];
  const accountFor = new Map(resolved.map((item) => [item.issuerKey, item.accountId]));
  const byExternalKey = new Map(existing.map((row) => [row.externalKey, row]));
  const byNaturalKey = new Map(existing.map((row) => [`${row.accountId}|${row.periodKey}`, row]));
  const matched = file.records.map((record) => {
    const accountId = accountFor.get(record.issuerKey) ?? null;
    const byKey = byExternalKey.get(record.externalKey);
    const collision = byKey && (byKey.accountId !== accountId || byKey.periodKey !== record.periodKey);
    const current = collision ? byKey : byKey ?? (accountId ? byNaturalKey.get(`${accountId}|${record.periodKey}`) : undefined);
    return { record, accountId, current: current ?? null, collision: Boolean(collision) };
  });
  const incoming = new Map(matched.map((item) => [item.record.externalKey, item]));

  const items = matched.map(({ record, accountId, current, collision }): PlannedStatement => {
    let overlap: PlannedOverlap | null = null;
    if (record.overlapsExternalKey) {
      const inFile = incoming.get(record.overlapsExternalKey);
      const inDb = inFile ? null : byExternalKey.get(record.overlapsExternalKey);
      if (!inFile && !inDb) errors.push(`${record.externalKey}: sobreposição aponta para ${record.overlapsExternalKey}, que não existe.`);
      else if (inDb && (inDb.accountId !== accountId || inDb.kind !== "STATEMENT")) errors.push(`${record.externalKey}: a sobreposição deve apontar para uma fatura do mesmo cartão.`);
      else {
        const targetExistingId = inFile ? inFile.current?.id ?? null : inDb!.id;
        const keepResolution = current && RESOLVED.includes(current.reconciliation) && current.overlapsStatementId === targetExistingId && targetExistingId;
        overlap = { targetExternalKey: record.overlapsExternalKey, targetExistingId, reconciliation: keepResolution ? current.reconciliation : "PENDING" };
      }
    }
    const incomingValues: StatementValues = {
      kind: record.kind, status: record.status, periodKey: record.periodKey, amountCents: record.amountCents, dueDate: record.dueDate,
      closingDate: record.closingDate, closingDay: record.closingDay, referenceMonth: record.referenceMonth, paidAt: record.paidAt,
      sourceRecordType: record.recordType, sourceAsOf: file.asOfDate, notes: record.notes,
    };
    const base = { record, accountId, existingId: current?.id ?? null, overlap, changes: [] as string[] };
    if (!current) return { ...base, action: "CREATE", values: incomingValues, reason: null };
    const kept = { ...base, values: pickValues(current), overlap: null };
    if (collision) return { ...kept, action: "CONFLICT", reason: "Esta externalKey já identifica outra fatura (cartão ou período diferente)." };
    if (file.asOfDate < current.sourceAsOf) return { ...kept, action: "KEEP", reason: `Já existe versão mais recente (data-base ${current.sourceAsOf}).` };
    if (STATUS_RANK[record.status] < STATUS_RANK[current.status]) return { ...kept, action: "CONFLICT", reason: `O registro salvo está ${current.status}; a importação não rebaixa para ${record.status}.` };
    if (current.status === "PAID" && record.amountCents !== current.amountCents) return { ...kept, action: "CONFLICT", reason: "Fatura já quitada com valor diferente; o valor confirmado foi preservado." };
    // Null in the file means "not provided": it never erases a value already stored.
    const values: StatementValues = {
      ...incomingValues,
      dueDate: record.dueDate ?? current.dueDate, closingDate: record.closingDate ?? current.closingDate, closingDay: record.closingDay ?? current.closingDay,
      referenceMonth: record.referenceMonth ?? current.referenceMonth, paidAt: record.paidAt ?? current.paidAt, notes: record.notes ?? current.notes,
    };
    const changes = MATERIAL_FIELDS.filter(([field]) => values[field] !== current[field]).map(([, label]) => label);
    if (overlap && (overlap.targetExistingId !== current.overlapsStatementId || overlap.reconciliation !== current.reconciliation)) changes.push("conciliação");
    if (!changes.length) return { ...base, action: "KEEP", values: pickValues(current), overlap: null, reason: "Idêntico ao registro salvo." };
    return { ...base, action: "UPDATE", values: { ...values, sourceAsOf: file.asOfDate }, changes, reason: null };
  });
  const count = (action: PlanAction) => items.filter((item) => item.action === action).length;
  const touched = new Set(items.map((item) => item.existingId).filter(Boolean));
  return { items, errors, counts: { create: count("CREATE"), update: count("UPDATE"), keep: count("KEEP"), conflict: count("CONFLICT") }, untouchedExisting: existing.filter((row) => !touched.has(row.id)).length };
}

function pickValues(row: ExistingStatement): StatementValues {
  const { kind, status, periodKey, amountCents, dueDate, closingDate, closingDay, referenceMonth, paidAt, sourceRecordType, sourceAsOf, notes } = row;
  return { kind, status, periodKey, amountCents, dueDate, closingDate, closingDay, referenceMonth, paidAt, sourceRecordType, sourceAsOf, notes };
}

export type StatementRow = {
  id: string; accountId: string; accountName: string; kind: CardStatementKind; status: CardStatementStatus; amountCents: number;
  dueDate: string | null; closingDate: string | null; closingDay: number | null; referenceMonth: string | null; paidAt: string | null;
  reconciliation: CardStatementReconciliation; overlapsStatementId: string | null; notes: string | null;
};

/** Current debt is only OPEN statements. Paid history, known future statements and forecasts
 * are reported separately; a forecast pending reconciliation never adds to any total. */
export function summarizeCardStatements(rows: StatementRow[], today: string) {
  const byDue = (a: StatementRow, b: StatementRow) => (a.dueDate || "").localeCompare(b.dueDate || "") || a.accountName.localeCompare(b.accountName);
  const open = rows.filter((row) => row.status === "OPEN").sort(byDue).map((row) => ({ ...row, overdue: (row.dueDate || "") < today }));
  const paid = rows.filter((row) => row.status === "PAID").sort((a, b) => byDue(b, a));
  const futureKnown = rows.filter((row) => row.status === "FUTURE_KNOWN").sort(byDue).map((row) => ({ ...row, awaitingUpdate: (row.dueDate || "") < today }));
  const forecasts = rows.filter((row) => row.status === "FORECAST")
    .sort((a, b) => (a.referenceMonth || "").localeCompare(b.referenceMonth || "") || a.accountName.localeCompare(b.accountName))
    .map((row) => ({ ...row, counted: row.reconciliation === "NOT_REQUIRED" || row.reconciliation === "SEPARATE_CHARGE" }));
  const pending = forecasts.filter((row) => row.reconciliation === "PENDING");
  const byAccount: Record<string, { openCents: number; overdue: boolean; nextDueDate: string | null; closingDate: string | null; closingDay: number | null }> = {};
  for (const row of rows) byAccount[row.accountId] ??= { openCents: 0, overdue: false, nextDueDate: null, closingDate: null, closingDay: null };
  for (const row of open) {
    const account = byAccount[row.accountId];
    account.openCents += row.amountCents;
    account.overdue ||= row.overdue;
    if (!account.nextDueDate) Object.assign(account, { nextDueDate: row.dueDate, closingDate: row.closingDate, closingDay: row.closingDay });
  }
  const months = new Map<string, { month: string; openCents: number; futureKnownCents: number; forecastCents: number; pendingCents: number }>();
  const month = (key: string) => months.get(key) ?? months.set(key, { month: key, openCents: 0, futureKnownCents: 0, forecastCents: 0, pendingCents: 0 }).get(key)!;
  for (const row of open) month((row.dueDate || "").slice(0, 7)).openCents += row.amountCents;
  for (const row of futureKnown) month((row.dueDate || "").slice(0, 7)).futureKnownCents += row.amountCents;
  for (const row of forecasts) {
    if (row.reconciliation === "INCLUDED_IN_STATEMENT") continue; // already inside the linked statement
    month(row.referenceMonth || "")[row.counted ? "forecastCents" : "pendingCents"] += row.amountCents;
  }
  return {
    openCents: sumCents(open),
    overdueCents: sumCents(open.filter((row) => row.overdue)),
    dueDates: [...new Set(open.map((row) => row.dueDate || ""))],
    open,
    paid,
    paidCents: sumCents(paid),
    futureKnown,
    futureKnownCents: sumCents(futureKnown),
    forecasts,
    forecastCountedCents: sumCents(forecasts.filter((row) => row.counted)),
    pending,
    pendingCents: sumCents(pending),
    byAccount,
    months: [...months.values()].sort((a, b) => a.month.localeCompare(b.month)),
  };
}
export type CardStatementSummary = ReturnType<typeof summarizeCardStatements>;
