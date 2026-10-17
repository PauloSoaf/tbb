import { subscriptionEquivalent } from "./money";

type RecurringExpense = {
  amountCents: number;
  description: string;
  merchant: string | null;
  subscriptionId?: string | null;
  fixedExpenseId?: string | null;
  /** Account the posting was made on; a credit card means it is part of that card's statement. */
  accountId?: string | null;
};

type ActiveSubscription = {
  fixedExpenseId?: string | null;
  id?: string;
  name: string;
  merchant: string | null;
  amountCents: number;
  billingCycle: string;
  customDays: number | null;
  /** Account the subscription is charged to; a credit card means it lands in that card's statement. */
  accountId?: string | null;
};

export const fixedExpenseKey = (value: string | null | undefined) =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const normalized = fixedExpenseKey;

/**
 * Combines recurring expenses already posted in the month with active
 * subscriptions. A subscription is ignored when its name or merchant already
 * appears in a recurring posting, preventing the most common double count.
 */
export function calculateFixedExpenses(
  recurring: RecurringExpense[],
  subscriptions: ActiveSubscription[],
  planned: { id?: string; name: string; amountCents: number }[] = [],
) {
  const plans = new Map(planned.filter(row => row.id).map(row => [row.id, row.name]));
  recurring = recurring.map(row => row.fixedExpenseId && plans.has(row.fixedExpenseId) ? { ...row, description: plans.get(row.fixedExpenseId)!, merchant: null } : row);
  subscriptions = subscriptions.map(row => row.fixedExpenseId && plans.has(row.fixedExpenseId) ? { ...row, name: plans.get(row.fixedExpenseId)!, merchant: null } : row);
  const recurringAmountCents = recurring.reduce((sum, item) => sum + item.amountCents, 0);
  const recurringNames = recurring.flatMap((item) => [normalized(item.description), normalized(item.merchant)]).filter(Boolean);

  const plannedNames = planned.map((item) => normalized(item.name)).filter(Boolean);
  const plannedAmounts = new Map<string, number>();
  for(const item of planned){const key=normalized(item.name);plannedAmounts.set(key,(plannedAmounts.get(key)||0)+item.amountCents);}
  const unmatchedRecurring = recurring.filter((item) => ![normalized(item.description), normalized(item.merchant)].some((value) => value && plannedNames.includes(value)));
  const allNames = [...recurringNames, ...plannedNames];
  const unmatchedSubscriptions = subscriptions.filter((subscription) => {
    if (subscription.id && recurring.some(item => item.subscriptionId === subscription.id)) return false;
    const candidates = [normalized(subscription.name), normalized(subscription.merchant)].filter(Boolean);
    return !candidates.some((candidate) => allNames.some((posted) => posted === candidate));
  });
  const subscriptionAmountCents = unmatchedSubscriptions.reduce(
    (sum, item) => sum + subscriptionEquivalent(item.amountCents, item.billingCycle, item.customDays).monthly,
    0,
  );

  return {
    amountCents: unmatchedRecurring.reduce((sum,item)=>sum+item.amountCents,0) + [...plannedAmounts].reduce((sum,[name,amount])=>sum+Math.max(amount,recurring.filter((posted)=>[normalized(posted.description),normalized(posted.merchant)].includes(name)).reduce((total,posted)=>total+posted.amountCents,0)),0) + subscriptionAmountCents,
    postedCents: recurringAmountCents,
    subscriptionAmountCents,
    recurringCount: unmatchedRecurring.length,
    subscriptionCount: unmatchedSubscriptions.length,
    plannedCount: planned.length,
  };
}

export type FixedItemKind = "FIXED" | "SUBSCRIPTION" | "RECURRING";
export type FixedItem = {
  kind: FixedItemKind;
  /** Id of the planned expense or subscription; recurring postings have none. */
  id: string | null;
  name: string;
  cents: number;
  /** For planned expenses: what was planned, and what was already posted under the same name this month. */
  plannedCents?: number;
  postedCents?: number;
  /** Credit card whose statement this commitment lands in; null when it is not charged to a card. */
  cardId?: string | null;
  /** Amount evidenced by purchases linked to a bill in this month's chart. A card assignment alone proves nothing. */
  includedInBillsCents?: number;
};
export type PlannedFixed = { id?: string; name: string; amountCents: number; cardId?: string | null };

/** A planned expense counts in a month up to and including the month of its end date; with no end date it never ends. */
export const plannedActiveIn = <T extends { startsOn?: string | null; endsOn?: string | null }>(planned: T[], month: string): T[] => planned.filter((item) => (!item.startsOn || item.startsOn.slice(0, 7) <= month) && (!item.endsOn || item.endsOn.slice(0, 7) >= month));

/**
 * The same universe as `calculateFixedExpenses`, itemised: every planned expense, every subscription not
 * already covered, every recurring posting not matching a plan. The cents add up exactly to its
 * `amountCents`, so a chart built from the items always agrees with the "Fixos" figure.
 * Planned expenses that share a name are one commitment: they show separately, and anything posted
 * above their combined plan appears as an extra line instead of being lost or counted twice.
 * With `cardIds` (the active credit cards) each item also says which card it is charged to: a planned expense
 * by the link the user set, a subscription or a posting by the account it was made on.
 */
export function fixedExpenseItems(
  recurring: RecurringExpense[],
  subscriptions: ActiveSubscription[],
  planned: PlannedFixed[] = [],
  options: { cardIds?: ReadonlySet<string> } = {},
): FixedItem[] {
  const plans = new Map(planned.filter(row => row.id).map(row => [row.id, row.name]));
  recurring = recurring.map(row => row.fixedExpenseId && plans.has(row.fixedExpenseId) ? { ...row, description: plans.get(row.fixedExpenseId)!, merchant: null } : row);
  subscriptions = subscriptions.map(row => row.fixedExpenseId && plans.has(row.fixedExpenseId) ? { ...row, name: plans.get(row.fixedExpenseId)!, merchant: null } : row);
  // The user's own link is trusted unless that card is known to be gone; an account found on a posting or a
  // subscription counts only when it is a known credit card.
  const explicitCard = (id?: string | null) => (id && (!options.cardIds || options.cardIds.has(id)) ? id : null);
  const accountCard = (id?: string | null) => (id && options.cardIds?.has(id) ? id : null);
  const names = (item: RecurringExpense) => [normalized(item.description), normalized(item.merchant)];
  const plannedNames = planned.map((item) => normalized(item.name)).filter(Boolean);
  const items: FixedItem[] = [];

  const groups = new Map<string, typeof planned>();
  for (const item of planned) {
    const key = normalized(item.name);
    groups.set(key, [...(groups.get(key) || []), item]);
  }
  for (const [key, group] of groups) {
    const plannedSum = group.reduce((sum, item) => sum + item.amountCents, 0);
    const postedSum = recurring.filter((posted) => names(posted).includes(key)).reduce((sum, posted) => sum + posted.amountCents, 0);
    for (const item of group) items.push({ kind: "FIXED", id: item.id ?? null, name: item.name, cents: item.amountCents, plannedCents: item.amountCents, postedCents: group.length === 1 ? postedSum : undefined, cardId: explicitCard(item.cardId) });
    if (postedSum > plannedSum) items.push({ kind: "FIXED", id: null, name: `${group[0].name} (acima do previsto)`, cents: postedSum - plannedSum, plannedCents: 0, postedCents: postedSum - plannedSum, cardId: explicitCard(group.find((item) => item.cardId)?.cardId) });
  }

  for (const item of recurring) {
    if (names(item).some((value) => value && plannedNames.includes(value))) continue;
    items.push({ kind: "RECURRING", id: null, name: item.description || item.merchant || "Lançamento recorrente", cents: item.amountCents, cardId: accountCard(item.accountId) });
  }

  const allNames = [...recurring.flatMap(names), ...plannedNames].filter(Boolean);
  for (const subscription of subscriptions) {
    if (subscription.id && recurring.some((item) => item.subscriptionId === subscription.id)) continue;
    const candidates = [normalized(subscription.name), normalized(subscription.merchant)].filter(Boolean);
    if (candidates.some((candidate) => allNames.some((posted) => posted === candidate))) continue;
    items.push({ kind: "SUBSCRIPTION", id: subscription.id ?? null, name: subscription.name, cents: subscriptionEquivalent(subscription.amountCents, subscription.billingCycle, subscription.customDays).monthly, cardId: accountCard(subscription.accountId) });
  }
  return items;
}
