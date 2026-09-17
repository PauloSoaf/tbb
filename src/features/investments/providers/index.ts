import type { MarketDataProvider, MarketMacroProvider } from "./types";
import { BcbMarketDataProvider } from "./bcb";
import { CoinGeckoMarketDataProvider } from "./coingecko";

export function getMacroProvider(): MarketMacroProvider {
  return new BcbMarketDataProvider();
}

export function getCryptoProvider(): MarketDataProvider {
  return new CoinGeckoMarketDataProvider();
}

export type { MarketBenchmarkPoint, MarketDataProvider, MarketMacroProvider, MarketQuote, MarketSearchResult } from "./types";
