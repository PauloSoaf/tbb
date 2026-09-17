import { z } from "zod";
import { withMarketCache } from "./cache";
import type { MarketBenchmarkPoint, MarketMacroProvider, MarketQuote } from "./types";

const itemSchema = z.object({ data: z.string(), valor: z.string() });
const SOURCE_URL = "https://dadosabertos.bcb.gov.br/dataset/432-taxa-de-juros---meta-selic-definida-pelo-copom";
const HISTORY_SOURCE_URL = "https://dadosabertos.bcb.gov.br/dataset/11-taxa-de-juros---selic";

function brDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(date);
}

function parseBcbDate(value: string) {
  const [day, month, year] = value.split(/[\/-]/).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) throw new Error(`Data inválida retornada pelo BCB: ${value}`);
  return date;
}

export class BcbMarketDataProvider implements MarketMacroProvider {
  readonly id = "BCB_SGS";

  async getIndicators(): Promise<MarketQuote[]> {
    const end = new Date();
    const start = new Date(end.getTime() - 45 * 86_400_000);
    const result = await withMarketCache({
      key: "macro:selic-target:432",
      provider: this.id,
      ttlMs: 12 * 60 * 60 * 1000,
      load: async () => {
        const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados?formato=json&dataInicial=${encodeURIComponent(brDate(start))}&dataFinal=${encodeURIComponent(brDate(end))}`;
        const response = await fetch(url, { signal: AbortSignal.timeout(8_000), headers: { accept: "application/json" } });
        if (!response.ok) throw new Error(`BCB respondeu ${response.status}.`);
        const rows = z.array(itemSchema).parse(await response.json());
        const latest = rows.at(-1);
        if (!latest) throw new Error("BCB não retornou a série Selic.");
        const asOf = parseBcbDate(latest.data);
        return { data: { value: Number(latest.valor.replace(",", ".")), referenceDate: asOf.toISOString() }, asOf };
      },
    });
    const delayMinutes = Math.max(0, Math.round((Date.now() - result.asOf.getTime()) / 60_000));
    return [{ code: "SELIC", name: "Meta Selic", value: result.data.value, unit: "% a.a.", source: "Banco Central do Brasil · SGS 432", sourceUrl: SOURCE_URL, asOf: result.asOf.toISOString(), retrievedAt: result.retrievedAt.toISOString(), freshness: result.stale ? "STALE" : "CLOSE", delayMinutes }];
  }

  async getHistory(code: string, start: Date, end: Date): Promise<MarketBenchmarkPoint[]> {
    if (code !== "SELIC") throw new Error(`Benchmark BCB ainda não configurado: ${code}`);
    const result = await withMarketCache({
      key: `macro:selic-daily:11:${start.toISOString().slice(0, 10)}:${end.toISOString().slice(0, 10)}`,
      provider: this.id,
      ttlMs: 12 * 60 * 60 * 1000,
      load: async () => {
        const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados?formato=json&dataInicial=${encodeURIComponent(brDate(start))}&dataFinal=${encodeURIComponent(brDate(end))}`;
        const response = await fetch(url, { signal: AbortSignal.timeout(8_000), headers: { accept: "application/json" } });
        if (!response.ok) throw new Error(`BCB respondeu ${response.status}.`);
        const rows = z.array(itemSchema).parse(await response.json());
        const latest = rows.at(-1);
        if (!latest) throw new Error("BCB não retornou o histórico da Selic.");
        return { data: rows, asOf: parseBcbDate(latest.data) };
      },
    });
    let normalized = 100;
    return result.data.map((row, index) => {
      const value = Number(row.valor.replace(",", "."));
      if (index > 0) normalized *= 1 + value / 100;
      return { date: parseBcbDate(row.data).toISOString().slice(0, 10), value, normalized: Math.round(normalized * 10_000) / 10_000, source: HISTORY_SOURCE_URL };
    });
  }
}
