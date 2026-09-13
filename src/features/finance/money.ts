/** Money is stored as integer cents; parsing never multiplies decimal floats. */
export function parseMoney(value: string, allowNegative = false): number {
  let text = value.trim().replace(/^R\$\s*/, "").replace(/\s/g, "");
  let negative = false;
  if (text.startsWith("-") || /^\(.*\)$/.test(text)) {
    negative = true;
    text = text.replace(/^-/, "").replace(/^\(|\)$/g, "");
  }
  text = text.replace(/^\+/, "");
  if (!/^[\d.,]+$/.test(text)) throw new Error("Valor monetário inválido.");
  const comma = text.lastIndexOf(",");
  const dot = text.lastIndexOf(".");
  let whole: string;
  let fraction: string;
  if (comma >= 0 && dot >= 0) {
    const decimal = comma > dot ? "," : ".";
    const group = decimal === "," ? "." : ",";
    const parts = text.split(decimal);
    if (parts.length !== 2 || !/^\d{1,3}([.,]\d{3})*$/.test(parts[0]) || !/^\d{1,2}$/.test(parts[1])) throw new Error("Separadores monetários inválidos.");
    whole = parts[0].split(group).join(""); fraction = parts[1];
  } else if (comma >= 0 || dot >= 0) {
    const parts = text.split(comma >= 0 ? "," : ".");
    if (parts.length === 2 && /^\d{1,2}$/.test(parts[1])) {
      whole = parts[0]; fraction = parts[1];
    } else if (/^\d{1,3}([.,]\d{3})+$/.test(text)) {
      whole = parts.join(""); fraction = "";
    } else throw new Error("Use no máximo duas casas decimais.");
  } else { whole = text; fraction = ""; }
  if (!/^\d+$/.test(whole)) throw new Error("Valor monetário inválido.");
  const cents = Number(BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0") || "0"));
  if (!Number.isSafeInteger(cents) || cents > 2_147_483_647) throw new Error("Valor excede o limite de R$ 21.474.836,47 por lançamento.");
  if (negative && !allowNegative) throw new Error("Informe um valor positivo.");
  return negative ? -cents : cents;
}

export function money(cents: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(cents / 100);
}

export function moneyInput(cents: number) {
  const sign = cents < 0 ? "-" : "";
  return `${sign}${Math.floor(Math.abs(cents) / 100)},${String(Math.abs(cents) % 100).padStart(2, "0")}`;
}

export function normalizeDate(value: string): string {
  const trimmed = value.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  const br = /^(\d{2})[/.\-](\d{2})[/.\-](\d{2}|\d{4})$/.exec(trimmed);
  if (!iso && !br) throw new Error("Data inválida. Use DD/MM/AAAA ou AAAA-MM-DD.");
  const year=br?.[3].length===2?`20${br[3]}`:br?.[3];const date = iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : `${year}-${br![2]}-${br![1]}`;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== date) throw new Error("Data inexistente.");
  if (date < "1900-01-01" || date > "2200-12-31") throw new Error("Data fora do intervalo permitido.");
  return date;
}

export function dateOnly(value: string) { return new Date(`${normalizeDate(value)}T00:00:00.000Z`); }
export function todayInTimezone(timezone: string) { return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }

export type MoneyTransaction = { amountCents: number; type: string; accountId: string; destinationAccountId?: string | null; currency?: string; date?: Date };
export function accountBalance(account: { id: string; initialBalanceCents: number; currency: string }, transactions: MoneyTransaction[]) {
  return transactions.reduce((balance, tx) => {
    if (tx.currency && tx.currency !== account.currency) return balance;
    if (tx.type === "TRANSFER") return balance + (tx.destinationAccountId === account.id ? tx.amountCents : 0) - (tx.accountId === account.id ? tx.amountCents : 0);
    if (tx.accountId !== account.id) return balance;
    return balance + (tx.type === "EXPENSE" ? -tx.amountCents : tx.amountCents);
  }, account.initialBalanceCents);
}

export function cashFlow(transactions: MoneyTransaction[], currency = "BRL") {
  let income = 0, expenses = 0;
  for (const tx of transactions) {
    if (tx.currency && tx.currency !== currency) continue;
    if (tx.type === "INCOME") income += tx.amountCents;
    if (tx.type === "EXPENSE") expenses += tx.amountCents;
    if (tx.type === "REFUND") expenses -= tx.amountCents;
  }
  return { income, expenses, savings: income - expenses, savingsRate: income ? ((income - expenses) / income) * 100 : 0 };
}

export function subscriptionEquivalent(amount: number, cycle: string, customDays?: number | null) {
  const annual = cycle === "WEEKLY" ? amount * 52 : cycle === "QUARTERLY" ? amount * 4 : cycle === "YEARLY" ? amount : cycle === "CUSTOM" ? Math.round(amount * 365 / Math.max(1, customDays || 30)) : amount * 12;
  return { monthly: Math.round(annual / 12), annual };
}

export type DebtInput = { id: string; remainingBalanceCents: number; minimumPaymentCents: number; interestBasisPoints: number; ratePeriod: string };
export type DebtSimulation = { months: number | null; interestCents: number; totalPaidCents: number; remainingCents: number; schedule: { month: number; balanceCents: number; interestCents: number }[] };
/** Fixed monthly budget with optional extra payment. Interest rounds once per debt/month.
 * Annual rates are nominal annual / 12. No tax, penalties, or lender-specific day counts. */
export function simulateDebts(debts: DebtInput[], strategy: "CURRENT" | "SNOWBALL" | "AVALANCHE" = "CURRENT", extraCents = 0): DebtSimulation {
  if (extraCents < 0 || !Number.isSafeInteger(extraCents)) throw new Error("Pagamento extra inválido.");
  if (debts.some(d => ![d.remainingBalanceCents, d.minimumPaymentCents, d.interestBasisPoints].every(n => Number.isSafeInteger(n) && n >= 0))) throw new Error("Dados da dívida inválidos.");
  const balances = debts.map(d => d.remainingBalanceCents);
  const budget = debts.reduce((sum, d) => sum + d.minimumPaymentCents, 0) + extraCents;
  let interestCents = 0, totalPaidCents = 0;
  const schedule: DebtSimulation["schedule"] = [];
  if (balances.every(b => b === 0)) return { months: 0, interestCents, totalPaidCents, remainingCents: 0, schedule };
  for (let month = 1; month <= 600; month++) {
    let monthlyInterest = 0, available = budget;
    const interestFor = (i: number) => debts[i].interestBasisPoints / (debts[i].ratePeriod === "YEARLY" ? 12 : 1);
    for (let i = 0; i < debts.length; i++) {
      // Exact rational rounding without binary floating-point currency operations.
      const divisor = BigInt(debts[i].ratePeriod === "YEARLY" ? 120000 : 10000);
      const interest = Number((BigInt(balances[i]) * BigInt(debts[i].interestBasisPoints) + divisor / BigInt(2)) / divisor);
      if (!Number.isSafeInteger(interest) || !Number.isSafeInteger(balances[i] + interest)) return { months: null, interestCents, totalPaidCents, remainingCents: balances.reduce((a, b) => a + b, 0), schedule };
      balances[i] += interest; monthlyInterest += interest;
      const payment = Math.min(balances[i], debts[i].minimumPaymentCents);
      balances[i] -= payment; available -= payment; totalPaidCents += payment;
    }
    const order = debts.map((_, i) => i).filter(i => balances[i] > 0).sort((a, b) => strategy === "AVALANCHE" ? interestFor(b) - interestFor(a) || balances[a] - balances[b] : strategy === "SNOWBALL" ? balances[a] - balances[b] || interestFor(b) - interestFor(a) : a - b);
    // CURRENT keeps each original minimum; only explicitly added payment carries to another debt.
    if (strategy === "CURRENT") available = Math.min(available, extraCents);
    for (const i of order) { const payment = Math.min(balances[i], available); balances[i] -= payment; available -= payment; totalPaidCents += payment; }
    interestCents += monthlyInterest;
    const remainingCents = balances.reduce((a, b) => a + b, 0);
    schedule.push({ month, balanceCents: remainingCents, interestCents: monthlyInterest });
    if (remainingCents === 0) return { months: month, interestCents, totalPaidCents, remainingCents, schedule };
    if (remainingCents > 10 ** 14 || (strategy !== "CURRENT" && monthlyInterest >= budget)) break;
  }
  return { months: null, interestCents, totalPaidCents, remainingCents: balances.reduce((a, b) => a + b, 0), schedule };
}

export function budgetMetrics(limitCents: number, spentCents: number, start: Date, end: Date, today: Date) {
  const totalDays = Math.max(1, Math.round((end.valueOf() - start.valueOf()) / 86400000) + 1);
  const elapsedDays = Math.max(0, Math.min(totalDays, Math.floor((today.valueOf() - start.valueOf()) / 86400000) + 1));
  return { remainingCents: limitCents - spentCents, percent: limitCents ? spentCents / limitCents * 100 : 0, daysRemaining: Math.max(0, Math.ceil((end.valueOf() - today.valueOf()) / 86400000)), projectedCents: elapsedDays ? Math.round(spentCents * totalDays / elapsedDays) : 0 };
}
