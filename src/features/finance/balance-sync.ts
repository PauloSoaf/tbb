export type CashAccount = { id: string; name: string; type: string; institution: string | null; balanceCents: number };
export const CASH_TYPES = ["CHECKING", "SAVINGS", "CASH", "DIGITAL_WALLET"];
export const cashTypeLabel: Record<string, string> = { CHECKING: "Conta · débito", SAVINGS: "Cofrinho / poupança", CASH: "Dinheiro", DIGITAL_WALLET: "Carteira digital" };
/** Same-bank products stay together so a bank's account and its piggy bank read as one block. */
export const sortCashAccounts = (accounts: CashAccount[]) => accounts.filter((account) => CASH_TYPES.includes(account.type))
  .sort((left, right) => (left.institution || left.name).localeCompare(right.institution || right.name, "pt-BR") || left.name.localeCompare(right.name, "pt-BR"));
/** Products of one bank share a key: "Itaú · Conta" and "Itaú · Cofrinho" are the same institution even without a saved institution. */
export const bankKey = (account: { id: string; institution: string | null; name: string }) =>
  (account.institution?.trim() || account.name.split("·")[0]).trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "") || account.id;

export type BalanceSyncRow = { accountId: string; currentCents: number; desiredCents: number };
export type BalanceSyncSuggestionRow = BalanceSyncRow & { groupKey: string; reserve: boolean };
export type BalanceSyncTransfer = { fromAccountId: string; toAccountId: string; amountCents: number };
export type BalanceSyncAdjustment = { accountId: string; amountCents: number };
export type BalanceSyncPlan = { transfers: BalanceSyncTransfer[]; adjustments: BalanceSyncAdjustment[] };

const WHOLE_REAL = 100;
const MAX_SUGGESTED_TRANSFERS = 20;
const roundToWholeReal = (cents: number) => Math.round(cents / WHOLE_REAL) * WHOLE_REAL;
const largestFirst = <T extends { id: string; cents: number }>(items: T[]) => [...items].sort((left, right) => Math.abs(right.cents) - Math.abs(left.cents) || left.id.localeCompare(right.id));

/**
 * What is left to explain once the declared transfers are applied: the typed balance minus the current balance minus
 * the net movement of the transfers. Only accounts whose balance was typed get an adjustment; an account that only
 * appears in a transfer simply moves by it. The server and the form preview both call this, so what the person
 * reviews is what is saved, and every typed account ends on exactly the balance that was typed.
 */
export function planBalanceSync(rows: BalanceSyncRow[], transfers: BalanceSyncTransfer[]): BalanceSyncPlan {
  const movement = new Map<string, number>();
  for (const transfer of transfers) {
    movement.set(transfer.fromAccountId, (movement.get(transfer.fromAccountId) ?? 0) - transfer.amountCents);
    movement.set(transfer.toAccountId, (movement.get(transfer.toAccountId) ?? 0) + transfer.amountCents);
  }
  const adjustments = rows.map((row) => ({ accountId: row.accountId, amountCents: row.desiredCents - row.currentCents - (movement.get(row.accountId) ?? 0) })).filter((row) => row.amountCents !== 0);
  return { transfers, adjustments };
}

/**
 * A starting proposal for the transfers behind the typed balances, meant to be reviewed and edited by the person.
 * Money that left one bank and arrived in another becomes a transfer between the banks, leaving from the bank's
 * spendable account (that is where a PIX leaves from). If that account was refilled from a piggy bank, an internal
 * transfer says so. Whatever cannot be explained stays as a small adjustment, and the piggy bank absorbs it because
 * it accrues yield and fees while a spendable balance is exact.
 */
export function suggestTransfers(rows: BalanceSyncSuggestionRow[]): BalanceSyncTransfer[] {
  const difference = new Map(rows.map((row) => [row.accountId, row.desiredCents - row.currentCents]));
  const groups = new Map<string, BalanceSyncSuggestionRow[]>();
  for (const row of rows) groups.set(row.groupKey, [...(groups.get(row.groupKey) ?? []), row]);
  const groupChange = (key: string) => groups.get(key)!.reduce((sum, row) => sum + difference.get(row.accountId)!, 0);
  const keys = [...groups.keys()];
  const sources = largestFirst(keys.map((id) => ({ id, cents: -groupChange(id) })).filter((group) => group.cents > 0));
  const targets = largestFirst(keys.map((id) => ({ id, cents: groupChange(id) })).filter((group) => group.cents > 0));
  const supply = sources.reduce((sum, group) => sum + group.cents, 0), demand = targets.reduce((sum, group) => sum + group.cents, 0);

  // Real PIX amounts are usually whole reais while stale balances carry cents. When the exact outflows do not match
  // what arrived but whole-real outflows do, the whole reais are what was sent.
  let capacity = new Map(sources.map((group) => [group.id, group.cents]));
  if (supply !== demand) {
    const rounded = sources.map((group) => [group.id, roundToWholeReal(group.cents)] as const);
    if (rounded.every(([, cents]) => cents > 0) && rounded.reduce((sum, [, cents]) => sum + cents, 0) === demand) capacity = new Map(rounded);
  }
  const need = new Map(targets.map((group) => [group.id, group.cents]));
  const pick = (key: string, direction: "out" | "in") => {
    const members = groups.get(key)!, spendable = members.filter((row) => !row.reserve);
    const ranked = largestFirst((spendable.length ? spendable : members).map((row) => ({ id: row.accountId, cents: direction === "out" ? -difference.get(row.accountId)! : difference.get(row.accountId)! })));
    return ranked[0].id;
  };

  const transfers: BalanceSyncTransfer[] = [];
  for (const source of sources) {
    for (const target of targets) {
      const amountCents = Math.min(capacity.get(source.id)!, need.get(target.id)!);
      if (amountCents <= 0) continue;
      capacity.set(source.id, capacity.get(source.id)! - amountCents);
      need.set(target.id, need.get(target.id)! - amountCents);
      transfers.push({ fromAccountId: pick(source.id, "out"), toAccountId: pick(target.id, "in"), amountCents });
    }
  }

  // What the bank-to-bank transfers did not explain is settled inside each bank, between its own products.
  const residual = new Map(difference);
  for (const transfer of transfers) {
    residual.set(transfer.fromAccountId, residual.get(transfer.fromAccountId)! + transfer.amountCents);
    residual.set(transfer.toAccountId, residual.get(transfer.toAccountId)! - transfer.amountCents);
  }
  for (const members of groups.values()) {
    const ranked = (sign: 1 | -1) => largestFirst(members.filter((row) => Math.sign(residual.get(row.accountId)!) === sign).map((row) => ({ id: row.accountId, cents: residual.get(row.accountId)! })));
    for (const giver of ranked(-1)) {
      for (const taker of ranked(1)) {
        const available = -residual.get(giver.id)!, wanted = residual.get(taker.id)!;
        if (available <= 0 || wanted <= 0) continue;
        const giverRow = members.find((row) => row.accountId === giver.id)!, takerRow = members.find((row) => row.accountId === taker.id)!;
        let amountCents = Math.min(available, wanted);
        // Settle the spendable side to the cent and leave the cent noise on the piggy bank, when they are that close.
        if (giverRow.reserve && !takerRow.reserve && wanted > available && wanted - available <= WHOLE_REAL) amountCents = wanted;
        if (!giverRow.reserve && takerRow.reserve && available > wanted && available - wanted <= WHOLE_REAL) amountCents = available;
        residual.set(giver.id, residual.get(giver.id)! + amountCents);
        residual.set(taker.id, residual.get(taker.id)! - amountCents);
        transfers.push({ fromAccountId: giver.id, toAccountId: taker.id, amountCents });
      }
    }
  }
  return transfers.slice(0, MAX_SUGGESTED_TRANSFERS);
}

/** The quick transfer refuses a likely duplicate with this prefix, so the form can offer the explicit confirmation. */
export const POSSIBLE_DUPLICATE_PREFIX = "Possível duplicidade";
