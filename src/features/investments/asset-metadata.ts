import type { InvestmentAssetType } from "@prisma/client";

export type InvestmentAssetGroup = "FIXED_INCOME" | "EQUITIES" | "FUNDS" | "CRYPTO" | "REAL_ESTATE" | "ALTERNATIVES";

type AssetMetadata = {
  group: InvestmentAssetGroup;
  label: { pt: string; en: string; es: string };
  tickerUseful: boolean;
  supportsMarketPrice: boolean;
  defaultLiquidity: "LIQUID" | "TERM" | "ILLIQUID";
};

export const INVESTMENT_ASSET_METADATA: Record<InvestmentAssetType, AssetMetadata> = {
  CASH_EQUIVALENT: { group: "FIXED_INCOME", label: { pt: "Caixa e equivalentes", en: "Cash equivalents", es: "Caja y equivalentes" }, tickerUseful: false, supportsMarketPrice: false, defaultLiquidity: "LIQUID" },
  SAVINGS: { group: "FIXED_INCOME", label: { pt: "Poupança", en: "Savings", es: "Ahorros" }, tickerUseful: false, supportsMarketPrice: false, defaultLiquidity: "LIQUID" },
  CDB: { group: "FIXED_INCOME", label: { pt: "CDB", en: "CDB", es: "CDB" }, tickerUseful: false, supportsMarketPrice: false, defaultLiquidity: "TERM" },
  LCI: { group: "FIXED_INCOME", label: { pt: "LCI", en: "LCI", es: "LCI" }, tickerUseful: false, supportsMarketPrice: false, defaultLiquidity: "TERM" },
  LCA: { group: "FIXED_INCOME", label: { pt: "LCA", en: "LCA", es: "LCA" }, tickerUseful: false, supportsMarketPrice: false, defaultLiquidity: "TERM" },
  TREASURY: { group: "FIXED_INCOME", label: { pt: "Tesouro Direto", en: "Brazilian Treasury", es: "Tesoro brasileño" }, tickerUseful: true, supportsMarketPrice: true, defaultLiquidity: "TERM" },
  DEBENTURE: { group: "FIXED_INCOME", label: { pt: "Debênture", en: "Debenture", es: "Debenture" }, tickerUseful: true, supportsMarketPrice: true, defaultLiquidity: "TERM" },
  FIXED_INCOME_OTHER: { group: "FIXED_INCOME", label: { pt: "Outra renda fixa", en: "Other fixed income", es: "Otra renta fija" }, tickerUseful: false, supportsMarketPrice: false, defaultLiquidity: "TERM" },
  STOCK: { group: "EQUITIES", label: { pt: "Ação", en: "Stock", es: "Acción" }, tickerUseful: true, supportsMarketPrice: true, defaultLiquidity: "LIQUID" },
  ETF: { group: "EQUITIES", label: { pt: "ETF", en: "ETF", es: "ETF" }, tickerUseful: true, supportsMarketPrice: true, defaultLiquidity: "LIQUID" },
  BDR: { group: "EQUITIES", label: { pt: "BDR", en: "BDR", es: "BDR" }, tickerUseful: true, supportsMarketPrice: true, defaultLiquidity: "LIQUID" },
  FII: { group: "FUNDS", label: { pt: "FII", en: "REIT fund", es: "FII" }, tickerUseful: true, supportsMarketPrice: true, defaultLiquidity: "LIQUID" },
  FIAGRO: { group: "FUNDS", label: { pt: "Fiagro", en: "Fiagro", es: "Fiagro" }, tickerUseful: true, supportsMarketPrice: true, defaultLiquidity: "LIQUID" },
  FUND: { group: "FUNDS", label: { pt: "Fundo", en: "Fund", es: "Fondo" }, tickerUseful: true, supportsMarketPrice: true, defaultLiquidity: "TERM" },
  CRYPTO: { group: "CRYPTO", label: { pt: "Cripto", en: "Crypto", es: "Cripto" }, tickerUseful: true, supportsMarketPrice: true, defaultLiquidity: "LIQUID" },
  REAL_ESTATE: { group: "REAL_ESTATE", label: { pt: "Imóvel", en: "Real estate", es: "Inmueble" }, tickerUseful: false, supportsMarketPrice: false, defaultLiquidity: "ILLIQUID" },
  COMMODITY: { group: "ALTERNATIVES", label: { pt: "Commodity", en: "Commodity", es: "Commodity" }, tickerUseful: true, supportsMarketPrice: true, defaultLiquidity: "LIQUID" },
  FOREIGN_ASSET: { group: "ALTERNATIVES", label: { pt: "Ativo internacional", en: "Foreign asset", es: "Activo internacional" }, tickerUseful: true, supportsMarketPrice: true, defaultLiquidity: "LIQUID" },
  OTHER: { group: "ALTERNATIVES", label: { pt: "Outro", en: "Other", es: "Otro" }, tickerUseful: false, supportsMarketPrice: false, defaultLiquidity: "TERM" },
};

export const INVESTMENT_ASSET_TYPES = Object.keys(INVESTMENT_ASSET_METADATA) as InvestmentAssetType[];

export function assetGroup(type: InvestmentAssetType) {
  return INVESTMENT_ASSET_METADATA[type].group;
}

export const INVESTMENT_GROUP_LABELS: Record<InvestmentAssetGroup, { pt: string; en: string; es: string }> = {
  FIXED_INCOME: { pt: "Renda fixa", en: "Fixed income", es: "Renta fija" },
  EQUITIES: { pt: "Bolsa", en: "Equities", es: "Bolsa" },
  FUNDS: { pt: "Fundos e FIIs", en: "Funds and REITs", es: "Fondos y FIIs" },
  CRYPTO: { pt: "Cripto", en: "Crypto", es: "Cripto" },
  REAL_ESTATE: { pt: "Imóveis", en: "Real estate", es: "Inmuebles" },
  ALTERNATIVES: { pt: "Alternativos", en: "Alternatives", es: "Alternativos" },
};
