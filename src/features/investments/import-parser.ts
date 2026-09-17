import { Prisma, type InvestmentTransactionType } from "@prisma/client";
import { CsvFinanceImportParser, normalizeText } from "@/features/finance/import-engine";
import { normalizeDate, parseMoney } from "@/features/finance/money";
import { marketValueCents, parseQuantity } from "./calculations";

const aliases = {
  date: ["data", "date", "data do negocio", "data da movimentacao", "data do movimento"],
  type: ["tipo", "type", "operacao", "movimentacao", "tipo de movimentacao"],
  ticker: ["ticker", "ativo", "codigo de negociacao", "codigo", "symbol"],
  name: ["nome", "descricao", "produto", "asset"],
  quantity: ["quantidade", "qtd", "quantity"],
  price: ["preco", "preco unitario", "valor unitario", "price"],
  amount: ["valor", "valor da operacao", "total", "amount"],
  fees: ["taxas", "taxa", "corretagem", "fees"],
  taxes: ["impostos", "irrf", "taxes"],
  institution: ["conta", "instituicao", "corretora", "account"],
  externalId: ["id", "id externo", "numero da nota", "nota"],
} as const;

function column(headers: string[], names: readonly string[]) {
  const normalized = headers.map((header) => normalizeText(header).normalize("NFD").replace(/\p{M}/gu, ""));
  return normalized.findIndex((header) => names.includes(header as never));
}

function operation(value: string): InvestmentTransactionType {
  const normalized = normalizeText(value);
  if (["compra", "buy", "aplicacao", "aplicação", "credito em ativos"].includes(normalized)) return "BUY";
  if (["venda", "sell", "resgate", "debito de ativos", "débito de ativos"].includes(normalized)) return "SELL";
  if (["deposito", "depósito", "deposit"].includes(normalized)) return "DEPOSIT";
  if (["retirada", "saque", "withdrawal"].includes(normalized)) return "WITHDRAWAL";
  if (["desdobramento", "split"].includes(normalized)) return "SPLIT";
  throw new Error(`Operação não reconhecida: ${value || "vazia"}.`);
}

function majorToCents(value: string) {
  const raw = value.trim().replace(/^R\$\s*/, "").replace(/\s/g, "");
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  if (!/^\d+(?:\.\d{1,10})?$/.test(normalized)) throw new Error("Preço inválido. Use até 10 casas decimais.");
  return new Prisma.Decimal(normalized).mul(100);
}

export type InvestmentImportRow = {
  row: number; date: string; type: InvestmentTransactionType; ticker: string; name: string; quantity: string;
  unitPriceCents: Prisma.Decimal | null; grossAmountCents: number; feesCents: number; taxesCents: number; institution: string; externalId: string;
};

export function parseInvestmentCsv(content: string): InvestmentImportRow[] {
  const parsed = CsvFinanceImportParser.parse(content);
  const indices = Object.fromEntries(Object.entries(aliases).map(([key, names]) => [key, column(parsed.headers, names)])) as Record<keyof typeof aliases, number>;
  for (const required of ["date", "type", "ticker", "quantity"] as const) if (indices[required] < 0) throw new Error(`Coluna obrigatória não encontrada: ${required}. Confira o modelo exibido na tela.`);
  if (indices.price < 0 && indices.amount < 0) throw new Error("O CSV precisa ter Preço ou Valor da operação.");
  return parsed.rows.map((values, rowIndex) => {
    if (values.length !== parsed.headers.length) throw new Error(`Linha ${rowIndex + 2}: quantidade de colunas diferente do cabeçalho.`);
    const get = (key: keyof typeof aliases) => indices[key] >= 0 ? values[indices[key]]?.trim() || "" : "";
    const quantity = get("quantity").replace(",", ".");
    parseQuantity(quantity);
    const type = operation(get("type"));
    const date = normalizeDate(get("date"));
    const unitPriceCents = get("price") ? majorToCents(get("price")) : null;
    const grossAmountCents = get("amount") ? Math.abs(parseMoney(get("amount"), true)) : unitPriceCents ? marketValueCents(quantity, unitPriceCents.toString()) : 0;
    if (!grossAmountCents && type !== "SPLIT") throw new Error(`Linha ${rowIndex + 2}: valor zerado.`);
    const ticker = get("ticker").toUpperCase().slice(0, 30);
    if (!ticker) throw new Error(`Linha ${rowIndex + 2}: ativo vazio.`);
    return { row: rowIndex + 2, date, type, ticker, name: get("name") || ticker, quantity, unitPriceCents, grossAmountCents, feesCents: get("fees") ? Math.abs(parseMoney(get("fees"), true)) : 0, taxesCents: get("taxes") ? Math.abs(parseMoney(get("taxes"), true)) : 0, institution: get("institution"), externalId: get("externalId") };
  });
}
