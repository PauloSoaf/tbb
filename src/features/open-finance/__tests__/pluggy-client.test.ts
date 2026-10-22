import { describe, expect, it, vi } from "vitest";
import { createPluggyClient, PluggyError } from "../pluggy-client";

type Step = { status?: number; body?: unknown; headers?: Record<string, string>; throws?: boolean };
/** A scripted fetch: each call consumes the next step for its path, so a test states exactly what the provider does. */
function scripted(routes: Record<string, Step[]>) {
  const calls: { path: string; method: string; key: string | null }[] = [];
  const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input)), path = `${url.pathname}${url.search}`;
    calls.push({ path, method: init?.method ?? "GET", key: (init?.headers as Record<string, string>)["X-API-KEY"] ?? null });
    const queue = routes[path] ?? routes[url.pathname];
    const step = queue?.shift();
    if (!step) throw new Error(`unscripted call ${path}`);
    if (step.throws) throw new TypeError("network down");
    return new Response(JSON.stringify(step.body ?? {}), { status: step.status ?? 200, headers: step.headers });
  });
  return { fetchImpl: fetchImpl as unknown as typeof fetch, calls };
}
const auth = (n = 1) => Array.from({ length: n }, (_, i) => ({ body: { apiKey: `key-number-${i + 1}-abcdef` } }));
const make = (routes: Record<string, Step[]>, extra = {}) => {
  const { fetchImpl, calls } = scripted(routes);
  const sleep = vi.fn(async () => {});
  return { client: createPluggyClient({ clientId: "id", clientSecret: "secret", fetch: fetchImpl, sleep, ...extra }), calls, sleep };
};
const tx = (id: string, extra = {}) => ({ id, accountId: "acc", description: "d", amount: 10, date: "2026-10-01T00:00:00.000Z", type: "DEBIT", status: "POSTED", ...extra });

describe("Pluggy client", () => {
  it("authenticates on the server with the client credentials and reuses the key between calls", async () => {
    const { client, calls } = make({ "/auth": auth(), "/items/abc": [{ body: { id: "abc", status: "UPDATED" } }, { body: { id: "abc", status: "UPDATED" } }] });
    await client.getItem("abc"); await client.getItem("abc");
    expect(calls.filter((call) => call.path === "/auth")).toHaveLength(1);
    expect(calls.filter((call) => call.path === "/items/abc").every((call) => call.key === "key-number-1-abcdef")).toBe(true);
  });

  it("renews an expired key before it is used", async () => {
    let time = 0;
    const { client, calls } = make({ "/auth": auth(2), "/items/abc": [{ body: { id: "abc" } }, { body: { id: "abc" } }] }, { now: () => time });
    await client.getItem("abc"); time += 111 * 60 * 1000; await client.getItem("abc");
    expect(calls.filter((call) => call.path === "/auth")).toHaveLength(2);
    expect(calls.at(-1)?.key).toBe("key-number-2-abcdef");
  });

  it("refreshes the key once when the provider rejects it, then retries the request", async () => {
    const { client, calls } = make({ "/auth": auth(2), "/items/abc": [{ status: 401 }, { body: { id: "abc" } }] });
    expect((await client.getItem("abc")).id).toBe("abc");
    expect(calls.filter((call) => call.path === "/auth")).toHaveLength(2);
  });

  it("gives up with a short code when the credentials are wrong, without echoing any body", async () => {
    const { client } = make({ "/auth": [{ status: 403, body: { message: "secret detail about the account" } }] });
    const error = await client.getItem("abc").catch((reason) => reason);
    expect(error).toBeInstanceOf(PluggyError);
    expect([error.code, error.status, error.message]).toEqual(["INVALID_CREDENTIALS", 403, "INVALID_CREDENTIALS"]);
  });

  it("fails fast on a 429 when the wait is longer than the caller will tolerate", async () => {
    const { client, sleep } = make({ "/auth": auth(), "/items/abc": [{ status: 429, headers: { "Retry-After": "60" } }, { body: { id: "abc" } }] }, { maxRateLimitWaitMs: 8_000 });
    await expect(client.getItem("abc")).rejects.toMatchObject({ code: "RATE_LIMITED" });
    expect(sleep).not.toHaveBeenCalled();
  });

  it("waits for Retry-After on a 429 and then succeeds", async () => {
    const { client, sleep } = make({ "/auth": auth(), "/items/abc": [{ status: 429, headers: { "Retry-After": "60" } }, { body: { id: "abc" } }] });
    expect((await client.getItem("abc")).id).toBe("abc");
    expect(sleep).toHaveBeenCalledWith(60_000);
  });

  it("retries provider failures with growing backoff and stops after the limit", async () => {
    const { client, sleep } = make({ "/auth": auth(), "/items/abc": [{ status: 503 }, { status: 502 }, { body: { id: "abc" } }] });
    await client.getItem("abc");
    const waits = sleep.mock.calls.map((call) => (call as unknown as number[])[0]);
    expect(waits).toHaveLength(2);
    expect(waits[1]).toBeGreaterThan(waits[0]);
    const failing = make({ "/auth": auth(), "/items/abc": Array.from({ length: 10 }, () => ({ status: 500 })) }, { maxRetries: 2 });
    await expect(failing.client.getItem("abc")).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
    expect(failing.sleep).toHaveBeenCalledTimes(2);
  });

  it("treats a network failure as retryable and a missing item as NOT_FOUND", async () => {
    const { client } = make({ "/auth": auth(), "/items/abc": [{ throws: true }, { body: { id: "abc" } }], "/items/gone": [{ status: 404 }] });
    expect((await client.getItem("abc")).id).toBe("abc");
    await expect(client.getItem("gone")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects a response that does not look like the documented shape", async () => {
    const { client } = make({ "/auth": auth(), "/items/abc": [{ body: { status: "UPDATED" } }] });
    await expect(client.getItem("abc")).rejects.toMatchObject({ code: "UNEXPECTED_RESPONSE" });
  });

  it("counts and skips a malformed transaction instead of failing the whole page", async () => {
    const { client } = make({ "/auth": auth(), "/v2/transactions": [{ body: { results: [tx("a"), { id: "b" }, tx("c")], next: null } }] });
    const result = await client.listTransactions("acc");
    expect([result.items.map((item) => item.id), result.invalid, result.pages]).toEqual([["a", "c"], 1, 1]);
  });

  it("follows the cursor whatever shape `next` takes, keeping the account filter", async () => {
    const first = "/v2/transactions?accountId=acc&dateFrom=2026-10-01";
    const shapes: [string, string][] = [
      ["?after=CUR1&accountId=acc", "/v2/transactions?after=CUR1&accountId=acc"],
      ["after=CUR1&accountId=acc", "/v2/transactions?after=CUR1&accountId=acc"],
      ["CUR1", "/v2/transactions?accountId=acc&dateFrom=2026-10-01&after=CUR1"],
      ["/v2/transactions?after=CUR1&accountId=acc", "/v2/transactions?after=CUR1&accountId=acc"],
      ["https://api.pluggy.ai/v2/transactions?after=CUR1&accountId=acc", "/v2/transactions?after=CUR1&accountId=acc"],
    ];
    for (const [next, expected] of shapes) {
      const { client, calls } = make({ "/auth": auth(), [first]: [{ body: { results: [tx("a")], next } }], [expected]: [{ body: { results: [tx("b")], next: null } }] });
      const result = await client.listTransactions("acc", { dateFrom: "2026-10-01" });
      expect([next, result.items.map((item) => item.id)]).toEqual([next, ["a", "b"]]);
      expect(calls.at(-1)?.path).toBe(expected);
    }
  });

  it("refuses a cursor that points at another host", async () => {
    const { client } = make({ "/auth": auth(), "/v2/transactions": [{ body: { results: [tx("a")], next: "https://evil.example/v2/transactions?after=x" } }] });
    await expect(client.listTransactions("acc")).rejects.toMatchObject({ code: "UNEXPECTED_RESPONSE" });
  });

  it("stops a cursor that never advances", async () => {
    const { client } = make({ "/auth": auth(), "/v2/transactions": [{ body: { results: [tx("a")], next: "?accountId=acc" } }, { body: { results: [tx("b")], next: "?accountId=acc" } }], "/v2/transactions?accountId=acc": [{ body: { results: [tx("c")], next: "?accountId=acc" } }] });
    await expect(client.listTransactions("acc")).rejects.toMatchObject({ code: "UNEXPECTED_RESPONSE" });
  });

  it("lists accounts and bills with the required identifiers in the query", async () => {
    const { client, calls } = make({ "/auth": auth(), "/accounts?itemId=item-1": [{ body: { results: [{ id: "a1", type: "BANK" }, { type: "BANK" }] } }], "/bills?accountId=a1&pageSize=500": [{ body: { results: [{ id: "bill-1", totalAmount: 10 }] } }] });
    const accounts = await client.listAccounts("item-1"), bills = await client.listBills("a1");
    expect([accounts.items.length, accounts.invalid, bills.items[0].id]).toEqual([1, 1, "bill-1"]);
    expect(calls.every((call) => call.method === "GET" || call.path === "/auth")).toBe(true);
  });

  it("reads every bill page so an older or future bill is not silently omitted", async () => {
    const { client } = make({ "/auth": auth(),
      "/bills?accountId=card&pageSize=500": [{ body: { results: [{ id: "first" }], totalPages: 2, page: 1 } }],
      "/bills?accountId=card&pageSize=500&page=2": [{ body: { results: [{ id: "second" }], totalPages: 2, page: 2 } }],
    });
    expect((await client.listBills("card")).items.map(bill => bill.id)).toEqual(["first", "second"]);
  });
});
