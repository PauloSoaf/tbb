import { Prisma, type PrismaClient } from "@prisma/client";
import { assertImportOwner, confirmFinancialEvidence, previewFinancialEvidence, runFinancialImport, stageFinancialDocuments, type ImportActor } from "@/features/finance/document-import";
import type { ParsedDocument } from "@/features/finance/document-parsers";
import { candidateSchema, type ImportCandidate } from "@/features/finance/import-candidates";
import { evidenceFingerprint, sourceHash } from "@/features/finance/import-reconciliation";
import { ownerActor } from "./connections";
import { normalizeBankTransaction } from "./normalize";
import { PluggyError, type PluggyClient } from "./pluggy-client";
import { revealItemId } from "./secret";
import { prepareCreditSync } from "./credit-sync";
import { dayOf } from "./normalize";
import { historyCutoff } from "./history";

const LEASE_MS = 10 * 60 * 1000;
/** Pluggy can revise a movement shortly after it appears, so each sync looks a little behind the last one. Known movements cost nothing. */
const OVERLAP_DAYS = 10;
const CHUNK = 500;
/** Cron runs that arrive too soon after a sync do nothing: Meu Pluggy only refreshes about every 24 hours. */
export const MIN_CRON_INTERVAL_MS = 3 * 60 * 60 * 1000;
/** Only plain income or spending is created without a person looking at it; everything else waits in the review. */
const AUTO_CREATE_KINDS = new Set<ImportCandidate["eventKind"]>(["PURCHASE", "PURCHASE_INSTALLMENT", "INCOME", "REFUND", "FEE", "IOF", "INTEREST"]);
const NEEDS_USER = new Set(["LOGIN_ERROR", "WAITING_USER_ACTION", "WAITING_USER_INPUT"]);

export type SyncStatus = "SUCCESS" | "PARTIAL" | "ERROR" | "BUSY" | "PAUSED" | "CONSENT_EXPIRED" | "NEEDS_RECONNECT";
export type SyncSummary = { status: SyncStatus; runId?: string; errorCode?: string; accountsSeen: number; transactionsFetched: number; staged: number; autoCreated: number; needsReview: number; alreadyKnown: number; pendingSkipped: number; outsideWindow: number };
const empty = (status: SyncStatus): SyncSummary => ({ status, accountsSeen: 0, transactionsFetched: 0, staged: 0, autoCreated: 0, needsReview: 0, alreadyKnown: 0, pendingSkipped: 0, outsideWindow: 0 });
const dayKey = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (value: string, days: number) => dayKey(new Date(Date.parse(`${value}T00:00:00Z`) + days * 86400000));
const cents = (value: number) => Math.round(value * 100);
const errorCode = (error: unknown) => {
  if (error instanceof PluggyError) return error.code;
  if (error instanceof Prisma.PrismaClientKnownRequestError) return `DB_${error.code}`;
  if (error instanceof Error && error.message.startsWith("Detalhamento ultrapassa")) return "DETAIL_EXCEEDS_BILL";
  if (error instanceof Error && error.message.startsWith("Identificadores de origem repetidos")) return "DUPLICATE_PROVIDER_ID";
  return "SYNC_FAILED";
};

export type SyncDeps = { prisma: PrismaClient; client: PluggyClient; now?: () => Date; accountLinkId?: string };

/**
 * One connection, one run. Safe to repeat: a movement is staged once, recognised by the provider's identity, and the
 * review decides anything uncertain. A lease on the connection keeps two syncs from overlapping.
 */
export async function syncConnection(deps: SyncDeps, actor: ImportActor, connectionId: string, trigger: "MANUAL" | "CRON"): Promise<SyncSummary> {
  const { prisma, client } = deps, now = deps.now?.() ?? new Date();
  await assertImportOwner(prisma, actor);
  const claimed = await prisma.openFinanceConnection.updateMany({
    where: { id: connectionId, workspaceId: actor.workspaceId, status: { in: ["ACTIVE", "ERROR"] }, OR: [{ syncLeaseUntil: null }, { syncLeaseUntil: { lt: now } }] },
    data: { syncLeaseUntil: new Date(now.getTime() + LEASE_MS) },
  });
  if (!claimed.count) {
    const current = await prisma.openFinanceConnection.findFirst({ where: { id: connectionId, workspaceId: actor.workspaceId }, select: { status: true } });
    if (!current) throw new Error("Conexão não encontrada.");
    return empty(current.status === "PAUSED" ? "PAUSED" : current.status === "CONSENT_EXPIRED" ? "CONSENT_EXPIRED" : "BUSY");
  }
  const connection = await prisma.openFinanceConnection.findFirstOrThrow({ where: { id: connectionId, workspaceId: actor.workspaceId } });
  const run = await prisma.openFinanceSyncRun.create({ data: { workspaceId: actor.workspaceId, connectionId, trigger, startedAt: now }, select: { id: true } });
  const summary = empty("SUCCESS"); summary.runId = run.id;
  let status: SyncStatus = "SUCCESS", failure: string | null = null;
  try {
    const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: actor.workspaceId }, select: { timezone: true } });
    const itemId = revealItemId(connection.itemIdCipher);
    const item = await client.getItem(itemId);
    const consentEnds = item.consentExpiresAt ? new Date(item.consentExpiresAt) : null;
    const state = {
      providerStatus: item.status ?? null, providerExecutionStatus: item.executionStatus ?? null, institutionName: item.connector?.name ?? connection.institutionName,
      providerUpdatedAt: item.lastUpdatedAt ? new Date(item.lastUpdatedAt) : null, nextAutoSyncAt: item.nextAutoSyncAt ? new Date(item.nextAutoSyncAt) : null,
      consentExpiresAt: consentEnds && !Number.isNaN(consentEnds.getTime()) ? consentEnds : null,
    };
    await prisma.openFinanceConnection.update({ where: { id: connection.id }, data: state });
    if (state.consentExpiresAt && state.consentExpiresAt < now) { status = "CONSENT_EXPIRED"; failure = "CONSENT_EXPIRED"; }
    else if (item.status && NEEDS_USER.has(item.status.toUpperCase())) { status = "NEEDS_RECONNECT"; failure = "RECONNECT_REQUIRED"; }
    else {
      const accounts = await client.listAccounts(itemId);
      summary.accountsSeen = accounts.items.length;
      const ownerTaxNumbers = [...new Set(accounts.items.flatMap(account => account.taxNumber ? [account.taxNumber] : []))];
      const today = dayKey(now);
      for (const remote of accounts.items) {
        const kind = remote.type.toUpperCase() === "CREDIT" ? "CREDIT" : "BANK";
        const balance = kind === "BANK" && typeof remote.balance === "number" ? { providerBalanceCents: cents(remote.balance), providerBalanceAt: now } : {};
        const base = { displayName: (remote.marketingName || remote.name || "Conta").slice(0, 120), maskedNumber: remote.number ? remote.number.replace(/\D/g, "").slice(-4) || null : null, subtype: remote.subtype ?? null, kind, ...balance };
        await prisma.openFinanceAccountLink.upsert({
          where: { connectionId_externalAccountId: { connectionId: connection.id, externalAccountId: remote.id } },
          create: { workspaceId: actor.workspaceId, connectionId: connection.id, externalAccountId: remote.id, ...base, isEnabled: false, syncFromDate: null },
          update: base,
        });
      }
      const links = await prisma.openFinanceAccountLink.findMany({ where: { connectionId: connection.id, workspaceId: actor.workspaceId, ...(deps.accountLinkId ? { id: deps.accountLinkId } : {}), isEnabled: true, accountId: { not: null }, kind: { in: ["BANK", "CREDIT"] } }, include: { account: { select: { name: true, isArchived: true, type: true } } } });
      if (deps.accountLinkId && !links.length) throw new Error("Vínculo ativo não encontrado nesta conexão.");
      for (const link of links) {
        if (!link.accountId || !link.account || link.account.isArchived) continue;
        try {
          const syncFrom = link.syncFromDate ? dayKey(link.syncFromDate) : null;
          const lastDay = link.lastTransactionDate ? dayKey(link.lastTransactionDate) : null;
          if (link.kind === "CREDIT") {
            const remote = accounts.items.find(account => account.id === link.externalAccountId && account.type === "CREDIT");
            if (!remote || link.account.type !== "CREDIT_CARD") throw new PluggyError("UNEXPECTED_RESPONSE");
            const credit = await prepareCreditSync({ prisma, client, actor, linkId: link.id, accountId: link.accountId, externalAccountId: link.externalAccountId, remote, timezone: workspace.timezone, syncFrom, asOfDate: item.lastUpdatedAt ? dayOf(item.lastUpdatedAt, workspace.timezone) ?? today : today });
            summary.transactionsFetched += credit.fetched; summary.outsideWindow += credit.outsideWindow; summary.needsReview += credit.needsReview;
            const fresh = await withoutKnown(prisma, actor.workspaceId, link.accountId, credit.candidates, true);
            summary.alreadyKnown += credit.candidates.length - fresh.length;
            for (let start = 0; start < fresh.length; start += CHUNK) {
              const result = await stageAndApply(prisma, actor, link.accountId, `Open Finance · ${connection.label} · ${link.account.name} · ${today}`, connection.label, fresh.slice(start, start + CHUNK), true);
              summary.staged += result.staged; summary.autoCreated += result.autoCreated; summary.needsReview += result.needsReview; summary.alreadyKnown += result.kept;
            }
            if (credit.newest) await prisma.openFinanceAccountLink.update({ where: { id: link.id }, data: { lastTransactionDate: new Date(`${credit.newest}T00:00:00.000Z`) } });
            continue;
          }
          const from = lastDay ? (syncFrom && addDays(lastDay, -OVERLAP_DAYS) < syncFrom ? syncFrom : addDays(lastDay, -OVERLAP_DAYS)) : syncFrom;
          const preserveBefore = await historyCutoff(prisma, actor.workspaceId, link.accountId, link.id);
          const fetched = await client.listTransactions(link.externalAccountId, from ? { dateFrom: from } : {});
          summary.transactionsFetched += fetched.items.length;
          const candidates: ImportCandidate[] = []; let newest = lastDay;
          for (const transaction of fetched.items) {
            const result = normalizeBankTransaction(transaction, { timezone: workspace.timezone, ownerTaxNumbers, syncFrom });
            if (result.kind === "skipped") { if (result.reason === "PENDING") summary.pendingSkipped++; else if (result.reason === "BEFORE_WINDOW") summary.outsideWindow++; continue; }
            candidates.push(result.candidate);
            if (!newest || result.day > newest) newest = result.day;
          }
          const fresh = await withoutKnown(prisma, actor.workspaceId, link.accountId, candidates);
          summary.alreadyKnown += candidates.length - fresh.length;
          for (let start = 0; start < fresh.length; start += CHUNK) {
            const result = await stageAndApply(prisma, actor, link.accountId, `Open Finance · ${connection.label} · ${link.account.name} · ${today}`, connection.label, fresh.slice(start, start + CHUNK), false, preserveBefore);
            summary.staged += result.staged; summary.autoCreated += result.autoCreated; summary.needsReview += result.needsReview; summary.alreadyKnown += result.kept;
          }
          if (newest) await prisma.openFinanceAccountLink.update({ where: { id: link.id }, data: { lastTransactionDate: new Date(`${newest}T00:00:00.000Z`) } });
        } catch (error) { status = "PARTIAL"; failure = errorCode(error); }
      }
    }
  } catch (error) { status = "ERROR"; failure = errorCode(error); }
  finally {
    const finished = deps.now?.() ?? new Date();
    const ok = status === "SUCCESS" || status === "PARTIAL";
    await prisma.openFinanceConnection.update({ where: { id: connection.id }, data: {
      syncLeaseUntil: null, ...(ok ? { lastSyncedAt: finished } : {}),
      status: status === "CONSENT_EXPIRED" ? "CONSENT_EXPIRED" : status === "ERROR" || status === "NEEDS_RECONNECT" ? "ERROR" : "ACTIVE",
      lastErrorCode: failure, lastErrorAt: failure ? finished : null,
    } });
    await prisma.openFinanceSyncRun.update({ where: { id: run.id }, data: {
      status, finishedAt: finished, errorCode: failure, accountsSeen: summary.accountsSeen, transactionsFetched: summary.transactionsFetched, pendingSkipped: summary.pendingSkipped,
      outsideWindow: summary.outsideWindow, staged: summary.staged, autoCreated: summary.autoCreated, needsReview: summary.needsReview, alreadyKnown: summary.alreadyKnown,
    } });
    await prisma.activityEvent.create({ data: { workspaceId: actor.workspaceId, actorUserId: actor.userId, type: "open_finance.synced", entityType: "OpenFinanceConnection", entityId: connection.id, metadata: { status, trigger, staged: summary.staged, autoCreated: summary.autoCreated, needsReview: summary.needsReview } } });
  }
  return { ...summary, status, ...(failure ? { errorCode: failure } : {}) };
}

/** Drops what the ledger or an earlier review already holds, so a movement is staged at most once. */
async function withoutKnown(prisma: PrismaClient, workspaceId: string, accountId: string, candidates: ImportCandidate[], credit = false) {
  if (!candidates.length) return candidates;
  const prints = new Map(candidates.map(candidate => [evidenceFingerprint(workspaceId, accountId, "", candidate), candidate]));
  const [ledger, staged] = await Promise.all([
    prisma.financeTransaction.findMany({ where: { workspaceId, accountId, fingerprint: { in: [...prints.keys()] } }, select: { fingerprint: true, amountCents: true, type: true } }),
    prisma.financialEvidence.findMany({ where: { workspaceId, source: { accountId }, locator: { in: candidates.map(candidate => candidate.locator) } }, select: { locator: true, candidate: true, decision: true, version: true, reviewedByUserId: true } }),
  ]);
  const known = new Set(ledger.flatMap(row => row.fingerprint ? [row.fingerprint] : []));
  const seen = new Set(staged.map(row => row.locator));
  return [...prints].filter(([print, candidate]) => {
    if (!credit) return !known.has(print) && !seen.has(candidate.locator);
    const existing = ledger.find(row => row.fingerprint === print);
    if (existing && existing.amountCents === candidate.amountCents && existing.type === (candidate.eventKind === "REFUND" ? "REFUND" : "EXPENSE")) return false;
    const evidence = staged.filter(row => row.locator === candidate.locator);
    if (evidence.some(row => row.decision === "IGNORE" && row.reviewedByUserId || row.decision === "NEEDS_REVIEW" && (row.version > 1 || row.reviewedByUserId))) return false;
    if (evidence.some(row => JSON.stringify(candidateSchema.parse(row.candidate)) === JSON.stringify(candidate))) return false;
    return true;
  }).map(([, candidate]) => candidate);
}

function document(name: string, label: string, candidates: ImportCandidate[], preserveBalanceBefore: string | null): ParsedDocument {
  // Stable bytes (sorted, no timestamps): an identical set of movements is the same original and is never staged twice.
  const ordered = [...candidates].sort((left, right) => left.locator.localeCompare(right.locator));
  const bytes = new TextEncoder().encode(JSON.stringify({ origin: "OPEN_FINANCE", provider: "MEUPLUGGY", candidates: ordered, ...(preserveBalanceBefore ? { preserveBalanceBefore } : {}) }));
  return { name: name.slice(0, 200), bytes, sha256: sourceHash(bytes), mediaType: "application/json", candidates: ordered, metadata: { origin: "OPEN_FINANCE", provider: "MEUPLUGGY", connection: label, preserveBalanceBefore } };
}

/** Stages the movements through the existing document review and confirms only the plain, unambiguous ones. */
async function stageAndApply(prisma: PrismaClient, actor: ImportActor, accountId: string, name: string, label: string, candidates: ImportCandidate[], credit = false, preserveBefore: string | null = null) {
  // Serializable transactions can be refused when the person edits the ledger at the same moment. Nothing was saved in that
  // case and the whole step is idempotent, so it is simply run again.
  for (let attempt = 1; ; attempt += 1) {
    try { return await stageAndApplyOnce(prisma, actor, accountId, name, label, candidates, credit, preserveBefore); }
    catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") || attempt >= 3) throw error;
      await new Promise(resolve => setTimeout(resolve, 150 * attempt));
    }
  }
}
async function stageAndApplyOnce(prisma: PrismaClient, actor: ImportActor, accountId: string, name: string, label: string, candidates: ImportCandidate[], credit: boolean, preserveBefore: string | null) {
  return runFinancialImport(prisma, async db => {
    const ids = await stageFinancialDocuments(db, actor, accountId, [document(name, label, candidates, preserveBefore)]);
    const preview = await previewFinancialEvidence(db, actor, ids);
    const eligible = preview.rows.filter(row => row.action === "CREATE" && row.candidate.confidence === "CONFIRMED" && !row.candidate.problems.length && AUTO_CREATE_KINDS.has(row.candidate.eventKind));
    const statements = await db.cardStatement.findMany({ where: { workspaceId: actor.workspaceId, id: { in: [...new Set(eligible.flatMap(row => row.candidate.statementId ? [row.candidate.statementId] : []))] } }, select: { id: true, amountCents: true, transactions: { select: { type: true, amountCents: true, statementDetailMode: true } } } });
    const sign = (row: { type: string; amountCents: number }) => (row.type === "REFUND" ? -1 : 1) * row.amountCents;
    const remaining = new Map(statements.map(statement => [statement.id, statement.amountCents + statement.transactions.filter(row => row.statementDetailMode === "ADDED_TO_STATEMENT").reduce((sum, row) => sum + sign(row), 0) - statement.transactions.reduce((sum, row) => sum + sign(row), 0)]));
    // Apply refunds before purchases. A detail that exceeds a known bill waits for review instead
    // of rolling back every other purchase in the history batch.
    const creatable = [...eligible].sort((left, right) => Number(right.candidate.eventKind === "REFUND") - Number(left.candidate.eventKind === "REFUND")).filter(row => {
      if (!row.candidate.statementId) return true;
      const available = remaining.get(row.candidate.statementId);
      const cost = (row.candidate.eventKind === "REFUND" ? -1 : 1) * (row.candidate.amountCents ?? 0);
      if (available === undefined || cost > available) return false;
      remaining.set(row.candidate.statementId, available - cost); return true;
    });
    let autoCreated = 0;
    if (creatable.length) autoCreated = (await confirmFinancialEvidence(db, actor, ids, preview.token, creatable.map(row => ({ id: row.id, action: "CREATE" as const })))).created;
    const heldIds = eligible.filter(row => !creatable.some(value => value.id === row.id)).map(row => row.id);
    if (heldIds.length) await db.financialEvidence.updateMany({ where: { workspaceId: actor.workspaceId, id: { in: heldIds } }, data: { reason: "O detalhamento ultrapassa o valor conciliado da fatura. Confira duplicatas, estornos e competência antes de confirmar." } });
    if (credit) await db.financialEvidence.updateMany({ where: { workspaceId: actor.workspaceId, source: { accountId }, sourceId: { notIn: ids }, locator: { in: candidates.map(row => row.locator) }, decision: "NEEDS_REVIEW", version: 1, reviewedByUserId: null }, data: { decision: "IGNORE", reason: "Substituída por atualização do banco; a evidência original foi preservada.", version: { increment: 1 } } });
    // A row that only mirrors a transfer the person already registered is settled, not pending: it leaves the review.
    const keptIds = preview.rows.filter(row => row.action === "KEEP").map(row => row.id);
    if (keptIds.length) await db.financialEvidence.updateMany({ where: { workspaceId: actor.workspaceId, id: { in: keptIds }, decision: "NEEDS_REVIEW" }, data: { decision: "IGNORE", reason: "Já registrado como transferência entre suas contas.", reviewedByUserId: actor.userId, reviewedAt: new Date(), version: { increment: 1 } } });
    const batches = await db.financialSource.findMany({ where: { workspaceId: actor.workspaceId, id: { in: ids } }, select: { importBatchId: true } });
    for (const { importBatchId } of batches) {
      if (importBatchId && !await db.financialEvidence.count({ where: { workspaceId: actor.workspaceId, importBatchId, decision: "NEEDS_REVIEW" } })) await db.importBatch.update({ where: { id: importBatchId }, data: { status: "COMPLETED", completedAt: new Date() } });
    }
    return { staged: preview.rows.length, autoCreated, kept: keptIds.length, needsReview: preview.rows.length - creatable.length - keptIds.length };
  });
}

/** What the scheduled run does: every active connection, one after the other, each as its workspace owner. */
export async function syncDueConnections(deps: SyncDeps, trigger: "CRON" | "MANUAL" = "CRON", options: { workspaceId?: string } = {}) {
  const now = deps.now?.() ?? new Date();
  const connections = await deps.prisma.openFinanceConnection.findMany({ where: { status: { in: ["ACTIVE", "ERROR"] }, ...(options.workspaceId ? { workspaceId: options.workspaceId } : {}) }, select: { id: true, workspaceId: true, lastSyncedAt: true } });
  const results: SyncSummary[] = [];
  for (const connection of connections) {
    if (trigger === "CRON" && connection.lastSyncedAt && now.getTime() - connection.lastSyncedAt.getTime() < MIN_CRON_INTERVAL_MS) continue;
    const actor = await ownerActor(deps.prisma, connection.workspaceId);
    if (!actor) continue;
    results.push(await syncConnection(deps, actor, connection.id, trigger));
  }
  return results;
}
