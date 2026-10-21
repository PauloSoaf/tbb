import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/workspace";
import { openFinanceOverview } from "@/features/open-finance/queries";

/** Connections, accounts and recent runs of the signed-in workspace. Same-origin session today; a bearer check can wrap this for the mobile app. */
export async function GET() {
  const context = await requirePermission("READ");
  if (context.role !== "OWNER") return NextResponse.json({ error: "Somente o titular acessa as integrações bancárias." }, { status: 403 });
  return NextResponse.json(await openFinanceOverview(prisma, context.workspaceId), { headers: { "Cache-Control": "no-store" } });
}
