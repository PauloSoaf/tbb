import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sharedPluggyClient } from "@/features/open-finance/pluggy-client";
import { syncEverythingDue } from "@/features/open-finance/setup";
import { revalidatePath } from "next/cache";

/** The scheduled entry point. Vercel Cron sends `Authorization: Bearer $CRON_SECRET`; any scheduler can do the same. */
function authorised(request: Request) {
  const secret = process.env.OPEN_FINANCE_CRON_SECRET?.trim() || process.env.CRON_SECRET?.trim();
  if (!secret || secret.length < 24) return false;
  const given = Buffer.from(request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? ""), expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
async function run(request: Request) {
  if (!authorised(request)) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const client = sharedPluggyClient();
  if (!client) return NextResponse.json({ error: "Credenciais da Pluggy não configuradas." }, { status: 503 });
  const results = await syncEverythingDue({ prisma, client });
  if (results.length) revalidatePath("/finance", "layout");
  const failed = results.filter(result => !["SUCCESS", "PAUSED", "BUSY"].includes(result.status)).length;
  const status = !failed ? 200 : failed === results.length ? 503 : 207;
  // Counts and codes only: nothing financial leaves in the response or the logs.
  return NextResponse.json({ connections: results.length, results: results.map(({ status, errorCode, autoCreated, needsReview }) => ({ status, errorCode, autoCreated, needsReview })) }, { status, headers: { "Cache-Control": "no-store" } });
}
export const GET = run;
export const POST = run;
