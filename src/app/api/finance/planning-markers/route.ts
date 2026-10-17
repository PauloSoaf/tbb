import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/workspace";
import { isMonthKey } from "@/features/finance/calendar-core";
import { financePlanningMarkers } from "@/features/finance/planning/calendar-markers";
export async function GET(request: Request) {
  const context = await requirePermission("READ");
  if (context.role !== "OWNER") return NextResponse.json({ error: "Planejamento privado do titular." }, { status: 403 });
  const month = new URL(request.url).searchParams.get("month") ?? "";
  if (!isMonthKey(month) || month < "1900-01" || month > "2198-12") return NextResponse.json({ error: "Mês inválido." }, { status: 400 });
  return NextResponse.json({ markers: await financePlanningMarkers(context.workspaceId, month) }, { headers: { "Cache-Control": "private, no-store" } });
}
