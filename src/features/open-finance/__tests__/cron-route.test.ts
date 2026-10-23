import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
const syncDue = vi.hoisted(() => vi.fn());
const shared = vi.hoisted(() => vi.fn());
vi.mock("@/features/open-finance/setup", () => ({ syncEverythingDue: syncDue }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/open-finance/pluggy-client", () => ({ sharedPluggyClient: shared }));
import { GET, POST } from "@/app/api/open-finance/cron/route";

const SECRET = "s".repeat(32);
const call = (method: "GET" | "POST", authorization?: string) => (method === "GET" ? GET : POST)(new Request("http://localhost/api/open-finance/cron", { method, headers: authorization ? { authorization } : {} }));
const saved = { cron: process.env.OPEN_FINANCE_CRON_SECRET, vercel: process.env.CRON_SECRET };
beforeEach(() => { process.env.OPEN_FINANCE_CRON_SECRET = SECRET; delete process.env.CRON_SECRET; syncDue.mockReset(); shared.mockReset(); shared.mockReturnValue({}); });
afterEach(() => { for (const [key, value] of [["OPEN_FINANCE_CRON_SECRET", saved.cron], ["CRON_SECRET", saved.vercel]] as const) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });

describe("scheduled sync endpoint", () => {
  it("rejects a missing, wrong or differently sized secret without touching the provider", async () => {
    for (const header of [undefined, "Bearer wrong", `Bearer ${SECRET}x`, `Bearer ${SECRET.slice(1)}`, SECRET.slice(0, 5)]) {
      expect((await call("GET", header)).status).toBe(401);
    }
    expect(syncDue).not.toHaveBeenCalled();
    expect(shared).not.toHaveBeenCalled();
  });

  it("refuses to run at all when no secret, or a weak one, is configured", async () => {
    delete process.env.OPEN_FINANCE_CRON_SECRET;
    expect((await call("GET", `Bearer ${SECRET}`)).status).toBe(401);
    process.env.OPEN_FINANCE_CRON_SECRET = "too-short";
    expect((await call("GET", "Bearer too-short")).status).toBe(401);
  });

  it("accepts the Vercel secret name too", async () => {
    delete process.env.OPEN_FINANCE_CRON_SECRET; process.env.CRON_SECRET = SECRET;
    syncDue.mockResolvedValue([]);
    expect((await call("GET", `Bearer ${SECRET}`)).status).toBe(200);
  });

  it("says so when the Pluggy credentials are missing", async () => {
    shared.mockReturnValue(null);
    expect((await call("POST", `Bearer ${SECRET}`)).status).toBe(503);
    expect(syncDue).not.toHaveBeenCalled();
  });

  it("runs the sync and answers with counts and codes only", async () => {
    syncDue.mockResolvedValue([{ status: "SUCCESS", runId: "run-1", autoCreated: 3, needsReview: 1, staged: 4, alreadyKnown: 9, accountsSeen: 2, transactionsFetched: 40, pendingSkipped: 0, outsideWindow: 0 }, { status: "ERROR", errorCode: "RATE_LIMITED", autoCreated: 0, needsReview: 0 }]);
    const response = await call("GET", `Bearer ${SECRET}`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ connections: 2, results: [{ status: "SUCCESS", autoCreated: 3, needsReview: 1 }, { status: "ERROR", errorCode: "RATE_LIMITED", autoCreated: 0, needsReview: 0 }] });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
