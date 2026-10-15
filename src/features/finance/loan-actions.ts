"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/workspace";
import { comparisonPayloadSchema } from "./loan-comparison";

const MAX_SAVED = 30;
const PAGE = "/finance/debts/simulator";

/** Saving is a deliberate act: only the inputs are stored, never results. A saved comparison is a study:
 * it creates no debt, no installment and changes no bill. Owner only, inside the session's workspace. */
export async function saveLoanComparison(fd: FormData) {
  const ctx = await requirePermission("WRITE");
  if (ctx.role !== "OWNER") return { error: "Somente o titular pode salvar comparações de crédito." };
  try {
    const name = z.string().trim().min(1, "Dê um nome à comparação.").max(120, "Use até 120 caracteres no nome.").parse(String(fd.get("name") ?? ""));
    let raw: unknown;
    try { raw = JSON.parse(String(fd.get("payload") ?? "")); } catch { throw new Error("Os dados da comparação são inválidos."); }
    const payload = comparisonPayloadSchema.parse(raw);
    const id = String(fd.get("id") ?? "").trim();
    await prisma.$transaction(async (tx) => {
      if (id) {
        const updated = await tx.loanComparison.updateMany({ where: { id, workspaceId: ctx.workspaceId }, data: { name, payload, version: payload.version } });
        if (updated.count !== 1) throw new Error("Comparação não encontrada neste espaço.");
      } else {
        if (await tx.loanComparison.count({ where: { workspaceId: ctx.workspaceId } }) >= MAX_SAVED) throw new Error(`Você já tem ${MAX_SAVED} comparações salvas. Exclua alguma para salvar outra.`);
        await tx.loanComparison.create({ data: { workspaceId: ctx.workspaceId, name, payload, version: payload.version, createdByUserId: ctx.userId } });
      }
      await tx.activityEvent.create({ data: { workspaceId: ctx.workspaceId, actorUserId: ctx.userId, type: "finance.loan_comparison_saved", entityType: "LoanComparison", entityId: id || "new", source: "MANUAL", metadata: { scenarios: payload.scenarios.length } } });
    });
    revalidatePath(PAGE);
    return { success: id ? "Comparação atualizada." : "Comparação salva. Nada foi criado em dívidas ou faturas." };
  } catch (error) {
    if (error instanceof z.ZodError) return { error: error.issues[0]?.message || "Confira os dados da comparação." };
    return { error: error instanceof Error ? error.message : "Não foi possível salvar a comparação." };
  }
}

export async function deleteLoanComparison(fd: FormData) {
  const ctx = await requirePermission("WRITE");
  if (ctx.role !== "OWNER") return { error: "Somente o titular pode excluir comparações." };
  try {
    const removed = await prisma.loanComparison.deleteMany({ where: { id: String(fd.get("id") ?? ""), workspaceId: ctx.workspaceId } });
    if (removed.count !== 1) throw new Error("Comparação não encontrada neste espaço.");
    revalidatePath(PAGE);
    return { success: "Comparação excluída." };
  } catch (error) { return { error: error instanceof Error ? error.message : "Não foi possível excluir." }; }
}
