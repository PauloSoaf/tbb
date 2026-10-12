"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/workspace";
import { candidateSchema } from "./import-candidates";
import { parseFinancialDocuments, IMPORT_LIMITS } from "./document-parsers";
import { applyStatementSnapshot } from "./statement-snapshots";
import { parseMoney } from "./money";
import { assertImportOwner, confirmFinancialEvidence, previewFinancialEvidence, reviewEvidenceCandidate, runFinancialImport, stageFinancialDocuments } from "./document-import";

const sourceList = z.array(z.string().min(1).max(100)).min(1).max(100);
const getSources = (fd: FormData) => sourceList.parse(JSON.parse(String(fd.get("sourceIds") || "[]")));
const fail = (e: unknown) => ({ error: e instanceof Error ? e.message : "Não foi possível concluir a importação." });
const invalidate = () => revalidatePath("/finance", "layout");
export async function uploadFinancialSources(fd: FormData) {
  try {
    const ctx = await requirePermission("WRITE"), accountId = String(fd.get("accountId") || "");
    if (!accountId) throw new Error("Selecione uma conta existente.");
    const account = await assertImportOwner(prisma, ctx, accountId);
    const files = fd.getAll("files");
    if (!files.length || files.length > IMPORT_LIMITS.files || files.some(f => !(f instanceof File) || f.size > IMPORT_LIMITS.fileBytes) || files.reduce((s, f) => s + (f instanceof File ? f.size : 0), 0) > IMPORT_LIMITS.totalBytes) throw new Error("Escolha até 100 arquivos, 5 MB por arquivo e 20 MB no total.");
    const documents = await parseFinancialDocuments(await Promise.all((files as File[]).map(async f => ({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) }))), account?.type === "CREDIT_CARD");
    const ids = await runFinancialImport(prisma, db => stageFinancialDocuments(db, ctx, accountId, documents));
    invalidate(); return { sourceIds: ids, ...await previewFinancialEvidence(prisma, ctx, ids) };
  } catch (e) { return fail(e); }
}
export async function refreshFinancialReview(fd: FormData) {
  try { const ctx = await requirePermission("READ"); return await previewFinancialEvidence(prisma, ctx, getSources(fd)); }
  catch (e) { return fail(e); }
}
export async function confirmFinancialReview(fd: FormData) {
  try {
    const ctx = await requirePermission("WRITE"), ids = getSources(fd);
    const decisions = z.array(z.object({ id: z.string(), action: z.enum(["CREATE", "LINK_EVIDENCE", "ENRICH_METADATA", "KEEP", "IGNORE"]), targetId: z.string().optional(), confirmedSeparate: z.boolean().optional() })).min(1).max(5000).parse(JSON.parse(String(fd.get("decisions") || "[]")));
    const counts = await runFinancialImport(prisma, db => confirmFinancialEvidence(db, ctx, ids, String(fd.get("token") || ""), decisions));
    invalidate(); return { applied: counts, ...await previewFinancialEvidence(prisma, ctx, ids) };
  } catch (e) { return fail(e); }
}
export async function updateFinancialCandidate(fd: FormData) {
  try {
    const ctx = await requirePermission("WRITE"), candidate = candidateSchema.parse(JSON.parse(String(fd.get("candidate") || "{}")));
    await runFinancialImport(prisma, db => reviewEvidenceCandidate(db, ctx, String(fd.get("id") || ""), candidate, z.coerce.number().int().positive().parse(fd.get("version"))));
    invalidate(); return { success: "Dados revisados. Confira a nova prévia antes de confirmar." };
  } catch (e) { return fail(e); }
}
export async function appendFinancialTranscription(fd: FormData) {
  try {
    const ctx = await requirePermission("WRITE"), rows = z.array(candidateSchema).min(1).max(5000).parse(JSON.parse(String(fd.get("rows") || "[]")));
    await runFinancialImport(prisma, async db => {
      await assertImportOwner(db, ctx);
      const source = await db.financialSource.findFirst({ where: { id: String(fd.get("sourceId") || ""), workspaceId: ctx.workspaceId } });
      if (!source) throw new Error("Original não encontrado.");
      await assertImportOwner(db, ctx, source.accountId);
      await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${ctx.workspaceId}:${source.accountId}:financial-import`}, 0))`;
      const current = await db.financialEvidence.count({ where: { sourceId: source.id } });
      if (current + rows.length > 5000) throw new Error("Fonte excede 5.000 ocorrências.");
      if (new Set(rows.map(r => r.locator)).size !== rows.length) throw new Error("Posições repetidas na transcrição.");
      const existing = await db.financialEvidence.findMany({ where: { sourceId: source.id, locator: { in: rows.map(r => r.locator) } }, select: { locator: true, originalCandidate: true } });
      if (existing.some(e => JSON.stringify(candidateSchema.parse(e.originalCandidate)) !== JSON.stringify(rows.find(r => r.locator === e.locator)))) throw new Error("Já existe uma transcrição diferente nesta posição. Use Corrigir dados na ocorrência existente.");
      await db.financialEvidence.createMany({ data: rows.map(c => ({ workspaceId: ctx.workspaceId, sourceId: source.id, locator: c.locator, candidate: c as unknown as Prisma.InputJsonValue, originalCandidate: c as unknown as Prisma.InputJsonValue, importBatchId: source.importBatchId })), skipDuplicates: true });
      await db.activityEvent.create({ data: { workspaceId: ctx.workspaceId, actorUserId: ctx.userId, type: "finance.source_transcribed", entityType: "FinancialSource", entityId: source.id, metadata: { rows: rows.length } } });
    });
    invalidate(); return { success: "Transcrição adicionada à revisão; ainda não cria lançamentos." };
  } catch (e) { return fail(e); }
}

export async function applyFinancialStatementSnapshot(fd: FormData) {
  try {
    const ctx = await requirePermission("WRITE"), sourceId = String(fd.get("sourceId") || "");
    await assertImportOwner(prisma, ctx);
    if (fd.get("verified") !== "on") throw new Error("Confira o total e as datas no original.");
    const source = await prisma.financialSource.findFirst({ where: { id: sourceId, workspaceId: ctx.workspaceId }, select: { accountId: true } });
    if (!source) throw new Error("Fonte indisponível.");
    const status = z.enum(["OPEN", "PAID", "FUTURE_KNOWN"]).parse(fd.get("status"));
    const input = { sourceId, locator: `statement:${String(fd.get("referenceMonth"))}:${String(fd.get("asOfDate"))}`, asOfDate: String(fd.get("asOfDate")), referenceMonth: String(fd.get("referenceMonth")), amountCents: parseMoney(String(fd.get("amount"))), status,
      statementId: String(fd.get("statementId") || "") || undefined, expectedVersion: String(fd.get("version") || "") || undefined, dueDate: String(fd.get("dueDate") || "") || null,
      amountIsOutstanding: fd.get("amountIsOutstanding") === "on" };
    const result = await runFinancialImport(prisma, async db => {
      const saved = await applyStatementSnapshot(db, ctx, source.accountId, input);
      if (fd.get("linkPurchases") === "on") {
        const rows = await db.financialEvidence.findMany({ where: { workspaceId: ctx.workspaceId, sourceId, decision: "NEEDS_REVIEW" } });
        for (const row of rows) {
          const candidate = candidateSchema.parse(row.candidate);
          if (!candidate.statementId && !["CARD_PAYMENT", "TRANSFER", "UNREAD", "CREDIT_CONVERSION"].includes(candidate.eventKind)) await db.financialEvidence.update({ where: { id: row.id }, data: { candidate: { ...candidate, statementId: saved.statementId } as unknown as Prisma.InputJsonValue, version: { increment: 1 } } });
        }
      }
      return saved;
    });
    invalidate(); return { success: result.action === "KEEP" ? "Snapshot mantido; nenhuma nova fatura." : "Fatura conciliada. As compras apenas detalham seu total.", ...result };
  } catch (e) { return fail(e); }
}
