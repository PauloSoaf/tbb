// Read-only probe of a Meu Pluggy connection. It prints the SHAPE of what the provider returns (field names, enums, counts,
// sign conventions) and never a description, amount, name, document number or id, so the report is safe to share.
//
//   PLUGGY_ITEM_ID=<item id> node scripts/open-finance-probe.mjs
//
// Credentials come from PLUGGY_CLIENT_ID and PLUGGY_CLIENT_SECRET (read from .env by Next's loader). Nothing is written.
import env from "@next/env";
env.loadEnvConfig(process.cwd());

const BASE = "https://api.pluggy.ai";
const clientId = process.env.PLUGGY_CLIENT_ID?.trim(), clientSecret = process.env.PLUGGY_CLIENT_SECRET?.trim();
const itemId = (process.argv[2] || process.env.PLUGGY_ITEM_ID || "").trim();
if (!clientId || !clientSecret) { console.error("Configure PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET no .env."); process.exit(2); }
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(itemId)) { console.error("Informe o Item ID: PLUGGY_ITEM_ID=<id> node scripts/open-finance-probe.mjs"); process.exit(2); }

const report = { generatedAt: new Date().toISOString(), notes: [] };
async function call(path, init = {}) {
  const response = await fetch(`${BASE}${path}`, { ...init, signal: AbortSignal.timeout(30000), redirect: "error" });
  const body = await response.json().catch(() => null);
  return { status: response.status, body };
}
const keys = (value) => value && typeof value === "object" ? Object.keys(value).sort() : [];
const tally = (values) => values.reduce((out, value) => { const key = value ?? "(ausente)"; out[key] = (out[key] ?? 0) + 1; return out; }, {});
const signOf = (n) => n > 0 ? "positivo" : n < 0 ? "negativo" : "zero";
const shapeOfNext = (next) => !next ? "ausente" : /^https?:\/\//i.test(next) ? "URL completa" : next.startsWith("/") ? "caminho" : next.startsWith("?") ? "query string iniciada por ?" : next.includes("=") ? "query string sem ?" : "cursor simples";

const auth = await call("/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId, clientSecret }) });
report.auth = { httpStatus: auth.status };
if (auth.status !== 200 || !auth.body?.apiKey) { console.log(JSON.stringify(report, null, 2)); console.error("Autenticação falhou: confira o Client ID e o Client Secret."); process.exit(1); }
const headers = { "X-API-KEY": auth.body.apiKey, Accept: "application/json" };
const get = (path) => call(path, { headers });

const item = await get(`/items/${itemId}`);
report.item = { httpStatus: item.status, fields: keys(item.body), status: item.body?.status, executionStatus: item.body?.executionStatus, hasLastUpdatedAt: Boolean(item.body?.lastUpdatedAt), hasNextAutoSyncAt: item.body?.nextAutoSyncAt !== undefined, nextAutoSyncAtIsNull: item.body?.nextAutoSyncAt === null, hasConsentExpiresAt: Boolean(item.body?.consentExpiresAt), connector: item.body?.connector?.name, statusDetailFields: keys(item.body?.statusDetail) };

const accounts = await get(`/accounts?itemId=${itemId}`);
report.accounts = { httpStatus: accounts.status, paginationFields: keys(accounts.body).filter((key) => key !== "results"), count: accounts.body?.results?.length ?? 0, list: [] };
for (const account of accounts.body?.results ?? []) {
  const entry = { type: account.type, subtype: account.subtype, currency: account.currencyCode, fields: keys(account), balanceSign: typeof account.balance === "number" ? signOf(account.balance) : "ausente", hasTaxNumber: Boolean(account.taxNumber), hasNumber: Boolean(account.number), bankDataFields: keys(account.bankData), creditDataFields: keys(account.creditData), transactions: null, bills: null };
  const since = new Date(Date.now() - 45 * 86400000).toISOString().slice(0, 10);
  const page = await get(`/v2/transactions?accountId=${account.id}&dateFrom=${since}`);
  const rows = Array.isArray(page.body?.results) ? page.body.results : [];
  entry.transactions = {
    httpStatus: page.status, responseFields: keys(page.body), nextShape: shapeOfNext(page.body?.next), rowsInFirstPage: rows.length,
    fieldsSeen: [...new Set(rows.flatMap(keys))].sort(),
    byStatus: tally(rows.map((row) => row.status)), byType: tally(rows.map((row) => row.type)), byOperationType: tally(rows.map((row) => row.operationType)),
    amountSignByType: Object.fromEntries(Object.keys(tally(rows.map((row) => row.type))).map((type) => [type, tally(rows.filter((row) => (row.type ?? "(ausente)") === type).map((row) => signOf(row.amount)))])),
    providerIdPresent: rows.filter((row) => row.providerId).length, providerCodePresent: rows.filter((row) => row.providerCode).length,
    dateFormat: tally(rows.map((row) => typeof row.date !== "string" ? "ausente" : /^\d{4}-\d{2}-\d{2}$/.test(row.date) ? "AAAA-MM-DD" : /T00:00:00(\.0+)?Z$/.test(row.date) ? "meia-noite UTC" : "com horário")),
    currencies: tally(rows.map((row) => row.currencyCode)), hasBalanceAfter: rows.filter((row) => typeof row.balance === "number").length,
    paymentData: { rows: rows.filter((row) => row.paymentData).length, partyFields: [...new Set(rows.flatMap((row) => [...keys(row.paymentData?.payer), ...keys(row.paymentData?.receiver)]))].sort(), documentNumberPresent: rows.filter((row) => row.paymentData?.payer?.documentNumber || row.paymentData?.receiver?.documentNumber).length },
    creditCardMetadata: { rows: rows.filter((row) => row.creditCardMetadata).length, fields: [...new Set(rows.flatMap((row) => keys(row.creditCardMetadata)))].sort(), withInstallments: rows.filter((row) => row.creditCardMetadata?.totalInstallments > 1).length, withBillId: rows.filter((row) => row.creditCardMetadata?.billId).length },
  };
  if (account.type === "CREDIT") {
    const bills = await get(`/bills?accountId=${account.id}&pageSize=5`);
    entry.bills = { httpStatus: bills.status, count: bills.body?.results?.length ?? 0, fields: [...new Set((bills.body?.results ?? []).flatMap(keys))].sort(), hasDueDate: (bills.body?.results ?? []).filter((bill) => bill.dueDate).length, hasClosingDate: (bills.body?.results ?? []).filter((bill) => bill.billClosingDate).length };
  }
  report.accounts.list.push(entry);
}
report.notes.push("Nenhum valor, descrição, nome, documento ou id é impresso. Compartilhe este relatório para validar o sentido dos valores, a presença de providerId, o formato do cursor e a disponibilidade de faturas.");
console.log(JSON.stringify(report, null, 2));
