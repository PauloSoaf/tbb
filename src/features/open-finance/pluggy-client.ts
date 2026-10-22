import { z } from "zod";
import { authSchema, pagedSchema, pluggyAccountSchema, pluggyBillSchema, pluggyItemSchema, pluggyTransactionSchema, type PluggyAccount, type PluggyBill, type PluggyItem, type PluggyTransaction } from "./pluggy-schemas";

export const PLUGGY_BASE_URL = "https://api.pluggy.ai";
/** An API key lives two hours; renew a little early so a request never carries one about to expire. */
const API_KEY_TTL_MS = 110 * 60 * 1000;
const MAX_PAGES = 400;

/** Errors carry a short code and never a response body: bodies can echo identifiers or personal data. */
export class PluggyError extends Error {
  constructor(public readonly code: string, public readonly status?: number) { super(code); this.name = "PluggyError"; }
}

export type PluggyClientOptions = {
  clientId: string;
  clientSecret: string;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  maxRetries?: number;
  /** Longest wait honoured on a 429. Pluggy asks for 60 s. */
  maxRateLimitWaitMs?: number;
  timeoutMs?: number;
};

export type Fetched<T> = { items: T[]; invalid: number };
const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function createPluggyClient(options: PluggyClientOptions) {
  const doFetch = options.fetch ?? fetch, sleep = options.sleep ?? defaultSleep, now = options.now ?? Date.now;
  const maxRetries = options.maxRetries ?? 4, maxRateLimitWaitMs = options.maxRateLimitWaitMs ?? 65_000, timeoutMs = options.timeoutMs ?? 20_000;
  let key: { value: string; expiresAt: number } | null = null;

  async function send(path: string, init: RequestInit, auth: boolean, attempt = 0, refreshed = false): Promise<unknown> {
    const headers: Record<string, string> = { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}) };
    if (auth) headers["X-API-KEY"] = await apiKey();
    let response: Response;
    try { response = await doFetch(`${PLUGGY_BASE_URL}${path}`, { ...init, headers, signal: AbortSignal.timeout(timeoutMs), redirect: "error" }); }
    catch { return retry(path, init, auth, attempt, refreshed, "NETWORK_ERROR"); }
    if (response.ok) {
      try { return await response.json(); } catch { throw new PluggyError("UNEXPECTED_RESPONSE", response.status); }
    }
    if ((response.status === 401 || response.status === 403) && auth && !refreshed) { key = null; return send(path, init, auth, attempt, true); }
    if (response.status === 401 || response.status === 403) throw new PluggyError(auth ? "UNAUTHORIZED" : "INVALID_CREDENTIALS", response.status);
    if (response.status === 404) throw new PluggyError("NOT_FOUND", 404);
    if (response.status === 429) {
      const wait = Number(response.headers.get("Retry-After")) * 1000 || 60_000;
      // A person waiting on a button should not wait a minute: fail fast and say why. A scheduled run can wait.
      if (attempt >= maxRetries || wait > maxRateLimitWaitMs) throw new PluggyError("RATE_LIMITED", 429);
      await sleep(wait); return send(path, init, auth, attempt + 1, refreshed);
    }
    if (response.status >= 500) return retry(path, init, auth, attempt, refreshed, "PROVIDER_UNAVAILABLE", response.status);
    throw new PluggyError(`HTTP_${response.status}`, response.status);
  }
  async function retry(path: string, init: RequestInit, auth: boolean, attempt: number, refreshed: boolean, code: string, status?: number): Promise<unknown> {
    if (attempt >= maxRetries) throw new PluggyError(code, status);
    // Exponential backoff with jitter, so a provider outage is not hammered.
    await sleep(500 * 2 ** attempt + Math.floor(Math.random() * 250));
    return send(path, init, auth, attempt + 1, refreshed);
  }
  async function apiKey() {
    if (key && key.expiresAt > now()) return key.value;
    const body = await send("/auth", { method: "POST", body: JSON.stringify({ clientId: options.clientId, clientSecret: options.clientSecret }) }, false);
    const parsed = authSchema.safeParse(body);
    if (!parsed.success) throw new PluggyError("UNEXPECTED_RESPONSE");
    key = { value: parsed.data.apiKey, expiresAt: now() + API_KEY_TTL_MS };
    return key.value;
  }
  async function one<T extends z.ZodTypeAny>(path: string, schema: T): Promise<z.infer<T>> {
    const parsed = schema.safeParse(await send(path, { method: "GET" }, true));
    if (!parsed.success) throw new PluggyError("UNEXPECTED_RESPONSE");
    return parsed.data;
  }
  function validated<T extends z.ZodTypeAny>(results: unknown[], schema: T): Fetched<z.infer<T>> {
    const items: z.infer<T>[] = []; let invalid = 0;
    for (const result of results) { const parsed = schema.safeParse(result); if (parsed.success) items.push(parsed.data); else invalid += 1; }
    return { items, invalid };
  }
  async function list<T extends z.ZodTypeAny>(path: string, schema: T): Promise<Fetched<z.infer<T>>> {
    const page = await one(path, pagedSchema);
    return validated(page.results, schema);
  }

  /** The v2 endpoint pages by cursor. `next` is followed whatever shape it takes (query string, path or full URL), but only on Pluggy's own host. */
  function nextPath(next: string, base: URLSearchParams) {
    const cleaned = next.trim();
    if (/^https?:\/\//i.test(cleaned)) { const url = new URL(cleaned); if (url.origin !== PLUGGY_BASE_URL) throw new PluggyError("UNEXPECTED_RESPONSE"); return `${url.pathname}${url.search}`; }
    if (cleaned.startsWith("/v2/transactions")) return cleaned;
    if (cleaned.startsWith("?")) return `/v2/transactions${cleaned}`;
    if (cleaned.includes("=")) return `/v2/transactions?${cleaned.replace(/^&/, "")}`;
    const params = new URLSearchParams(base); params.set("after", cleaned);
    return `/v2/transactions?${params}`;
  }

  return {
    getItem: (itemId: string): Promise<PluggyItem> => one(`/items/${encodeURIComponent(itemId)}`, pluggyItemSchema),
    listAccounts: async (itemId: string): Promise<Fetched<PluggyAccount>> => list(`/accounts?itemId=${encodeURIComponent(itemId)}`, pluggyAccountSchema),
    async listBills(accountId: string): Promise<Fetched<PluggyBill>> {
      const items: PluggyBill[] = []; let invalid = 0;
      for (let index = 1; index <= MAX_PAGES; index++) {
        const page = await one(`/bills?accountId=${encodeURIComponent(accountId)}&pageSize=500${index > 1 ? `&page=${index}` : ""}`, pagedSchema);
        const checked = validated(page.results, pluggyBillSchema);
        items.push(...checked.items); invalid += checked.invalid;
        if (!page.totalPages || index >= page.totalPages) return { items, invalid };
      }
      throw new PluggyError("TOO_MANY_PAGES");
    },
    async listTransactions(accountId: string, filters: { dateFrom?: string; dateTo?: string } = {}): Promise<Fetched<PluggyTransaction> & { pages: number }> {
      const base = new URLSearchParams({ accountId, ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}), ...(filters.dateTo ? { dateTo: filters.dateTo } : {}) });
      let path = `/v2/transactions?${base}`; const seen = new Set<string>(), items: PluggyTransaction[] = []; let invalid = 0, pages = 0;
      while (pages < MAX_PAGES) {
        if (seen.has(path)) throw new PluggyError("UNEXPECTED_RESPONSE");
        seen.add(path); pages += 1;
        const page = await one(path, pagedSchema), checked = validated(page.results, pluggyTransactionSchema);
        items.push(...checked.items); invalid += checked.invalid;
        if (!page.next) return { items, invalid, pages };
        path = nextPath(page.next, base);
      }
      throw new PluggyError("TOO_MANY_PAGES");
    },
  };
}
export type PluggyClient = ReturnType<typeof createPluggyClient>;

export function pluggyConfigFromEnv() {
  const clientId = process.env.PLUGGY_CLIENT_ID?.trim(), clientSecret = process.env.PLUGGY_CLIENT_SECRET?.trim();
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}
const shared: { scheduled: PluggyClient | null; interactive: PluggyClient | null } = { scheduled: null, interactive: null };
/**
 * One client per process and purpose, so the API key is reused instead of calling /auth for every request. The scheduled
 * client is patient (backoff, honours Retry-After). The interactive one serves a button: short timeouts, one retry.
 */
export function sharedPluggyClient(purpose: "scheduled" | "interactive" = "scheduled"): PluggyClient | null {
  const config = pluggyConfigFromEnv();
  if (!config) return null;
  shared[purpose] ??= createPluggyClient(purpose === "interactive" ? { ...config, maxRetries: 1, timeoutMs: 12_000, maxRateLimitWaitMs: 8_000 } : config);
  return shared[purpose];
}
