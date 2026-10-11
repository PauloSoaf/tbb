import { institutionBrand } from "./institution-brand";
import { issuerKey, type StatementRow } from "./card-statements";
import { isUnassignedAccount } from "./unassigned-account";

export type BankAccount = { id: string; name: string; institution: string | null; type: string; balanceCents: number };
export const isSpendableAccount = (account: BankAccount) => ["CHECKING", "CASH", "DIGITAL_WALLET"].includes(account.type);

/** Presentation grouping only: each product retains its own ledger and identity. */
export function groupBankAccounts<T extends BankAccount>(accounts: T[]) {
  const groups = new Map<string, { id: string; name: string; institution: string | null; accounts: T[]; cashCents: number; reserveCents: number; hasCash: boolean }>();
  for (const account of accounts) {
    if (isUnassignedAccount(account)) continue;
    const brand = institutionBrand(account.institution, account.institution?.trim() || account.name);
    // Recognised names without an institution can join their bank. Unknown, unnamed banks stay separate.
    const known = !brand.background.startsWith("hsl(");
    const key = (account.institution?.trim() || known) ? issuerKey(brand.label) : `account-${account.id}`;
    const group = groups.get(key) ?? { id: account.id, name: brand.label, institution: account.institution || (known ? brand.label : null), accounts: [], cashCents: 0, reserveCents: 0, hasCash: false };
    group.accounts.push(account);
    if (isSpendableAccount(account)) { group.cashCents += account.balanceCents; group.hasCash = true; }
    if (account.type === "SAVINGS") group.reserveCents += account.balanceCents;
    groups.set(key, group);
  }
  return [...groups.values()];
}

/** Derived risk, never a persisted Debt. Goals, limits and future income aren't available cash. */
export function invoiceFunding(accounts: BankAccount[], statements: StatementRow[], today: string) {
  const actual = accounts.filter((account) => !isUnassignedAccount(account));
  const cashAccounts = actual.filter(isSpendableAccount);
  const cashCents = cashAccounts.reduce((sum, account) => sum + account.balanceCents, 0);
  const reserveCents = actual.filter((account) => account.type === "SAVINGS").reduce((sum, account) => sum + account.balanceCents, 0);
  const cardIds = new Set(actual.filter((account) => account.type === "CREDIT_CARD").map((account) => account.id));
  const registered = new Set(statements.filter((row) => row.kind === "STATEMENT").map((row) => row.accountId));
  const missingStatementCount = [...cardIds].filter((id) => !registered.has(id)).length;
  const known = statements.filter((row) => cardIds.has(row.accountId) && row.kind === "STATEMENT" && (row.status === "OPEN" || row.status === "FUTURE_KNOWN"));
  const open = known.filter((row) => row.status === "OPEN");
  const openCents = open.reduce((sum, row) => sum + row.amountCents, 0);
  const availableCents = Math.max(0, cashCents);
  const shortfallCents = Math.max(0, openCents - availableCents);
  const months = new Map<string, number>();
  for (const row of known) {
    const month = (row.dueDate || row.referenceMonth)?.slice(0, 7);
    if (month) months.set(month < today.slice(0, 7) ? today.slice(0, 7) : month, (months.get(month < today.slice(0, 7) ? today.slice(0, 7) : month) || 0) + row.amountCents);
  }
  let cumulativeCents = 0;
  const timeline = [...months].sort(([a], [b]) => a.localeCompare(b)).map(([month, amountCents]) => {
    cumulativeCents += amountCents;
    return { month, amountCents, cumulativeCents, shortfallCents: Math.max(0, cumulativeCents - availableCents) };
  });
  return { hasCash: cashAccounts.length > 0, missingStatementCount, cashCents, availableCents, reserveCents, openCents, shortfallCents, coveredCents: Math.min(availableCents, openCents), afterInvoicesCents: cashCents - openCents, overdueCount: open.filter((row) => row.dueDate && row.dueDate < today).length, timeline };
}
export type InvoiceFunding = ReturnType<typeof invoiceFunding>;
