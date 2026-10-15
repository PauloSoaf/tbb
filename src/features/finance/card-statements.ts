import { z } from "zod";
import type { CardStatementKind, CardStatementReconciliation, CardStatementStatus } from "@prisma/client";
import { addDays, dateKeyToUTC, formatDay, isDateKey } from "@/lib/dates";
import { money } from "./money";
import type { StatementProvenance } from "./statement-provenance";

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
  const competences = new Set<string>();
  for (const record of records) {
    if (byKey.has(record.externalKey)) errors.push(`externalKey repetido no arquivo: ${record.externalKey}`);
    byKey.set(record.externalKey, record);
    const natural = `${record.issuerKey}|${record.periodKey}`;
    if (naturalKeys.has(natural)) errors.push(`Mais de um registro de ${record.issuer} para ${record.periodKey}.`);
    naturalKeys.add(natural);
    if (!record.referenceMonth) continue;
    // One competence is one bill: it cannot be both a forecast and a statement in the same file.
    const competence = `${record.issuerKey}|${record.referenceMonth}`;
    if (competences.has(competence)) errors.push(`A competência ${record.referenceMonth} de ${record.issuer} aparece em mais de um registro.`);
    competences.add(competence);
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
  /** Card expenses the user added on top of the declared amount (ADDED_TO_STATEMENT links). */
  addedCents: number;
  /** All linked expense detail, including amounts already in the declared bill. */
  detailedCents?: number;
};
export type StatementValues = Pick<ExistingStatement, "kind" | "status" | "periodKey" | "amountCents" | "dueDate" | "closingDate" | "closingDay" | "referenceMonth" | "paidAt" | "sourceRecordType" | "sourceAsOf" | "notes">;
export type PlanAction = "CREATE" | "UPDATE" | "PROMOTE" | "KEEP" | "CONFLICT";
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
export type StatementPlan = { items: PlannedStatement[]; errors: string[]; counts: Record<"create" | "update" | "promote" | "keep" | "conflict", number>; untouchedExisting: number };

const MATERIAL_FIELDS: [keyof StatementValues, string][] = [
  ["status", "status"], ["amountCents", "valor"], ["dueDate", "vencimento"], ["closingDate", "fechamento"], ["closingDay", "dia de fechamento"],
  ["referenceMonth", "competência"], ["paidAt", "data de pagamento"], ["notes", "observação"], ["sourceRecordType", "tipo de origem"],
];
const RESOLVED: CardStatementReconciliation[] = ["INCLUDED_IN_STATEMENT", "SEPARATE_CHARGE"];
const STATUS_LABEL: Record<CardStatementStatus, string> = { PAID: "uma fatura paga", OPEN: "uma fatura aberta", FUTURE_KNOWN: "uma fatura futura conhecida", FORECAST: "uma previsão" };
const describe = (row: ExistingStatement) => `${STATUS_LABEL[row.status]} ${row.dueDate ? `com vencimento ${row.dueDate}` : `de ${row.referenceMonth}`}`;

/** Pure, deterministic diff between the file and the workspace's current statements. A record
 * matches by externalKey, then by card + period (a file with another as-of date) and finally by
 * card + competence, which promotes a monthly forecast to its known statement in place, keeping
 * its id. Anything ambiguous is a conflict: nothing is duplicated, deleted or overwritten. */
export function planCardStatementImport(file: CardStatementFile, resolved: ResolvedIssuer[], existing: ExistingStatement[]): StatementPlan {
  const errors: string[] = [];
  const accountFor = new Map(resolved.map((item) => [item.issuerKey, item.accountId]));
  const byExternalKey = new Map(existing.map((row) => [row.externalKey, row]));
  const byNaturalKey = new Map(existing.map((row) => [`${row.accountId}|${row.periodKey}`, row]));
  const byCompetence = new Map<string, ExistingStatement[]>();
  for (const row of existing) {
    if (!row.referenceMonth) continue;
    const key = `${row.accountId}|${row.referenceMonth}`;
    byCompetence.set(key, [...(byCompetence.get(key) || []), row]);
  }
  const matched = file.records.map((record) => {
    const accountId = accountFor.get(record.issuerKey) ?? null;
    const competence = accountId && record.referenceMonth ? byCompetence.get(`${accountId}|${record.referenceMonth}`) || [] : [];
    const byKey = byExternalKey.get(record.externalKey);
    const identity = byKey ?? (accountId ? byNaturalKey.get(`${accountId}|${record.periodKey}`) : undefined);
    if (identity) {
      const collision = byKey && (byKey.accountId !== accountId || byKey.periodKey !== record.periodKey);
      return { record, accountId, current: identity, how: collision ? "collision" as const : "identity" as const, others: competence.filter((row) => row.id !== identity.id) };
    }
    if (competence.length > 1) return { record, accountId, current: null, how: "ambiguous" as const, others: competence };
    return { record, accountId, current: competence[0] ?? null, how: competence.length ? "competence" as const : "new" as const, others: [] as ExistingStatement[] };
  });
  const incoming = new Map(matched.map((item) => [item.record.externalKey, item]));

  const items = matched.map(({ record, accountId, current, how, others }): PlannedStatement => {
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
    if (how === "ambiguous") return { ...base, action: "CONFLICT", values: incomingValues, overlap: null, reason: `Há ${others.length} registros salvos na competência ${record.referenceMonth}; concilie antes de importar.` };
    if (!current) return { ...base, action: "CREATE", values: incomingValues, reason: null };
    const kept = { ...base, values: pickValues(current), overlap: null };
    if (how === "collision") return { ...kept, action: "CONFLICT", reason: "Esta externalKey já identifica outra fatura (cartão ou período diferente)." };
    if (others.length) return { ...kept, action: "CONFLICT", reason: `A competência ${record.referenceMonth} já tem ${describe(others[0])}; nada foi alterado. Concilie antes de importar.` };
    if ((current.detailedCents ?? 0) > record.amountCents + current.addedCents) return { ...kept, action: "CONFLICT", reason: "O novo valor ficaria abaixo dos gastos já detalhados na fatura. Confira os vínculos antes de importar." };
    if (file.asOfDate < current.sourceAsOf) return { ...kept, action: "KEEP", reason: `Já existe versão mais recente (data-base ${current.sourceAsOf}).` };
    if (how === "competence") {
      if (record.kind === "MONTHLY_PROJECTION") return { ...kept, action: "CONFLICT", reason: `Já existe ${describe(current)} nesta competência; uma previsão não substitui uma fatura.` };
      if (current.kind === "STATEMENT") return { ...kept, action: "CONFLICT", reason: `Já existe ${describe(current)} nesta competência; confira o vencimento antes de importar.` };
      if (current.reconciliation === "INCLUDED_IN_STATEMENT") return { ...kept, action: "CONFLICT", reason: "Você marcou esta previsão como já incluída em outra fatura; o arquivo a trata como fatura própria. Revise antes de promover." };
      if (current.addedCents) return { ...kept, action: "CONFLICT", reason: `A previsão tem ${money(current.addedCents)} em gastos somados manualmente; confira se o valor do banco já os inclui.` };
      // The forecast becomes the statement itself: same id, its competence kept, overlap cleared on apply.
      const values: StatementValues = { ...incomingValues, closingDay: record.closingDay ?? current.closingDay, notes: record.notes ?? current.notes };
      const changes = ["previsão promovida a fatura conhecida", ...MATERIAL_FIELDS.filter(([field]) => values[field] !== current[field]).map(([, label]) => label)];
      return { ...base, action: "PROMOTE", values, changes, reason: null };
    }
    if (STATUS_RANK[record.status] < STATUS_RANK[current.status]) return { ...kept, action: "CONFLICT", reason: `O registro salvo está ${current.status}; a importação não rebaixa para ${record.status}.` };
    if (current.status === "PAID" && record.amountCents !== current.amountCents) return { ...kept, action: "CONFLICT", reason: "Fatura já quitada com valor diferente; o valor confirmado foi preservado." };
    if (current.addedCents && record.amountCents !== current.amountCents) return { ...kept, action: "CONFLICT", reason: `Esta fatura tem ${money(current.addedCents)} em gastos somados manualmente; confira se o novo valor do banco já os inclui.` };
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
  return {
    items, errors,
    counts: { create: count("CREATE"), update: count("UPDATE"), promote: count("PROMOTE"), keep: count("KEEP"), conflict: count("CONFLICT") },
    untouchedExisting: existing.filter((row) => !touched.has(row.id)).length,
  };
}

function pickValues(row: ExistingStatement): StatementValues {
  const { kind, status, periodKey, amountCents, dueDate, closingDate, closingDay, referenceMonth, paidAt, sourceRecordType, sourceAsOf, notes } = row;
  return { kind, status, periodKey, amountCents, dueDate, closingDate, closingDay, referenceMonth, paidAt, sourceRecordType, sourceAsOf, notes };
}

export type StatementRow = {
  id: string; accountId: string; accountName: string; kind: CardStatementKind; status: CardStatementStatus; amountCents: number;
  dueDate: string | null; closingDate: string | null; closingDay: number | null; referenceMonth: string | null; paidAt: string | null;
  reconciliation: CardStatementReconciliation; overlapsStatementId: string | null; notes: string | null;
  /** `amountCents` is the bill total: the declared amount plus expenses added on top of it. */
  version?: string; declaredCents?: number; addedCents?: number; detailedCents?: number; detailCount?: number;
  paidCents?: number; rolledIntoStatementId?: string | null; amountIsOutstanding?: boolean;
  /** Payments registered on the bill; a payment without a date keeps `date` null. */
  payments?: { amountCents: number; date: string | null }[];
  /** Where the numbers come from and when; see statement-provenance.ts. */
  provenance?: StatementProvenance;
};
export type CardTotals = {
  accountName: string; openCents: number; openCount: number; overdue: boolean; nextDueDate: string | null; closingDate: string | null; closingDay: number | null;
  futureKnownCents: number; futureKnownCount: number; paidCents: number; paidCount: number; forecastCents: number;
};

/** Current debt is only OPEN statements. Paid history, known future statements and forecasts
 * are reported separately; a forecast pending reconciliation never adds to any total. */
export function summarizeCardStatements(rows: StatementRow[], today: string) {
  const byDue = (a: StatementRow, b: StatementRow) => (a.dueDate || "").localeCompare(b.dueDate || "") || a.accountName.localeCompare(b.accountName);
  const open = rows.filter((row) => row.status === "OPEN" && !row.rolledIntoStatementId).sort(byDue).map((row) => ({ ...row, overdue: (row.dueDate || "") < today }));
  const carried = rows.filter(row => row.rolledIntoStatementId);
  const paid = rows.filter((row) => row.status === "PAID").sort((a, b) => byDue(b, a));
  const futureKnown = rows.filter((row) => row.status === "FUTURE_KNOWN").sort(byDue).map((row) => ({ ...row, awaitingUpdate: Boolean(row.dueDate && row.dueDate < today) }));
  const forecasts = rows.filter((row) => row.status === "FORECAST")
    .sort((a, b) => (a.referenceMonth || "").localeCompare(b.referenceMonth || "") || a.accountName.localeCompare(b.accountName))
    .map((row) => ({ ...row, counted: row.reconciliation === "NOT_REQUIRED" || row.reconciliation === "SEPARATE_CHARGE" }));
  const pending = forecasts.filter((row) => row.reconciliation === "PENDING");
  const byAccount: Record<string, CardTotals> = {};
  const card = (row: StatementRow) => (byAccount[row.accountId] ??= {
    accountName: row.accountName, openCents: 0, openCount: 0, overdue: false, nextDueDate: null, closingDate: null, closingDay: null,
    futureKnownCents: 0, futureKnownCount: 0, paidCents: 0, paidCount: 0, forecastCents: 0,
  });
  for (const row of rows) card(row);
  for (const row of open) {
    const account = card(row);
    account.openCents += row.amountCents;
    account.openCount++;
    account.overdue ||= row.overdue;
    if (!account.nextDueDate) Object.assign(account, { nextDueDate: row.dueDate, closingDate: row.closingDate, closingDay: row.closingDay });
  }
  for (const row of futureKnown) { const account = card(row); account.futureKnownCents += row.amountCents; account.futureKnownCount++; }
  for (const row of paid) { const account = card(row); account.paidCents += row.amountCents; account.paidCount++; }
  for (const row of forecasts) if (row.counted) card(row).forecastCents += row.amountCents;
  const months = new Map<string, { month: string; openCents: number; futureKnownCents: number; forecastCents: number; pendingCents: number }>();
  const month = (key: string) => months.get(key) ?? months.set(key, { month: key, openCents: 0, futureKnownCents: 0, forecastCents: 0, pendingCents: 0 }).get(key)!;
  for (const row of open) month((row.dueDate || "").slice(0, 7)).openCents += row.amountCents;
  for (const row of futureKnown) month(row.dueDate ? row.dueDate.slice(0, 7) : row.referenceMonth || "unknown").futureKnownCents += row.amountCents;
  for (const row of forecasts) {
    if (row.reconciliation === "INCLUDED_IN_STATEMENT") continue; // already inside the linked statement
    month(row.referenceMonth || "")[row.counted ? "forecastCents" : "pendingCents"] += row.amountCents;
  }
  return {
    carried,
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

const iso = (date: Date) => date.toISOString().slice(0, 10);
const dayOfMonth = (year: number, month: number, day: number) => new Date(Date.UTC(year, month, Math.min(day, new Date(Date.UTC(year, month + 1, 0)).getUTCDate())));
export type PurchaseStatement = Pick<StatementRow, "id" | "accountId" | "kind" | "status" | "dueDate" | "closingDate" | "closingDay">;

/** Closing date used to place a purchase. Only a stored closingDate is exact; one derived from the
 * closing day or from the card's usual closing→due gap is an estimate and is never persisted. */
export function statementClosing(statement: PurchaseStatement, card: PurchaseStatement[]): { date: string; estimated: boolean } | null {
  if (statement.kind !== "STATEMENT" || !statement.dueDate) return null;
  if (statement.closingDate) return { date: statement.closingDate, estimated: false };
  const due = dateKeyToUTC(statement.dueDate);
  if (statement.closingDay) {
    let closing = dayOfMonth(due.getUTCFullYear(), due.getUTCMonth(), statement.closingDay);
    if (closing >= due) closing = dayOfMonth(due.getUTCFullYear(), due.getUTCMonth() - 1, statement.closingDay);
    return { date: iso(closing), estimated: true };
  }
  const reference = card.find((row) => row.closingDate && row.dueDate);
  if (!reference) return null;
  const gap = Math.round((dateKeyToUTC(reference.dueDate!).getTime() - dateKeyToUTC(reference.closingDate!).getTime()) / 86_400_000);
  return { date: addDays(statement.dueDate, -gap), estimated: true };
}

export type StatementSuggestion = { statementId: string; dueDate: string; closing: string; estimated: boolean; status: CardStatementStatus };
/** The bill a purchase lands on: the card's first statement whose closing comes after the purchase.
 * A purchase on the closing day already belongs to the next bill. */
export function suggestStatementForPurchase(statements: PurchaseStatement[], accountId: string, purchaseDate: string): StatementSuggestion | null {
  const card = statements.filter((row) => row.accountId === accountId && row.kind === "STATEMENT" && row.dueDate).sort((a, b) => a.dueDate!.localeCompare(b.dueDate!));
  let windowStart: string | null = null;
  for (const statement of card) {
    const closing = statementClosing(statement, card);
    if (!closing) continue;
    const closingDate = dateKeyToUTC(closing.date);
    const start = windowStart ?? iso(dayOfMonth(closingDate.getUTCFullYear(), closingDate.getUTCMonth() - 1, closingDate.getUTCDate()));
    if (purchaseDate >= start && purchaseDate < closing.date) return { statementId: statement.id, dueDate: statement.dueDate!, closing: closing.date, estimated: closing.estimated, status: statement.status };
    windowStart = closing.date;
  }
  return null;
}

export type StatementDetailMode = "ALREADY_INCLUDED" | "ADDED_TO_STATEMENT";
/** A detailed purchase either already sits inside the bill or is added on top of it. A paid bill
 * never changes, and the detailed purchases may never add up to more than the bill. */
export function statementLinkError(statement: { status: CardStatementStatus; amountCents: number; detailedCents: number }, mode: StatementDetailMode, amountCents: number) {
  if (mode === "ADDED_TO_STATEMENT" && statement.status === "PAID") return "Esta fatura já foi paga e o valor dela não muda. Marque o gasto como já incluído.";
  const total = statement.amountCents + (mode === "ADDED_TO_STATEMENT" ? amountCents : 0);
  if (statement.detailedCents + amountCents > total) return `Os gastos detalhados somariam ${money(statement.detailedCents + amountCents)}, acima do total da fatura (${money(total)}). Se a compra não estava na fatura, escolha somar ao valor dela.`;
  return null;
}

export type StatementAlert = { id: string; tone: "danger" | "warning" | "info"; title: string; detail: string; href: string };
const TONE_ORDER = { danger: 0, warning: 1, info: 2 } as const;
const shortDay = (value: string) => formatDay(value, "pt-BR", { day: "2-digit", month: "2-digit" });
const monthName = (key: string) => new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(dateKeyToUTC(`${key}-01`));

/** Few, actionable alerts: overdue and imminent bills, pending reconciliation, months that weigh
 * on the income, concentration in one card and cards whose limit is unknown. */
export function statementAlerts(summary: CardStatementSummary, context: { today: string; monthlyIncomeCents: number; cardsWithoutLimit: string[] }): StatementAlert[] {
  const alerts: StatementAlert[] = [];
  const soon = addDays(context.today, 7);
  for (const row of summary.open) {
    if (row.overdue) alerts.push({ id: `overdue-${row.id}`, tone: "danger", title: `${row.accountName}: fatura vencida em ${shortDay(row.dueDate!)}`, detail: `${money(row.amountCents)} continuam em aberto. Confira o pagamento.`, href: `#fatura-${row.id}` });
    else if (row.dueDate! <= soon) {
      const days = Math.round((dateKeyToUTC(row.dueDate!).getTime() - dateKeyToUTC(context.today).getTime()) / 86_400_000);
      alerts.push({ id: `soon-${row.id}`, tone: "warning", title: days ? `${row.accountName} vence em ${days} dia${days > 1 ? "s" : ""}` : `${row.accountName} vence hoje`, detail: `${money(row.amountCents)} em ${shortDay(row.dueDate!)}.`, href: `#fatura-${row.id}` });
    }
  }
  for (const row of summary.pending) alerts.push({ id: `pending-${row.id}`, tone: "warning", title: `Previsão de ${row.accountName} a conciliar`, detail: `${money(row.amountCents)} de ${monthName(row.referenceMonth!)} ficam fora dos totais até você decidir.`, href: `#previsao-${row.id}` });
  const upcoming = summary.months.filter((item) => item.month >= context.today.slice(0, 7)).map((item) => ({ ...item, total: item.openCents + item.futureKnownCents + item.forecastCents }));
  if (context.monthlyIncomeCents > 0) {
    for (const item of upcoming.slice(0, 3)) {
      const share = Math.round(item.total / context.monthlyIncomeCents * 100);
      if (item.total * 100 >= context.monthlyIncomeCents * 70) alerts.push({ id: `income-${item.month}`, tone: item.total >= context.monthlyIncomeCents ? "danger" : "warning", title: `Vencimentos de ${monthName(item.month)} somam ${share}% da renda`, detail: `${money(item.total)} em faturas para ${money(context.monthlyIncomeCents)} de renda mensal.`, href: "#vencimentos" });
    }
  } else {
    const peak = [...upcoming].sort((a, b) => b.total - a.total)[0];
    if (peak && upcoming.length > 1) alerts.push({ id: `peak-${peak.month}`, tone: "info", title: `Mês mais pesado: ${monthName(peak.month)}`, detail: `${money(peak.total)} em vencimentos de cartão. Configure sua renda para comparar.`, href: "#vencimentos" });
  }
  const withOpen = Object.values(summary.byAccount).filter((card) => card.openCents > 0).sort((a, b) => b.openCents - a.openCents);
  if (withOpen.length > 1 && withOpen[0].openCents * 2 >= summary.openCents) {
    alerts.push({ id: "concentration", tone: "info", title: `${withOpen[0].accountName} concentra ${Math.round(withOpen[0].openCents / summary.openCents * 100)}% da dívida atual`, detail: `${money(withOpen[0].openCents)} de ${money(summary.openCents)} em faturas abertas.`, href: "#composicao" });
  }
  if (context.cardsWithoutLimit.length) alerts.push({ id: "limits", tone: "info", title: `${context.cardsWithoutLimit.length} cartão${context.cardsWithoutLimit.length > 1 ? "ões" : ""} sem limite configurado`, detail: `${context.cardsWithoutLimit.join(", ")}: informe o limite para acompanhar o uso.`, href: "/finance/accounts" });
  return alerts.sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone]).slice(0, 5);
}

/** Habitual closing and due days read from the registered bills (the most frequent day, so an
 * exceptional due date does not become the rule). Only a suggestion: the card's recurring cycle
 * changes when the user confirms it, and the bills keep their own dates. */
export function cardCycleSuggestion(rows: StatementRow[]) {
  const bills = rows.filter((row) => row.kind === "STATEMENT" && row.dueDate).sort((a, b) => b.dueDate!.localeCompare(a.dueDate!));
  if (!bills.length) return null;
  const mostFrequent = (values: number[]) => {
    const counts = new Map<number, number>();
    for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
    // Ties go to the most recent bill: values are listed newest first.
    return values.reduce<number | null>((best, value) => best === null || counts.get(value)! > counts.get(best)! ? value : best, null);
  };
  return {
    closingDay: mostFrequent(bills.flatMap((row) => row.closingDate ? [Number(row.closingDate.slice(8, 10))] : row.closingDay ? [row.closingDay] : [])),
    dueDay: mostFrequent(bills.map((row) => Number(row.dueDate!.slice(8, 10)))),
    statements: bills.length,
  };
}
