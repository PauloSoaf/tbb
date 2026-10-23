import { NextResponse } from "next/server";
import { currentFinanceOrigin } from "@/features/finance/data-origin-request";
import { financeCalendarMonth } from "@/features/finance/calendar-query";
import { isMonthKey } from "@/features/finance/calendar-core";
import { requirePermission, getCurrentTenantContext, AuthorizationError } from "@/lib/workspace";

export async function GET(request: Request) {
  if (!await getCurrentTenantContext()) return NextResponse.json({ error: "Faça login para consultar o calendário." }, { status: 401 });
  let context;
  try { context = await requirePermission("READ"); }
  catch (error) {
    if (error instanceof AuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 });
    throw error;
  }
  const month = new URL(request.url).searchParams.get("month") ?? "";
  if (!isMonthKey(month) || month === "9998-12") {
    return NextResponse.json({ error: "Informe um mês válido no formato AAAA-MM." }, { status: 400 });
  }
  const calendar = await financeCalendarMonth(context.workspaceId, month, context.role === "OWNER", await currentFinanceOrigin());
  return NextResponse.json(calendar, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}
