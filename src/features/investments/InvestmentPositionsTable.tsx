"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Search, SlidersHorizontal } from "lucide-react";
import { createColumnHelper, createSortedRowModel, rowSortingFeature, sortFn_alphanumeric, tableFeatures, useTable } from "@tanstack/react-table";
import type { InvestmentOverviewData } from "./queries";

type Position = InvestmentOverviewData["positions"][number];
const features = tableFeatures({ rowSortingFeature, sortedRowModel: createSortedRowModel(), sortFns: { alphanumeric: sortFn_alphanumeric } });
const helper = createColumnHelper<typeof features, Position>();
const columns = helper.columns([
  helper.accessor("name", { id: "asset", header: "Ativo", sortFn: "alphanumeric" }),
  helper.accessor("type", { header: "Classe", sortFn: "alphanumeric" }),
  helper.accessor("account", { header: "Conta", sortFn: "alphanumeric" }),
  helper.accessor("quantity", { header: "Quantidade", sortFn: "alphanumeric" }),
  helper.accessor("averagePriceCents", { header: "Preço médio", sortFn: "alphanumeric" }),
  helper.accessor("currentPriceCents", { header: "Preço atual", sortFn: "alphanumeric" }),
  helper.accessor("bookCostCents", { header: "Aplicado", sortFn: "alphanumeric" }),
  helper.accessor("currentValueCents", { header: "Valor atual", sortFn: "alphanumeric" }),
  helper.accessor("unrealizedPnlCents", { header: "Resultado", sortFn: "alphanumeric" }),
]);

export function InvestmentPositionsTable({ positions, types }: { positions: Position[]; types?: string[] }) {
  const [query, setQuery] = useState("");
  const [account, setAccount] = useState("");
  const [type, setType] = useState("");
  const accounts = useMemo(() => [...new Set(positions.map((item) => item.account))].sort(), [positions]);
  const availableTypes = useMemo(() => [...new Set(positions.map((item) => item.type))].sort(), [positions]);
  const data = useMemo(() => positions.filter((item) => (!types?.length || types.includes(item.type)) && (!query || `${item.ticker || ""} ${item.name} ${item.account} ${item.institution || ""}`.toLowerCase().includes(query.toLowerCase())) && (!account || item.account === account) && (!type || item.type === type)), [positions, query, account, type, types]);
  const table = useTable({ features, columns, data, getRowId: (row) => row.id });
  const currency = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: Math.abs(cents) < 10_000 ? 2 : 0 }).format(cents / 100);
  const decimalCurrency = (value: string) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 8 }).format(Number(value) / 100);
  return <div className="investment-table-shell">
    <div className="investment-table-filters"><label><Search size={14}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar ativo, ticker, conta ou instituição"/></label><label><SlidersHorizontal size={14}/><select value={account} onChange={(event) => setAccount(event.target.value)}><option value="">Todas as contas</option>{accounts.map((item) => <option key={item}>{item}</option>)}</select></label><select value={type} onChange={(event) => setType(event.target.value)}><option value="">Todas as classes</option>{availableTypes.map((item) => <option key={item}>{item.replaceAll("_", " ")}</option>)}</select></div>
    <div className="investment-table-scroll"><table><thead>{table.getHeaderGroups().map((group) => <tr key={group.id}>{group.headers.map((header) => <th key={header.id}><button type="button" onClick={header.column.getToggleSortingHandler()}>{String(header.column.columnDef.header)}{header.column.getIsSorted() === "asc" ? <ArrowUp size={12}/> : header.column.getIsSorted() === "desc" ? <ArrowDown size={12}/> : null}</button></th>)}</tr>)}</thead><tbody>{table.getRowModel().rows.map((row) => { const item = row.original; const pnlBasisPoints = item.bookCostCents ? Math.round(item.unrealizedPnlCents / item.bookCostCents * 10_000) : 0; return <tr key={row.id}><td><span className="investment-table-asset"><i>{(item.ticker || item.name).slice(0, 2).toUpperCase()}</i><span><strong>{item.ticker || item.name}</strong><small>{item.ticker ? item.name : item.sector || item.group.replaceAll("_", " ")}</small></span></span></td><td><span className="investment-type-pill">{item.type.replaceAll("_", " ")}</span></td><td><strong>{item.account}</strong><small className="investment-table-subline">{item.institution || "—"}</small></td><td>{Number(item.quantity).toLocaleString("pt-BR", { maximumFractionDigits: 8 })}</td><td>{decimalCurrency(item.averagePriceCents)}</td><td>{decimalCurrency(item.currentPriceCents)}<small className="investment-table-subline">{item.source}</small></td><td>{currency(item.bookCostCents)}</td><td><strong>{currency(item.currentValueCents)}</strong></td><td><strong className={item.unrealizedPnlCents >= 0 ? "text-success" : "text-danger"}>{currency(item.unrealizedPnlCents)}</strong><small className={`investment-table-subline ${pnlBasisPoints >= 0 ? "text-success" : "text-danger"}`}>{pnlBasisPoints >= 0 ? "+" : ""}{(pnlBasisPoints / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%</small></td></tr>; })}</tbody></table>{!table.getRowModel().rows.length && <div className="investment-table-empty">Nenhuma posição corresponde aos filtros.</div>}</div>
    <footer><span>{data.length} posições</span><strong>{currency(data.reduce((sum, item) => sum + item.currentValueCents, 0))}</strong></footer>
  </div>;
}
