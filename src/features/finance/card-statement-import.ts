import { createHash } from "node:crypto";
import type { CardStatementReconciliation, Prisma } from "@prisma/client";
import {
  parseCardStatementFile, planCardStatementImport, resolveIssuerAccounts, statementFileTotals, summarizeCardStatements,
  type ExistingStatement, type ResolvedIssuer, type StatementPlan, type StatementRow, type StatementValues,
} from "./card-statements";

/** The importer only sees accounts, statements and the audit log. It has no handle on
 * FinanceTransaction or Debt, so an import can never create expenses, payments or debts. */
export type CardStatementDb = Pick<Prisma.TransactionClient, "account" | "cardStatement" | "activityEvent">;

const dayOf = (value: Date | null) => (value ? value.toISOString().slice(0, 10) : null);
const dateOf = (value: string | null) => (value ? new Date(`${value}T00:00:00.000Z`) : null);
const statementSelect = {
  id: true, accountId: true, externalKey: true, periodKey: true, kind: true, status: true, amountCents: true, dueDate: true,
  closingDate: true, closingDay: true, referenceMonth: true, paidAt: true, reconciliation: true, overlapsStatementId: true,
  sourceRecordType: true, sourceAsOf: true, notes: true,
} satisfies Prisma.CardStatementSelect;

async function loadState(db: CardStatementDb, workspaceId: string) {
  const [accounts, statements] = await Promise.all([
    db.account.findMany({ where: { workspaceId, type: "CREDIT_CARD", isArchived: false }, select: { id: true, name: true, institution: true }, orderBy: { createdAt: "asc" } }),
    db.cardStatement.findMany({ where: { workspaceId }, select: statementSelect }),
  ]);
  const existing: ExistingStatement[] = statements.map((row) => ({
    ...row, dueDate: dayOf(row.dueDate), closingDate: dayOf(row.closingDate), paidAt: dayOf(row.paidAt), sourceAsOf: dayOf(row.sourceAsOf)!,
  }));
  return { accounts, existing };
}

function fingerprintOf(resolved: ResolvedIssuer[], plan: StatementPlan) {
  return createHash("sha256").update(JSON.stringify({
    accounts: resolved.map(({ issuerKey, action, accountId }) => [issuerKey, action, accountId]),
    items: plan.items.map(({ record, action, existingId, values, overlap }) => [record.externalKey, action, existingId, values, overlap]),
  })).digest("hex");
}

async function prepare(db: CardStatementDb, workspaceId: string, raw: unknown) {
  const parsed = parseCardStatementFile(raw);
  if (!parsed.ok) return { parsed: false as const, ok: false as const, errors: parsed.errors };
  const { accounts, existing } = await loadState(db, workspaceId);
  const { resolved, errors: accountErrors } = resolveIssuerAccounts(parsed.file.records, accounts);
  const plan = planCardStatementImport(parsed.file, resolved, existing);
  const errors = [...accountErrors, ...plan.errors];
  return { parsed: true as const, ok: !errors.length, errors, file: parsed.file, resolved, plan, existing, fingerprint: fingerprintOf(resolved, plan) };
}

/** Statements as they would look after applying the plan, for the dry-run totals. */
function rowsAfter(existing: ExistingStatement[], plan: StatementPlan): StatementRow[] {
  const updates = new Map(plan.items.filter((item) => item.action === "UPDATE").map((item) => [item.existingId, item]));
  const row = (id: string, accountId: string, values: StatementValues, reconciliation: CardStatementReconciliation): StatementRow => ({
    id, accountId, accountName: "", reconciliation, overlapsStatementId: null, kind: values.kind, status: values.status, amountCents: values.amountCents,
    dueDate: values.dueDate, closingDate: values.closingDate, closingDay: values.closingDay, referenceMonth: values.referenceMonth, paidAt: values.paidAt, notes: values.notes,
  });
  return [
    ...existing.map((current) => {
      const item = updates.get(current.id);
      return row(current.id, current.accountId, item?.values ?? current, item?.overlap?.reconciliation ?? current.reconciliation);
    }),
    ...plan.items.filter((item) => item.action === "CREATE")
      .map((item) => row(`new:${item.record.externalKey}`, item.accountId ?? `new:${item.record.issuerKey}`, item.values, item.overlap?.reconciliation ?? "NOT_REQUIRED")),
  ];
}

export type CardStatementImportReport = Awaited<ReturnType<typeof previewCardStatementImport>>;

/** Dry-run: validates the file against the workspace's real data and writes nothing. */
export async function previewCardStatementImport(db: CardStatementDb, workspaceId: string, raw: unknown, today: string) {
  const prepared = await prepare(db, workspaceId, raw);
  if (!prepared.parsed) return { ok: false, errors: prepared.errors, fingerprint: null, asOfDate: null, counts: null, untouchedExisting: 0, accounts: [], items: [], totals: null, afterImport: null };
  const { file, resolved, plan, existing } = prepared;
  const after = summarizeCardStatements(rowsAfter(existing, plan), today);
  return {
    ok: prepared.ok,
    errors: prepared.errors,
    fingerprint: prepared.ok ? prepared.fingerprint : null,
    asOfDate: file.asOfDate,
    counts: plan.counts,
    untouchedExisting: plan.untouchedExisting,
    accounts: resolved.map(({ issuer, action, accountName }) => ({ issuer, action, accountName })),
    items: plan.items.map(({ record, action, changes, reason, overlap }) => ({
      externalKey: record.externalKey, issuer: record.issuer, recordType: record.recordType, status: record.status, amountCents: record.amountCents,
      dueDate: record.dueDate, referenceMonth: record.referenceMonth, closingDate: record.closingDate, closingDay: record.closingDay,
      paidAt: record.paidAt, action, changes, reason, pendingReconciliation: overlap?.reconciliation === "PENDING",
    })),
    totals: statementFileTotals(file.records),
    afterImport: {
      openCents: after.openCents, overdueCents: after.overdueCents, dueDates: after.dueDates, paidCents: after.paidCents,
      futureKnownCents: after.futureKnownCents, forecastCountedCents: after.forecastCountedCents, pendingCents: after.pendingCents,
    },
  };
}

/** Applies exactly the plan the user approved in the dry-run. Run it inside one transaction:
 * if the workspace changed since the preview, the fingerprint differs and nothing is written. */
export async function applyCardStatementImport(
  db: CardStatementDb,
  actor: { workspaceId: string; userId: string },
  raw: unknown,
  approval: { fingerprint: string; acceptConflicts: boolean; fileSha256: string },
) {
  const prepared = await prepare(db, actor.workspaceId, raw);
  if (!prepared.ok) throw new Error(prepared.errors[0] || "Arquivo de faturas inválido.");
  if (prepared.fingerprint !== approval.fingerprint) throw new Error("Os dados mudaram desde a prévia. Gere a prévia novamente antes de confirmar.");
  const { plan, resolved, existing, file } = prepared;
  if (plan.counts.conflict && !approval.acceptConflicts) throw new Error("Há registros em conflito. Confirme que eles devem ser preservados como estão.");

  const accountIds = new Map<string, string>();
  const accountsCreated: { id: string; name: string }[] = [];
  for (const issuer of resolved) {
    if (issuer.accountId) { accountIds.set(issuer.issuerKey, issuer.accountId); continue; }
    // Only what the source declared: no limit, opening balance or recurring closing/due day is inferred.
    const account = await db.account.create({ data: { workspaceId: actor.workspaceId, name: issuer.issuer, institution: issuer.issuer, type: "CREDIT_CARD", currency: "BRL" }, select: { id: true, name: true } });
    accountIds.set(issuer.issuerKey, account.id);
    accountsCreated.push(account);
  }

  const before = new Map(existing.map((row) => [row.id, row]));
  const idByIncomingKey = new Map<string, string>();
  const created: string[] = [];
  const updated: { id: string; before: ExistingStatement }[] = [];
  for (const item of plan.items) {
    if (item.action === "CREATE") {
      const row = await db.cardStatement.create({ data: { workspaceId: actor.workspaceId, accountId: accountIds.get(item.record.issuerKey)!, externalKey: item.record.externalKey, ...writable(item.values) }, select: { id: true } });
      idByIncomingKey.set(item.record.externalKey, row.id);
      created.push(row.id);
      continue;
    }
    idByIncomingKey.set(item.record.externalKey, item.existingId!);
    if (item.action !== "UPDATE") continue;
    const result = await db.cardStatement.updateMany({ where: { id: item.existingId!, workspaceId: actor.workspaceId }, data: writable(item.values) });
    if (result.count !== 1) throw new Error("Uma fatura mudou durante a importação. Gere a prévia novamente.");
    updated.push({ id: item.existingId!, before: before.get(item.existingId!)! });
  }
  // Overlap links go last: the target may have been created in this same import.
  for (const item of plan.items) {
    if (!item.overlap || (item.action !== "CREATE" && item.action !== "UPDATE")) continue;
    const targetId = idByIncomingKey.get(item.overlap.targetExternalKey) ?? item.overlap.targetExistingId;
    if (!targetId) throw new Error("Não foi possível vincular a previsão à fatura sobreposta.");
    await db.cardStatement.updateMany({ where: { id: idByIncomingKey.get(item.record.externalKey)!, workspaceId: actor.workspaceId }, data: { overlapsStatementId: targetId, reconciliation: item.overlap.reconciliation } });
  }

  // The previous values of every updated row stay in the audit log as the restore snapshot.
  await db.activityEvent.create({ data: {
    workspaceId: actor.workspaceId, actorUserId: actor.userId, type: "finance.card_statements_imported", entityType: "CardStatementImport",
    entityId: prepared.fingerprint.slice(0, 24), source: "IMPORT",
    metadata: { asOfDate: file.asOfDate, source: file.source, fileSha256: approval.fileSha256, counts: plan.counts, accountsCreated, created, updated,
      conflicts: plan.items.filter((item) => item.action === "CONFLICT").map((item) => item.record.externalKey) },
  } });
  return { counts: plan.counts, accountsCreated: accountsCreated.length, persisted: created.length + updated.length };
}

function writable(values: StatementValues) {
  return {
    kind: values.kind, status: values.status, periodKey: values.periodKey, amountCents: values.amountCents, dueDate: dateOf(values.dueDate),
    closingDate: dateOf(values.closingDate), closingDay: values.closingDay, referenceMonth: values.referenceMonth, paidAt: dateOf(values.paidAt),
    sourceRecordType: values.sourceRecordType, sourceAsOf: dateOf(values.sourceAsOf)!, notes: values.notes,
  };
}
