import { Prisma, type PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { candidateSchema, type ImportCandidate, type EvidencePreview } from "./import-candidates";
import { evidenceFingerprint, ledgerType, reconcileCandidate, sourceHash } from "./import-reconciliation";
import { dateOnly } from "./money";
import { applyRules } from "./import-engine";
import { matchRowsToOwnTransfers } from "./import-transfer-match";
import { ownTransfersFor } from "./own-transfers";
import type { ParsedDocument } from "./document-parsers";

export type ImportActor = { workspaceId: string; userId: string; role: string };
type DB = Prisma.TransactionClient;
const json = (value: unknown) => value as Prisma.InputJsonValue;
const day = (value: Date) => value.toISOString().slice(0, 10);
export async function assertImportOwner(db: DB, actor: ImportActor, accountId?: string) {
  if (actor.role !== "OWNER") throw new Error("Somente o titular pode importar e revisar documentos financeiros.");
  const membership = await db.membership.findFirst({ where: { workspaceId: actor.workspaceId, userId: actor.userId, role: "OWNER", isActive: true, workspace: { isActive: true }, user: { isActive: true } } });
  if (!membership) throw new Error("Sessão sem titularidade ativa neste espaço.");
  if (accountId) {
    const account = await db.account.findFirst({ where: { id: accountId, workspaceId: actor.workspaceId, isArchived: false, currency: "BRL" } });
    if (!account) throw new Error("Conta de destino não pertence ao espaço ou não está ativa em BRL.");
    return account;
  }
}
async function lockAccount(db: DB, workspaceId: string, accountId: string) {
  await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${workspaceId}:${accountId}:financial-import`}, 0))`;
}
async function audit(db: DB, actor: ImportActor, batchId: string, type: string, metadata: unknown) {
  await db.activityEvent.create({ data: { workspaceId: actor.workspaceId, actorUserId: actor.userId, entityId: batchId, entityType: "ImportBatch", type, metadata: json(metadata) } });
}

/** Originals are immutable and deduplicated by hash. Retry never replaces review decisions. */
export async function stageFinancialDocuments(db: DB, actor: ImportActor, accountId: string, documents: ParsedDocument[]) {
  if (!accountId || !documents.length || documents.length > 100 || documents.reduce((s, d) => s + d.bytes.length, 0) > 20000000) throw new Error("Conta obrigatória e envio limitado a 100 fontes / 20 MB.");
  await assertImportOwner(db, actor, accountId); await lockAccount(db, actor.workspaceId, accountId);
  const ids: string[] = [];
  const rules = await db.transactionRule.findMany({ where: { workspaceId: actor.workspaceId, isEnabled: true, OR: [{ categoryId: null }, { category: { workspaceId: actor.workspaceId, isArchived: false } }] }, orderBy: [{ priority: "asc" }, { id: "asc" }] });
  for (const doc of documents) {
    if (doc.sha256 !== sourceHash(doc.bytes) || doc.candidates.length > 5000) throw new Error("Hash ou quantidade de ocorrências inválida.");
    let source = await db.financialSource.findUnique({ where: { workspaceId_accountId_sha256: { workspaceId: actor.workspaceId, accountId, sha256: doc.sha256 } } });
    if (!source) {
      const batch = await db.importBatch.create({ data: { workspaceId: actor.workspaceId, accountId, source: "DOCUMENT_V2", fileName: doc.name, fileSize: doc.bytes.length, status: "NEEDS_REVIEW", rowCount: doc.candidates.length, preview: json({ metadata: doc.metadata }) } });
      source = await db.financialSource.create({ data: { workspaceId: actor.workspaceId, accountId, sha256: doc.sha256, fileName: doc.name, mediaType: doc.mediaType, content: Buffer.from(doc.bytes), byteLength: doc.bytes.length, importBatchId: batch.id } });
      const candidates = doc.candidates.map(c => {
        const row = candidateSchema.parse(c);
        const format = doc.mediaType === "text/csv" ? "CSV" : doc.mediaType === "application/pdf" ? "PDF" : doc.mediaType.includes("spreadsheetml") ? "XLSX" : doc.mediaType.startsWith("image/") ? "IMAGE" : "JSON";
        const applied = applyRules({ date: row.effectiveDate || "", description: row.description, merchant: row.merchant, amountCents: row.amountCents || 0, type: ledgerType(row), categoryId: row.categoryId, tags: row.tags, source: format, externalId: row.issuerExternalId, fingerprint: "" }, rules, accountId);
        return { ...row, categoryId: applied.data.categoryId, merchant: applied.data.merchant, tags: applied.data.tags };
      });
      if (new Set(candidates.map(c => c.locator)).size !== candidates.length) throw new Error("Identificadores de origem repetidos.");
      await db.financialEvidence.createMany({ data: candidates.map(c => ({ workspaceId: actor.workspaceId, sourceId: source!.id, locator: c.locator, candidate: json(c), originalCandidate: json(c), importBatchId: batch.id })) });
      await audit(db, actor, batch.id, "finance.document_staged", { sources: 1, candidates: candidates.length, sha256: doc.sha256 });
    }
    ids.push(source.id);
  }
  return ids;
}

export async function previewFinancialEvidence(db: DB, actor: ImportActor, sourceIds: string[]) {
  await assertImportOwner(db, actor);
  if (!sourceIds.length || sourceIds.length > 100) throw new Error("Selecione as fontes.");
  const sources = await db.financialSource.findMany({ where: { workspaceId: actor.workspaceId, id: { in: sourceIds } }, select: { id: true, sha256: true, accountId: true, fileName: true, importBatchId: true } });
  if (sources.length !== new Set(sourceIds).size) throw new Error("Fonte indisponível neste espaço.");
  const batches = await db.importBatch.findMany({ where: { workspaceId: actor.workspaceId, id: { in: sources.flatMap(s => s.importBatchId ? [s.importBatchId] : []) } }, select: { id: true, preview: true } });
  const [evidence, transactions, payments] = await Promise.all([
    db.financialEvidence.findMany({ where: { workspaceId: actor.workspaceId, sourceId: { in: sourceIds } }, orderBy: [{ sourceId: "asc" }, { locator: "asc" }], take: 5001 }),
    db.financeTransaction.findMany({ where: { workspaceId: actor.workspaceId, accountId: { in: sources.map(s => s.accountId) } }, select: { id: true, accountId: true, date: true, description: true, merchant: true, amountCents: true, type: true, externalId: true, revision: true, fingerprint: true } }),
    db.cardStatementPayment.findMany({ where: { workspaceId: actor.workspaceId, accountId: { in: sources.map(s => s.accountId) } }, select: { id: true, accountId: true, fingerprint: true, amountCents: true, date: true } }),
  ]);
  if (evidence.length > 5000) throw new Error("Revise no máximo 5.000 ocorrências por vez.");
  const reviewed: EvidencePreview[] = evidence.map(e => {
    const source = sources.find(s => s.id === e.sourceId)!, candidate = candidateSchema.parse(e.candidate);
    const fingerprint = evidenceFingerprint(actor.workspaceId, source.accountId, source.sha256, candidate);
    const related = candidate.relatedLocator ? evidence.find(parent => parent.sourceId === source.id && parent.locator === candidate.relatedLocator) : null;
    const match = reconcileCandidate(candidate, transactions.filter(t => t.accountId === source.accountId).map(t => ({ ...t, date: day(t.date) })), fingerprint, e.transactionId || related?.transactionId || null);
    if (e.decision === "COMMITTED" && candidate.eventKind === "METADATA_REVIEW") Object.assign(match, { action: "KEEP", reason: "Metadados já revisados nesta origem." });
    if (e.decision === "IGNORE") Object.assign(match, { action: "IGNORE", reason: e.reason || "Ignorada em revisão anterior." });
    if (candidate.eventKind === "CARD_PAYMENT") {
      const payment = payments.find(p => p.fingerprint === fingerprint || p.id === e.paymentId);
      if (payment) Object.assign(match, { action: payment.amountCents === candidate.amountCents ? "KEEP" : "CONFLICT", reason: "Pagamento já registrado nesta origem." });
      else {
        const probable = payments.filter(p => p.accountId === source.accountId && p.amountCents === candidate.amountCents && candidate.effectiveDate && (!p.date || Math.abs(p.date.valueOf() - Date.parse(candidate.effectiveDate)) <= 3 * 86400000)); // a manual payment with no known day may be this very payment
        if (probable.length) Object.assign(match, { action: "AMBIGUOUS", reason: "Possível pagamento existente. Vincule a evidência para não deduzir duas vezes.", matches: probable.map(p => ({ ...p, description: "Pagamento da fatura", date: p.date ? day(p.date) : "Data não informada", revision: 0 })) });
      }
    }
    return { id: e.id, version: e.version, sourceId: e.sourceId, fileName: source.fileName, candidate, ...match, matches: match.matches.map(t => ({ id: t.id, description: t.description, date: t.date, revision: t.revision })) };
  });
  // A statement shows a PIX between the person's own accounts as income or expense, but it is already held as one transfer.
  const accounts = [...new Set(sources.map(source => source.accountId))];
  const ownTransfers = new Map(await Promise.all(accounts.map(async accountId => [accountId, await ownTransfersFor(db, actor.workspaceId, accountId)] as const)));
  const rows = [...reviewed];
  for (const accountId of accounts) {
    const transfers = ownTransfers.get(accountId) ?? [];
    if (!transfers.length) continue;
    const accountRows = reviewed.flatMap((row, index) => sources.find(source => source.id === row.sourceId)?.accountId === accountId && row.action === "CREATE" && row.candidate.amountCents && row.candidate.effectiveDate && ["PURCHASE", "PURCHASE_INSTALLMENT", "REFUND", "INCOME"].includes(row.candidate.eventKind)
      ? [{ index, date: row.candidate.effectiveDate, amountCents: row.candidate.amountCents, type: ledgerType(row.candidate) }] : []);
    for (const [index, match] of matchRowsToOwnTransfers(accountRows, accountId, transfers)) {
      const transfer = transfers.find(item => item.id === match.transactionId)!;
      rows[index] = { ...rows[index], action: "KEEP", reason: `Já registrado como transferência entre suas contas (${match.label}). Não será lançado de novo.`, matches: [{ id: transfer.id, description: match.label, date: transfer.date, revision: 0 }] };
    }
  }
  const statements = await db.cardStatement.findMany({ where: { workspaceId: actor.workspaceId, id: { in: [...new Set(rows.flatMap(r => r.candidate.statementId ? [r.candidate.statementId] : []))] } }, select: { id: true, accountId: true, kind: true, status: true, amountCents: true, dueDate: true, updatedAt: true, rolledIntoStatementId: true, amountIsOutstanding: true } });
  const token = createHash("sha256").update(JSON.stringify({ rows, statements, versions: evidence.map(e => [e.id, e.version, e.decision]) })).digest("hex");
  return { rows, token, documents: sources.map(s => ({ id: s.id, accountId: s.accountId, fileName: s.fileName, metadata: (batches.find(b => b.id === s.importBatchId)?.preview as { metadata?: Record<string, unknown> } | null)?.metadata || {} })), counts: { create: rows.filter(r => r.action === "CREATE").length, keep: rows.filter(r => r.action === "KEEP").length, review: rows.filter(r => ["AMBIGUOUS", "CONFLICT"].includes(r.action)).length, ignore: rows.filter(r => r.action === "IGNORE").length } };
}

export type EvidenceDecision = { id: string; action: "CREATE" | "LINK_EVIDENCE" | "ENRICH_METADATA" | "KEEP" | "IGNORE"; targetId?: string; confirmedSeparate?: boolean };

async function validateReferences(db: DB, actor: ImportActor, accountId: string, row: ImportCandidate) {
  if (row.categoryId && !await db.financeCategory.findFirst({ where: { id: row.categoryId, workspaceId: actor.workspaceId, isArchived: false } })) throw new Error("Categoria inválida.");
  if (row.subscriptionId && !await db.subscription.findFirst({ where: { id: row.subscriptionId, workspaceId: actor.workspaceId, accountId } })) throw new Error("Assinatura de outro cartão/espaço.");
  if (!row.statementId) return null;
  const statement = await db.cardStatement.findFirst({ where: { id: row.statementId, workspaceId: actor.workspaceId, accountId, kind: "STATEMENT" } });
  if (!statement) throw new Error("Fatura de outro cartão/espaço ou ainda em conflito.");
  return statement;
}

/** Called in SERIALIZABLE transactions. The account lock covers separate uploads and
 * retries; the preview token prevents applying a stale or altered review. */
export async function confirmFinancialEvidence(db: DB, actor: ImportActor, sourceIds: string[], token: string, decisions: EvidenceDecision[]) {
  await assertImportOwner(db, actor);
  if (!decisions.length || decisions.length > 5000 || new Set(decisions.map(d => d.id)).size !== decisions.length) throw new Error("Selecione ocorrências únicas para confirmar.");
  const sources = await db.financialSource.findMany({ where: { workspaceId: actor.workspaceId, id: { in: sourceIds } }, select: { id: true, accountId: true, sha256: true, importBatchId: true } });
  for (const id of [...new Set(sources.map(s => s.accountId))].sort()) { await assertImportOwner(db, actor, id); await lockAccount(db, actor.workspaceId, id); }
  const preview = await previewFinancialEvidence(db, actor, sourceIds);
  if (token !== preview.token) throw new Error("A revisão mudou. Atualize a prévia antes de confirmar.");
  const counts = { created: 0, linked: 0, enriched: 0, payments: 0, kept: 0, ignored: 0 };
  const batches = new Set<string>();
  for (const decision of decisions) {
    const proposed = preview.rows.find(r => r.id === decision.id);
    if (!proposed) throw new Error("Ocorrência não pertence às fontes selecionadas.");
    const evidence = await db.financialEvidence.findFirstOrThrow({ where: { id: decision.id, workspaceId: actor.workspaceId } });
    const source = sources.find(s => s.id === evidence.sourceId)!, row = candidateSchema.parse(evidence.candidate);
    if (source.importBatchId) batches.add(source.importBatchId);
    const fingerprint = evidenceFingerprint(actor.workspaceId, source.accountId, source.sha256, row);
    if (decision.action === "IGNORE") {
      if (evidence.transactionId || evidence.decision === "COMMITTED") throw new Error("Ocorrência já confirmada; use rollback para desfazer.");
      await db.financialEvidence.update({ where: { id: evidence.id }, data: { decision: "IGNORE", reason: "Ignorada explicitamente pelo titular", reviewedByUserId: actor.userId, reviewedAt: new Date(), version: { increment: 1 } } }); counts.ignored++; continue;
    }
    if (proposed.action === "KEEP") { counts.kept++; continue; }
    if (!row.effectiveDate || !row.amountCents || row.confidence !== "CONFIRMED" || row.problems.length || ["UNREAD", "CREDIT_CONVERSION", "TRANSFER"].includes(row.eventKind)) throw new Error("Confirme os dados e resolva os conflitos antes de salvar esta ocorrência.");
    const statement = await validateReferences(db, actor, source.accountId, row);
    let transactionId: string | null = null, paymentId: string | null = null;
    if (decision.action === "KEEP") throw new Error("Não existe vínculo confirmado para manter esta ocorrência.");
    if (["LINK_EVIDENCE", "ENRICH_METADATA"].includes(decision.action)) {
      if (row.eventKind === "CARD_PAYMENT") {
        const target = await db.cardStatementPayment.findFirst({ where: { id: decision.targetId, workspaceId: actor.workspaceId, accountId: source.accountId, amountCents: row.amountCents } });
        if (!target) throw new Error("Pagamento de destino inválido.");
        if (row.statementId && target.cardStatementId && row.statementId !== target.cardStatementId) throw new Error("Evidência e pagamento indicam faturas diferentes. Confira a fatura de destino.");
        paymentId = target.id; counts.linked++;
      } else {
      const target = await db.financeTransaction.findFirst({ where: { id: decision.targetId, workspaceId: actor.workspaceId, accountId: source.accountId } });
      if (!target || target.amountCents !== row.amountCents || target.type !== ledgerType(row)) throw new Error("O vínculo deve apontar para a mesma conta, valor e natureza.");
      if (row.eventKind === "METADATA_REVIEW") {
        const parent = await db.financialEvidence.findFirst({ where: { sourceId: source.id, workspaceId: actor.workspaceId, locator: row.relatedLocator || "", transactionId: target.id } });
        if (!parent || decision.action !== "ENRICH_METADATA") throw new Error("Revisão de câmbio exige a compra original desta fonte.");
      }
      transactionId = target.id;
      if (decision.action === "ENRICH_METADATA") {
        // Never override a user's description, merchant, category, tags or effective date.
        await db.financeTransaction.update({ where: { id: target.id }, data: {
          ...(target.dateBasis === "POSTED_DATE" && target.revision === 0 && !target.purchasedDate && row.purchasedDate ? { date: dateOnly(row.purchasedDate), dateBasis: "PURCHASE_DATE" } : {}),
          purchasedDate: target.purchasedDate || (row.purchasedDate ? dateOnly(row.purchasedDate) : null), postedDate: target.postedDate || (row.postedDate ? dateOnly(row.postedDate) : null),
          occurredAt: target.occurredAt || (row.occurredAt ? new Date(row.occurredAt) : null), occurredTimezone: target.occurredTimezone || row.timezone,
          originalCurrency: row.eventKind === "METADATA_REVIEW" ? row.originalCurrency : target.originalCurrency || row.originalCurrency, originalAmountCents: row.eventKind === "METADATA_REVIEW" ? row.originalAmountCents : target.originalAmountCents || row.originalAmountCents, exchangeRate: row.eventKind === "METADATA_REVIEW" ? row.exchangeRate : target.exchangeRate || row.exchangeRate,
          ...(row.eventKind === "METADATA_REVIEW" ? { revision: { increment: 1 } } : {}),
        } }); counts.enriched++;
      } else counts.linked++;
      }
    } else if (row.eventKind === "CARD_PAYMENT") {
      if (proposed.action === "AMBIGUOUS" && !decision.confirmedSeparate) throw new Error("Confirme que é outro pagamento ou vincule à evidência existente.");
      if (statement) {
        const paid = await db.cardStatementPayment.aggregate({ where: { workspaceId: actor.workspaceId, cardStatementId: statement.id, ...(statement.amountIsOutstanding ? { date: { gt: statement.sourceAsOf } } : {}) }, _sum: { amountCents: true } });
        if ((!statement.amountIsOutstanding || dateOnly(row.effectiveDate) > statement.sourceAsOf) && (paid._sum.amountCents || 0) + row.amountCents > statement.amountCents) throw new Error("Pagamento excede o saldo conhecido. Revise crédito/duplicidade antes de vincular.");
      }
      const payment = await db.cardStatementPayment.create({ data: { workspaceId: actor.workspaceId, accountId: source.accountId, cardStatementId: statement?.id || null, fingerprint, date: dateOnly(row.effectiveDate), amountCents: row.amountCents, sourceId: source.id, locator: row.locator, importBatchId: source.importBatchId } }); paymentId = payment.id; counts.payments++;
    } else {
      if (row.eventKind === "METADATA_REVIEW") throw new Error("Revisão de metadados não cria outra compra. Vincule à ocorrência original.");
      if (proposed.action === "AMBIGUOUS" && !decision.confirmedSeparate) throw new Error("Confirme que é outra ocorrência ou vincule à existente.");
      if (proposed.action === "CONFLICT") throw new Error("Resolva o conflito na revisão.");
      if (statement) {
        const details = await db.financeTransaction.findMany({ where: { workspaceId: actor.workspaceId, cardStatementId: statement.id }, select: { amountCents: true, type: true, statementDetailMode: true } });
        const sign = (t: { type: string; amountCents: number }) => (t.type === "REFUND" ? -1 : 1) * t.amountCents;
        const effective = statement.amountCents + details.filter(t => t.statementDetailMode === "ADDED_TO_STATEMENT").reduce((s, t) => s + sign(t), 0);
        if (details.reduce((s, t) => s + sign(t), 0) + (row.eventKind === "REFUND" ? -row.amountCents : row.amountCents) > effective) throw new Error("Detalhamento ultrapassa o snapshot da fatura. Revise a competência; não crie ajuste.");
      }
      const created = await db.financeTransaction.create({ data: { workspaceId: actor.workspaceId, accountId: source.accountId, importBatchId: source.importBatchId, fingerprint, externalId: row.issuerExternalId,
        description: row.description, merchant: row.merchant, amountCents: row.amountCents, currency: "BRL", type: ledgerType(row), date: dateOnly(row.effectiveDate), purchasedDate: row.purchasedDate ? dateOnly(row.purchasedDate) : null, postedDate: row.postedDate ? dateOnly(row.postedDate) : null,
        occurredAt: row.occurredAt ? new Date(row.occurredAt) : null, occurredTimezone: row.timezone, dateBasis: row.dateBasis, eventKind: row.eventKind, isConsumption: row.eventKind !== "FINANCING_INSTALLMENT",
        installmentNumber: row.installmentNumber, installmentTotal: row.installmentTotal, originalCurrency: row.originalCurrency, originalAmountCents: row.originalAmountCents, exchangeRate: row.exchangeRate,
        categoryId: row.categoryId, tags: row.tags, subscriptionId: row.subscriptionId, recurring: Boolean(row.subscriptionId), source: "DOCUMENT_V2", cardStatementId: statement?.id || null, statementDetailMode: statement ? "ALREADY_INCLUDED" : null, competenceDate: statement?.dueDate || null,
      } }); transactionId = created.id; counts.created++;
    }
    await db.financialEvidence.update({ where: { id: evidence.id }, data: { transactionId, paymentId, decision: "COMMITTED", reviewedByUserId: actor.userId, reviewedAt: new Date(), version: { increment: 1 } } });
  }
  for (const batchId of batches) {
    const [remaining, committed, ignored] = await Promise.all([db.financialEvidence.count({ where: { workspaceId: actor.workspaceId, importBatchId: batchId, decision: "NEEDS_REVIEW" } }), db.financialEvidence.count({ where: { workspaceId: actor.workspaceId, importBatchId: batchId, decision: "COMMITTED" } }), db.financialEvidence.count({ where: { workspaceId: actor.workspaceId, importBatchId: batchId, decision: "IGNORE" } })]);
    await db.importBatch.update({ where: { id: batchId }, data: { status: remaining ? "NEEDS_REVIEW" : "COMPLETED", importedCount: committed, failedCount: remaining, duplicateCount: ignored, completedAt: remaining ? null : new Date() } });
    await audit(db, actor, batchId, "finance.evidence_confirmed", { ...counts, remaining });
  }
  return counts;
}

export async function reviewEvidenceCandidate(db: DB, actor: ImportActor, evidenceId: string, candidate: ImportCandidate, expectedVersion: number) {
  await assertImportOwner(db, actor);
  const current = await db.financialEvidence.findFirst({ where: { id: evidenceId, workspaceId: actor.workspaceId, decision: "NEEDS_REVIEW" }, include: { source: true } });
  if (!current || current.version !== expectedVersion) throw new Error("Ocorrência mudou ou já foi confirmada.");
  await assertImportOwner(db, actor, current.source.accountId); await lockAccount(db, actor.workspaceId, current.source.accountId);
  const row = candidateSchema.parse(candidate), original = candidateSchema.parse(current.originalCandidate);
  await validateReferences(db, actor, current.source.accountId, row);
  const revised = { ...row, locator: original.locator, relatedLocator: original.relatedLocator, rawDescription: original.rawDescription, rawDate: original.rawDate, rawAmount: original.rawAmount };
  await db.financialEvidence.update({ where: { id: current.id }, data: { candidate: json(revised), version: { increment: 1 }, reviewedByUserId: actor.userId, reviewedAt: new Date() } });
  await db.financialSnapshot.create({ data: { workspaceId: actor.workspaceId, accountId: current.source.accountId, sourceId: current.source.id, locator: `review:${current.id}:${current.version + 1}`, kind: "EVIDENCE_REVIEW", asOfDate: dateOnly(new Date().toISOString().slice(0, 10)), payload: json({ evidenceId: current.id, actorUserId: actor.userId, before: current.candidate, after: revised, fromVersion: current.version, toVersion: current.version + 1 }) } });
  if (current.importBatchId) await audit(db, actor, current.importBatchId, "finance.evidence_reviewed", { evidenceId: current.id, version: current.version + 1, detailsStoredPrivately: true });
}

export async function runFinancialImport<T>(client: PrismaClient, operation: (db: DB) => Promise<T>) {
  // Serialization failures require a fresh preview; never retry an old decision silently.
  return client.$transaction(operation, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 60000, maxWait: 10000 });
}

export async function rollbackFinancialDocument(db: DB, actor: ImportActor, batchId: string) {
  await assertImportOwner(db, actor);
  const batch = await db.importBatch.findFirst({ where: { id: batchId, workspaceId: actor.workspaceId, source: "DOCUMENT_V2", status: { in: ["COMPLETED", "NEEDS_REVIEW"] } } });
  if (!batch) throw new Error("Lote de documentos indisponível.");
  await lockAccount(db, actor.workspaceId, batch.accountId);
  const created = await db.financeTransaction.findMany({ where: { workspaceId: actor.workspaceId, importBatchId: batch.id }, select: { id: true, revision: true, evidence: { select: { importBatchId: true } }, investmentTransactions: { select: { id: true } }, investmentIncomeLinks: { select: { id: true } } } });
  const removable = created.filter(t => t.revision === 0 && t.evidence.every(e => e.importBatchId === batch.id) && !t.investmentTransactions.length && !t.investmentIncomeLinks.length).map(t => t.id);
  const removed = await db.financeTransaction.deleteMany({ where: { id: { in: removable }, workspaceId: actor.workspaceId, importBatchId: batch.id, revision: 0 } });
  const payments = await db.cardStatementPayment.findMany({ where: { workspaceId: actor.workspaceId, importBatchId: batch.id }, select: { id: true, evidence: { select: { importBatchId: true } } } });
  const removablePayments = payments.filter(p => p.evidence.every(e => e.importBatchId === batch.id)).map(p => p.id);
  const removedPayments = await db.cardStatementPayment.deleteMany({ where: { id: { in: removablePayments }, workspaceId: actor.workspaceId, importBatchId: batch.id } });
  await db.financialEvidence.updateMany({ where: { workspaceId: actor.workspaceId, importBatchId: batch.id, transactionId: null, paymentId: null, decision: "COMMITTED" }, data: { decision: "NEEDS_REVIEW", version: { increment: 1 } } });
  const preserved = created.length - removed.count + payments.length - removedPayments.count;
  await db.importBatch.update({ where: { id: batch.id }, data: { status: preserved ? "PARTIAL_ROLLBACK" : "ROLLED_BACK", rolledBackAt: new Date(), rolledBackCount: removed.count, preservedCount: preserved } });
  await audit(db, actor, batch.id, "finance.document_rolled_back", { removed: removed.count, preserved, snapshotsPreserved: true });
  return { removed: removed.count, preserved };
}
