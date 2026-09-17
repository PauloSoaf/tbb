export type MarketFreshness = "LIVE" | "DELAYED" | "STALE" | "CLOSE";

export type MarketQuote = {
  code: string;
  name: string;
  value: number;
  currency?: string;
  unit: string;
  variation24h?: number | null;
  marketCap?: number | null;
  volume24h?: number | null;
  source: string;
  sourceUrl: string;
  asOf: string;
  retrievedAt: string;
  freshness: MarketFreshness;
  delayMinutes: number;
};

export type MarketSearchResult = {
  providerId: string;
  symbol: string;
  name: string;
  assetType: "CRYPTO" | "STOCK" | "ETF" | "FII" | "FUND" | "OTHER";
  provider: string;
  imageUrl?: string | null;
};

export type MarketBenchmarkPoint = {
  date: string;
  value: number;
  normalized: number;
  source?: string;
};

export interface MarketDataProvider {
  readonly id: string;
  getQuotes(ids: string[], currency?: string): Promise<MarketQuote[]>;
  search?(query: string): Promise<MarketSearchResult[]>;
}

export interface MarketMacroProvider {
  readonly id: string;
  getIndicators(): Promise<MarketQuote[]>;
  getHistory?(code: string, start: Date, end: Date): Promise<MarketBenchmarkPoint[]>;
}
