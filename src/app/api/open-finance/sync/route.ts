import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/workspace";
import { PluggyError, sharedPluggyClient } from "@/features/open-finance/pluggy-client";
import { syncEverything } from "@/features/open-finance/setup";
import { revalidatePath } from "next/cache";
import { openFinanceError, openFinanceHttpStatus } from "@/features/open-finance/copy";

const body = z.object({ connectionId: z.string().min(1).max(100) });
export async function POST(request: Request) {
  const context = await requirePermission("WRITE");
  if (context.role !== "OWNER") return NextResponse.json({ error: "Somente o titular sincroniza integrações bancárias." }, { status: 403 });
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Informe a conexão." }, { status: 400 });
  const client = sharedPluggyClient("interactive");
  if (!client) return NextResponse.json({ error: "Credenciais da Pluggy não configuradas no servidor." }, { status: 503 });
  try {
    const summary = await syncEverything({ prisma, client }, context, parsed.data.connectionId);
    revalidatePath("/finance", "layout");
    const status = summary.status === "ERROR" || summary.status === "NEEDS_RECONNECT" || summary.status === "CONSENT_EXPIRED" ? openFinanceHttpStatus(summary.errorCode) : summary.status === "PARTIAL" ? 207 : summary.status === "BUSY" ? 409 : 200;
    return NextResponse.json({ ...summary, message: summary.errorCode ? openFinanceError(summary.errorCode) : null }, { status, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const code = error instanceof PluggyError ? error.code : "SYNC_FAILED";
    if (error instanceof PluggyError) revalidatePath("/integrations/open-finance");
    return NextResponse.json({ error: openFinanceError(code), code }, { status: error instanceof PluggyError ? openFinanceHttpStatus(code) : 500, headers: { "Cache-Control": "no-store" } });
  }
}
