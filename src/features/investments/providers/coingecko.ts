import { z } from "zod";
import { withMarketCache } from "./cache";
import type { MarketDataProvider, MarketQuote, MarketSearchResult } from "./types";

const SOURCE_URL = "https://docs.coingecko.com/reference/simple-price";
const quoteSchema = z.record(z.string(), z.object({
  brl: z.number(),
  brl_24h_change: z.number().nullable().optional(),
  brl_market_cap: z.number().nullable().optional(),
  brl_24h_vol: z.number().nullable().optional(),
  last_updated_at: z.number(),
}));
const searchSchema = z.object({ coins: z.array(z.object({ id: z.string(), name: z.string(), symbol: z.string(), thumb: z.string().nullable().optional(), market_cap_rank: z.number().nullable().optional() })) });

function headers(): Record<string, string> {
  const key = process.env.COINGECKO_API_KEY;
  return key ? { accept: "application/json", "x-cg-demo-api-key": key } : { accept: "application/json" };
}

export class CoinGeckoMarketDataProvider implements MarketDataProvider {
  readonly id = "COINGECKO";

  async getQuotes(ids: string[], currency = "brl"): Promise<MarketQuote[]> {
    if (!ids.length) return [];
    if (currency.toLowerCase() !== "brl") throw new Error("A integração inicial da CoinGecko suporta BRL.");
    const sorted = [...new Set(ids)].sort();
    const result = await withMarketCache({
      key: `crypto:simple:${sorted.join(",")}:brl`,
      provider: this.id,
      ttlMs: 2 * 60 * 1000,
      load: async () => {
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(sorted.join(","))}&vs_currencies=brl&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true&include_last_updated_at=true&precision=full`;
        const response = await fetch(url, { signal: AbortSignal.timeout(8_000), headers: headers() });
        if (!response.ok) throw new Error(`CoinGecko respondeu ${response.status}.`);
        const data = quoteSchema.parse(await response.json());
        const newest = Math.max(...Object.values(data).map((item) => item.last_updated_at));
        return { data, asOf: new Date(newest * 1000) };
      },
    });
    return sorted.flatMap((id) => {
      const item = result.data[id];
      if (!item) return [];
      const asOf = new Date(item.last_updated_at * 1000);
      const delayMinutes = Math.max(0, Math.round((Date.now() - asOf.getTime()) / 60_000));
      return [{ code: id, name: id, value: item.brl, currency: "BRL", unit: "BRL", variation24h: item.brl_24h_change, marketCap: item.brl_market_cap, volume24h: item.brl_24h_vol, source: "CoinGecko", sourceUrl: SOURCE_URL, asOf: asOf.toISOString(), retrievedAt: result.retrievedAt.toISOString(), freshness: result.stale ? "STALE" as const : delayMinutes <= 3 ? "LIVE" as const : "DELAYED" as const, delayMinutes }];
    });
  }

  async search(query: string): Promise<MarketSearchResult[]> {
    const normalized = query.trim().slice(0, 80);
    if (normalized.length < 2) return [];
    const result = await withMarketCache({
      key: `crypto:search:${normalized.toLowerCase()}`,
      provider: this.id,
      ttlMs: 24 * 60 * 60 * 1000,
      load: async () => {
        const response = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(normalized)}`, { signal: AbortSignal.timeout(8_000), headers: headers() });
        if (!response.ok) throw new Error(`CoinGecko respondeu ${response.status}.`);
        return { data: searchSchema.parse(await response.json()).coins.slice(0, 12), asOf: new Date() };
      },
    });
    return result.data.map((item) => ({ providerId: item.id, symbol: item.symbol.toUpperCase(), name: item.name, assetType: "CRYPTO", provider: this.id, imageUrl: item.thumb || null }));
  }
}
