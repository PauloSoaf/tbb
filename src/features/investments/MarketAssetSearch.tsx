"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, Search, WifiOff } from "lucide-react";
import { ActionForm } from "@/components/ui/ActionForm";
import { saveInvestmentAsset } from "./actions";
import type { MarketSearchResult } from "./providers";

export function MarketAssetSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MarketSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [resolvedQuery, setResolvedQuery] = useState("");
  useEffect(() => {
    const value = query.trim();
    if (value.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/investments/market/search?q=${encodeURIComponent(value)}`, { signal: controller.signal });
        const payload = await response.json() as { results: MarketSearchResult[]; message?: string };
        setResults(payload.results || []); setMessage(payload.message || ""); setResolvedQuery(value);
      } catch (error) { if ((error as Error).name !== "AbortError") { setMessage("A pesquisa não respondeu. Cadastre o ativo manualmente."); setResolvedQuery(value); } }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 380);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

  const current = query.trim();
  const visibleResults = current.length >= 2 && resolvedQuery === current ? results : [];
  const visibleMessage = current.length >= 2 && resolvedQuery === current ? message : "";

  return <div className="investment-market-search"><label><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Bitcoin, Ethereum ou símbolo…" autoFocus/>{current.length >= 2 && loading && <LoaderCircle className="spin" size={15}/>}</label><small>A busca externa inicial usa CoinGecko. Ativos da bolsa podem ser cadastrados manualmente até um provider autorizado ser configurado.</small>{visibleMessage && <p><WifiOff size={15}/>{visibleMessage}</p>}<div>{visibleResults.map((result) => <article key={`${result.provider}:${result.providerId}`}><span>{result.symbol.slice(0, 2)}</span><div><strong>{result.name}</strong><small>{result.symbol} · {result.provider}</small></div><ActionForm action={saveInvestmentAsset}><input type="hidden" name="name" value={result.name}/><input type="hidden" name="ticker" value={result.symbol}/><input type="hidden" name="type" value={result.assetType}/><input type="hidden" name="provider" value={result.provider}/><input type="hidden" name="providerAssetId" value={result.providerId}/><input type="hidden" name="currency" value="BRL"/><button className="button-secondary" type="submit">Adicionar</button></ActionForm></article>)}</div>{current.length >= 2 && !loading && resolvedQuery === current && !visibleResults.length && !visibleMessage && <p>Nenhum ativo encontrado. Use “+ Ativo” para cadastrar manualmente.</p>}</div>;
}
