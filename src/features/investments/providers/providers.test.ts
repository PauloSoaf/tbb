import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./cache", () => ({ withMarketCache: async ({ load }: { load: () => Promise<{ data: unknown; asOf: Date }> }) => ({ ...(await load()), retrievedAt: new Date("2026-09-15T12:00:00.000Z"), stale: false }) }));

import { BcbMarketDataProvider } from "./bcb";
import { CoinGeckoMarketDataProvider } from "./coingecko";

afterEach(() => vi.unstubAllGlobals());

describe("official market providers", () => {
  it("reads Selic target from BCB SGS 432 and exposes source timestamps", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([{ data: "15/09/2026", valor: "12,25" }]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const [quote] = await new BcbMarketDataProvider().getIndicators();
    expect(String(fetchMock.mock.calls[0][0])).toContain("bcdata.sgs.432");
    expect(quote).toMatchObject({ code: "SELIC", value: 12.25, source: "Banco Central do Brasil · SGS 432", freshness: "CLOSE" });
    expect(quote.sourceUrl).toContain("dadosabertos.bcb.gov.br");
    expect(quote.asOf).toContain("2026-09-15");
    expect(quote.retrievedAt).toBe("2026-09-15T12:00:00.000Z");
  });

  it("normalizes the official daily Selic series at base 100", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([
      { data: "12/09/2026", valor: "0,05" },
      { data: "13/09/2026", valor: "0,10" },
      { data: "14/09/2026", valor: "0,20" },
    ]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const points = await new BcbMarketDataProvider().getHistory("SELIC", new Date("2026-09-12T00:00:00.000Z"), new Date("2026-09-14T00:00:00.000Z"));
    expect(String(fetchMock.mock.calls[0][0])).toContain("bcdata.sgs.11");
    expect(points.map((point) => point.date)).toEqual(["2026-09-12", "2026-09-13", "2026-09-14"]);
    expect(points[0].normalized).toBe(100);
    expect(points[2].normalized).toBeCloseTo(100.3002, 4);
  });

  it("keeps CoinGecko precision and provider metadata", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ bitcoin: { brl: 345678.12345678, brl_24h_change: 2.5, brl_market_cap: 1_000_000, brl_24h_vol: 50_000, last_updated_at: 1789473600 } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const [quote] = await new CoinGeckoMarketDataProvider().getQuotes(["bitcoin"]);
    expect(String(fetchMock.mock.calls[0][0])).toContain("include_last_updated_at=true");
    expect(quote).toMatchObject({ code: "bitcoin", value: 345678.12345678, variation24h: 2.5, source: "CoinGecko", currency: "BRL" });
    expect(quote.sourceUrl).toContain("docs.coingecko.com");
    expect(quote.retrievedAt).toBe("2026-09-15T12:00:00.000Z");
  });
});
