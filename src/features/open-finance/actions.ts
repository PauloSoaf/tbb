"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/workspace";
import { addConnection, mapAccountLink, removeConnection, setConnectionPaused } from "./connections";
import { openFinanceError, syncMessage } from "./copy";
import { PluggyError, sharedPluggyClient } from "./pluggy-client";
import { syncConnection } from "./sync";
import { approveCreditBill } from "./credit-bills";

const text = (fd: FormData, key: string) => String(fd.get(key) || "").trim();
const invalidate = () => { revalidatePath("/integrations/open-finance"); revalidatePath("/integrations"); revalidatePath("/finance", "layout"); };
const fail = (error: unknown) => {
  if (error instanceof z.ZodError) return { error: error.issues[0]?.message || "Confira os campos." };
  if (error instanceof PluggyError) return { error: openFinanceError(error.code) ?? "A Pluggy recusou o pedido." };
  return { error: error instanceof Error ? error.message : "Não foi possível concluir a operação." };
};

export async function addOpenFinanceConnection(fd: FormData) {
  try {
    const ctx = await requirePermission("WRITE");
    await addConnection(prisma, ctx, { itemId: text(fd, "itemId"), label: text(fd, "label") });
    invalidate(); return { success: "Conexão adicionada. Sincronize para listar as contas do banco." };
  } catch (error) { return fail(error); }
}

export async function syncOpenFinanceNow(fd: FormData) {
  try {
    const ctx = await requirePermission("WRITE");
    const client = sharedPluggyClient("interactive");
    if (!client) throw new Error("As credenciais da Pluggy não estão configuradas no servidor (PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET).");
    const summary = await syncConnection({ prisma, client }, ctx, text(fd, "connectionId"), "MANUAL");
    invalidate(); return syncMessage(summary);
  } catch (error) { return fail(error); }
}

export async function mapOpenFinanceAccount(fd: FormData) {
  try {
    const ctx = await requirePermission("WRITE");
    await mapAccountLink(prisma, ctx, text(fd, "linkId"), { accountId: text(fd, "accountId") || null, syncFromDate: text(fd, "syncFromDate") || null, enabled: fd.get("enabled") === "on" });
    invalidate(); return { success: "Conta salva." };
  } catch (error) { return fail(error); }
}

export async function reviewOpenFinanceBill(fd: FormData) {
  try {
    const ctx = await requirePermission("WRITE");
    const status = z.enum(["OPEN", "FUTURE_KNOWN", "PAID"]).parse(text(fd, "status"));
    const [statementId, statementVersion] = text(fd, "target").split("|");
    await approveCreditBill(prisma, ctx, { snapshotId: text(fd, "snapshotId"), statementId: statementId || null, statementVersion: statementVersion || null, status, confirmed: fd.get("confirm") === "on" });
    invalidate(); return { success: "Fatura conciliada. Use Sincronizar agora para importar o detalhamento disponível." };
  } catch (error) { return fail(error); }
}

export async function pauseOpenFinanceConnection(fd: FormData) {
  try {
    const ctx = await requirePermission("WRITE");
    const paused = text(fd, "paused") === "1";
    await setConnectionPaused(prisma, ctx, text(fd, "connectionId"), paused);
    invalidate(); return { success: paused ? "Conexão pausada." : "Conexão retomada." };
  } catch (error) { return fail(error); }
}

export async function removeOpenFinanceConnection(fd: FormData) {
  try {
    const ctx = await requirePermission("WRITE");
    await removeConnection(prisma, ctx, text(fd, "connectionId"));
    invalidate(); return { success: "Conexão removida. Os lançamentos já importados continuam no TBB." };
  } catch (error) { return fail(error); }
}
