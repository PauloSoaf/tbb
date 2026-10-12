import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { candidateSchema } from "../import-candidates";
import { confirmFinancialEvidence, previewFinancialEvidence, reviewEvidenceCandidate, rollbackFinancialDocument, runFinancialImport, stageFinancialDocuments, type ImportActor } from "../document-import";
import { sourceHash } from "../import-reconciliation";
import { applyStatementSnapshot, linkStatementCarryover } from "../statement-snapshots";
import type { ParsedDocument } from "../document-parsers";

// Explicit disposable database only. This suite never uses the application's DATABASE_URL.
const url = process.env.FINANCE_IMPORT_TEST_DB_URL;
if (url && !/^\/tbb_(fin_import_qa|e2e|import_test)$/.test(new URL(url).pathname)) throw new Error("Integration tests require an explicitly disposable database");
describe.skipIf(!url)("financial document import in PostgreSQL", () => {
  const db = new PrismaClient({ datasourceUrl: url }), suffix = randomUUID();
  let actor: ImportActor, accountId: string, otherAccountId: string;
  const candidate = (changes = {}) => candidateSchema.parse({ locator: "row:2", description: "Loja sintética", rawDescription: "Loja sintética", purchasedDate: "2026-10-08", effectiveDate: "2026-10-08", amountCents: 1700, eventKind: "PURCHASE", dateBasis: "PURCHASE_DATE", confidence: "CONFIRMED", ...changes });
  const doc = (label: string, rows = [candidate()]): ParsedDocument => { const bytes = Buffer.from(label); return { name: label + ".csv", bytes, sha256: sourceHash(bytes), mediaType: "text/csv", candidates: rows, metadata: {} }; };
  const stage = (document: ParsedDocument) => runFinancialImport(db, tx => stageFinancialDocuments(tx, actor, accountId, [document]));
  const preview = (ids: string[]) => previewFinancialEvidence(db, actor, ids);
  beforeAll(async () => {
    const user = await db.user.create({ data: { email: `import-${suffix}@example.invalid`, name: "Import test", passwordHash: "test-only" } });
    const workspace = await db.workspace.create({ data: { name: "Synthetic import test", slug: `import-${suffix}`, memberships: { create: { userId: user.id, role: "OWNER" } } } });
    actor = { userId: user.id, workspaceId: workspace.id, role: "OWNER" };
    accountId = (await db.account.create({ data: { workspaceId: workspace.id, name: "Card test", type: "CREDIT_CARD" } })).id;
    otherAccountId = (await db.account.create({ data: { workspaceId: workspace.id, name: "Other card", type: "CREDIT_CARD" } })).id;
  });
  afterAll(async () => { await db.$disconnect(); });

  it("is idempotent across exact retries and changed upload filenames", async () => {
    const original = doc("idempotent"); const ids = await stage(original), first = await preview(ids);
    expect(first.counts.create).toBe(1);
    const result = await runFinancialImport(db, tx => confirmFinancialEvidence(tx, actor, ids, first.token, [{ id: first.rows[0].id, action: "CREATE" }]));
    expect(result.created).toBe(1);
    expect(await stage({ ...original, name: "different-name.csv" })).toEqual(ids);
    const repeat = await preview(ids); expect(repeat.counts).toMatchObject({ create: 0, keep: 1 });
    expect((await runFinancialImport(db, tx => confirmFinancialEvidence(tx, actor, ids, repeat.token, [{ id: repeat.rows[0].id, action: "KEEP" }]))).created).toBe(0);
  });
  it("keeps identical legitimate occurrences with different source locators", async () => {
    const ids = await stage(doc("identical", [candidate({ description: "Same item", merchant: "Same item", amountCents: 1801 }), candidate({ locator: "row:3", description: "Same item", merchant: "Same item", amountCents: 1801 })]));
    const p = await preview(ids);
    const r = await runFinancialImport(db, tx => confirmFinancialEvidence(tx, actor, ids, p.token, p.rows.map(row => ({ id: row.id, action: "CREATE" }))));
    expect(r.created).toBe(2);
    expect(await db.financeTransaction.count({ where: { workspaceId: actor.workspaceId, description: "Same item" } })).toBe(2);
  });
  it("links evidence and enriches dates without replacing manual descriptions, categories or tags", async () => {
    const category = await db.financeCategory.create({ data: { workspaceId: actor.workspaceId, name: "Manual category" } });
    const manual = await db.financeTransaction.create({ data: { workspaceId: actor.workspaceId, accountId, description: "My own description", merchant: "Manual merchant", amountCents: 2222, date: new Date("2026-10-09"), type: "EXPENSE", categoryId: category.id, tags: ["keep-me"], revision: 7 } });
    const ids = await stage(doc("enrich", [candidate({ amountCents: 2222, occurredAt: "2026-10-08T23:34:00Z", timezone: "America/Manaus", postedDate: "2026-10-09" })]));
    const p = await preview(ids);
    const r = await runFinancialImport(db, tx => confirmFinancialEvidence(tx, actor, ids, p.token, [{ id: p.rows[0].id, action: "ENRICH_METADATA", targetId: manual.id }]));
    expect(r.enriched).toBe(1);
    expect(await db.financeTransaction.findUnique({ where: { id: manual.id } })).toMatchObject({ description: "My own description", categoryId: category.id, tags: ["keep-me"], revision: 7, occurredTimezone: "America/Manaus", purchasedDate: new Date("2026-10-08"), postedDate: new Date("2026-10-09") });
  });
  it("rejects unauthorized roles, unrelated accounts and changed preview tokens", async () => {
    for (const role of ["MEMBER", "VIEWER", "ADMIN"]) await expect(stageFinancialDocuments(db, { ...actor, role }, accountId, [doc("denied")])).rejects.toThrow(/titular/);
    await expect(stageFinancialDocuments(db, actor, "missing", [doc("wrong-account")])).rejects.toThrow(/Conta/);
    const ids = await stage(doc("stale", [candidate({ amountCents: 2333 })])), p = await preview(ids);
    await db.financialEvidence.update({ where: { id: p.rows[0].id }, data: { version: { increment: 1 } } });
    await expect(runFinancialImport(db, tx => confirmFinancialEvidence(tx, actor, ids, p.token, [{ id: p.rows[0].id, action: "CREATE" }]))).rejects.toThrow(/revisão mudou/);
  });
  it("moves an unedited posting-based import to the confirmed photo day without duplicating it", async () => {
    const first = await stage(doc("posting-first", [candidate({ merchant: "Automatic vendor", description: "Automatic vendor", amountCents: 3434, purchasedDate: null, postedDate: "2026-10-09", effectiveDate: "2026-10-09", dateBasis: "POSTED_DATE" })])), p = await preview(first);
    await runFinancialImport(db, tx => confirmFinancialEvidence(tx, actor, first, p.token, [{ id: p.rows[0].id, action: "CREATE" }]));
    const second = await stage(doc("photo-later", [candidate({ merchant: "Automatic vendor", description: "Automatic vendor", amountCents: 3434, purchasedDate: "2026-10-08", occurredAt: "2026-10-08T23:17:00Z", timezone: "America/Manaus" })])), photo = await preview(second);
    expect(photo.rows[0].action).toBe("AMBIGUOUS");
    const targetId = photo.rows[0].matches[0].id;
    await runFinancialImport(db, tx => confirmFinancialEvidence(tx, actor, second, photo.token, [{ id: photo.rows[0].id, action: "ENRICH_METADATA", targetId }]));
    expect(await db.financeTransaction.findUnique({ where: { id: targetId } })).toMatchObject({ date: new Date("2026-10-08"), postedDate: new Date("2026-10-09"), purchasedDate: new Date("2026-10-08"), dateBasis: "PURCHASE_DATE" });
    expect(await db.financeTransaction.count({ where: { workspaceId: actor.workspaceId, amountCents: 3434 } })).toBe(1);
  });
  it("blocks statement links to another card and preserves unapproved rows", async () => {
    const other = await db.cardStatement.create({ data: { workspaceId: actor.workspaceId, accountId: otherAccountId, kind: "STATEMENT", status: "OPEN", amountCents: 10000, dueDate: new Date("2026-11-01"), periodKey: "due:2026-11-01", externalKey: "other-bill", sourceAsOf: new Date("2026-10-12"), sourceRecordType: "CURRENT_STATEMENT" } });
    const ids = await stage(doc("bad-statement", [candidate({ statementId: other.id, amountCents: 2444 })])), p = await preview(ids);
    await expect(runFinancialImport(db, tx => confirmFinancialEvidence(tx, actor, ids, p.token, [{ id: p.rows[0].id, action: "CREATE" }]))).rejects.toThrow(/outro cartão/);
    expect(await db.financialEvidence.findUnique({ where: { id: p.rows[0].id } })).toMatchObject({ decision: "NEEDS_REVIEW", transactionId: null });
  });
  it("records partial payments without income, links another source, and carries liability once", async () => {
    const [sourceId] = await stage(doc("payment-proof", [candidate({ eventKind: "CARD_PAYMENT", amountCents: 3000 })]));
    const previous = await runFinancialImport(db, tx => applyStatementSnapshot(tx, actor, accountId, { sourceId, locator: "previous", asOfDate: "2026-10-12", amountCents: 10000, status: "OPEN", referenceMonth: "2026-09", dueDate: "2026-10-01" }));
    const next = await runFinancialImport(db, tx => applyStatementSnapshot(tx, actor, accountId, { sourceId, locator: "next", asOfDate: "2026-10-12", amountCents: 8500, status: "OPEN", referenceMonth: "2026-11", dueDate: "2026-11-01", amountIsOutstanding: true }));
    const p = await preview([sourceId]);
    await db.financialEvidence.update({ where: { id: p.rows[0].id }, data: { candidate: { ...p.rows[0].candidate, statementId: previous.statementId }, version: { increment: 1 } } });
    const fresh = await preview([sourceId]);
    expect((await runFinancialImport(db, tx => confirmFinancialEvidence(tx, actor, [sourceId], fresh.token, [{ id: fresh.rows[0].id, action: "CREATE" }]))).payments).toBe(1);
    expect(await db.financeTransaction.count({ where: { workspaceId: actor.workspaceId, type: "INCOME", amountCents: 3000 } })).toBe(0);
    expect(await db.cardStatement.findUnique({ where: { id: previous.statementId } })).toMatchObject({ status: "OPEN", amountCents: 10000 });
    const other = await stage(doc("payment-second-proof", [candidate({ eventKind: "CARD_PAYMENT", amountCents: 3000, statementId: previous.statementId })])), probable = await preview(other);
    expect(probable.rows[0].action).toBe("AMBIGUOUS");
    await runFinancialImport(db, tx => confirmFinancialEvidence(tx, actor, other, probable.token, [{ id: probable.rows[0].id, action: "LINK_EVIDENCE", targetId: probable.rows[0].matches[0].id }]));
    expect((await preview(other)).counts.keep).toBe(1);
    expect(await db.cardStatementPayment.count({ where: { workspaceId: actor.workspaceId, cardStatementId: previous.statementId } })).toBe(1);
    await runFinancialImport(db, tx => linkStatementCarryover(tx, actor, previous.statementId, next.statementId, sourceId, "2026-10-12"));
    expect(await db.cardStatement.findUnique({ where: { id: previous.statementId } })).toMatchObject({ rolledIntoStatementId: next.statementId });
  });
  it("serializes concurrent uploads with unique source and event identities", async () => {
    const original = doc("concurrent", [candidate({ amountCents: 2555 })]);
    await Promise.allSettled([stage(original), stage(original)]);
    expect(await db.financialSource.count({ where: { workspaceId: actor.workspaceId, sha256: original.sha256 } })).toBe(1);
    const ids = await stage(original), p = await preview(ids), decisions = [{ id: p.rows[0].id, action: "CREATE" as const }];
    await Promise.allSettled([runFinancialImport(db, tx => confirmFinancialEvidence(tx, actor, ids, p.token, decisions)), runFinancialImport(db, tx => confirmFinancialEvidence(tx, actor, ids, p.token, decisions))]);
    expect(await db.financeTransaction.count({ where: { workspaceId: actor.workspaceId, amountCents: 2555 } })).toBe(1);
  });
  it("corrects reviewed FX on the original purchase without creating another expense", async () => {
    const original = candidate({ amountCents: 11165, description: "Synthetic FX", originalCurrency: "USD", originalAmountCents: 2200, exchangeRate: "4,00" });
    const metadata = candidate({ ...original, locator: "row:2:fx", eventKind: "METADATA_REVIEW", relatedLocator: "row:2", confidence: "LOW", problems: ["Cotação divergente"] });
    const ids = await stage(doc("fx-review", [original, metadata])), p = await preview(ids);
    const root = p.rows.find(r => r.candidate.eventKind === "PURCHASE")!;
    await runFinancialImport(db, tx => confirmFinancialEvidence(tx, actor, ids, p.token, [{ id: root.id, action: "CREATE" }]));
    const after = await preview(ids), review = after.rows.find(r => r.candidate.eventKind === "METADATA_REVIEW")!;
    expect(review.action).toBe("CONFLICT");
    await runFinancialImport(db, tx => reviewEvidenceCandidate(tx, actor, review.id, { ...review.candidate, confidence: "CONFIRMED", problems: [], exchangeRate: "5,075" }, review.version));
    const verified = await preview(ids), ready = verified.rows.find(r => r.id === review.id)!;
    expect(ready.action).toBe("ENRICH_METADATA");
    await expect(runFinancialImport(db, tx => confirmFinancialEvidence(tx, actor, ids, verified.token, [{ id: ready.id, action: "CREATE" }]))).rejects.toThrow(/não cria outra compra/);
    await runFinancialImport(db, tx => confirmFinancialEvidence(tx, actor, ids, verified.token, [{ id: ready.id, action: "ENRICH_METADATA", targetId: ready.matches[0].id }]));
    expect(await db.financeTransaction.count({ where: { workspaceId: actor.workspaceId, amountCents: 11165 } })).toBe(1);
    expect(await db.financeTransaction.findUnique({ where: { id: ready.matches[0].id } })).toMatchObject({ exchangeRate: "5,075", amountCents: 11165, revision: 1 });
    expect((await preview(ids)).counts).toMatchObject({ create: 0, keep: 2 });
  });
  it("rolls back only unedited created rows and preserves shared/manual evidence", async () => {
    const ids = await stage(doc("rollback", [candidate({ amountCents: 2666 }), candidate({ locator: "row:3", amountCents: 2777 })])), p = await preview(ids);
    await runFinancialImport(db, tx => confirmFinancialEvidence(tx, actor, ids, p.token, p.rows.map(r => ({ id: r.id, action: "CREATE" }))));
    const edited = await db.financeTransaction.findFirstOrThrow({ where: { workspaceId: actor.workspaceId, amountCents: 2666 } });
    await db.financeTransaction.update({ where: { id: edited.id }, data: { revision: 1, description: "Edited manually" } });
    const source = await db.financialSource.findUniqueOrThrow({ where: { id: ids[0] } });
    expect(await runFinancialImport(db, tx => rollbackFinancialDocument(tx, actor, source.importBatchId!))).toEqual({ removed: 1, preserved: 1 });
    expect(await db.financeTransaction.findUnique({ where: { id: edited.id } })).toMatchObject({ description: "Edited manually" });
    expect(await db.financeTransaction.count({ where: { workspaceId: actor.workspaceId, amountCents: 2777 } })).toBe(0);
    expect((await preview(ids)).counts.create).toBe(1);
  });
});
