import { NextRequest, NextResponse } from "next/server";
import { storageSnapshotService } from "@/services/admin/storage-snapshot.service";

/**
 * Daily storage usage snapshot, invoked by Vercel Cron (see `vercel.json`,
 * schedule "0 6 * * *" — 06:00 UTC). Secured with `CRON_SECRET` per Vercel's
 * documented pattern (https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs):
 * Vercel sends the secret as `Authorization: Bearer <CRON_SECRET>`.
 *
 * Idempotent by design (`createAllTenantSnapshots` upserts on
 * tenantId+snapshotDate) — safe if Vercel's at-least-once delivery invokes
 * this twice for the same scheduled run.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const result = await storageSnapshotService.createAllTenantSnapshots();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[CRON_STORAGE_SNAPSHOT] Failed:", error);
    return NextResponse.json({ success: false, error: "Snapshot failed." }, { status: 500 });
  }
}
