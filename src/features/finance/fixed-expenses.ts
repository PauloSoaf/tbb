import { subscriptionEquivalent } from "./money";

type RecurringExpense = {
  amountCents: number;
  description: string;
  merchant: string | null;
};

type ActiveSubscription = {
  name: string;
  merchant: string | null;
  amountCents: number;
  billingCycle: string;
  customDays: number | null;
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
  planned: { name: string; amountCents: number }[] = [],
) {
  const recurringAmountCents = recurring.reduce((sum, item) => sum + item.amountCents, 0);
  const recurringNames = recurring.flatMap((item) => [normalized(item.description), normalized(item.merchant)]).filter(Boolean);

  const plannedNames = planned.map((item) => normalized(item.name)).filter(Boolean);
  const plannedAmounts = new Map<string, number>();
  for(const item of planned){const key=normalized(item.name);plannedAmounts.set(key,(plannedAmounts.get(key)||0)+item.amountCents);}
  const unmatchedRecurring = recurring.filter((item) => ![normalized(item.description), normalized(item.merchant)].some((value) => value && plannedNames.includes(value)));
  const allNames = [...recurringNames, ...plannedNames];
  const unmatchedSubscriptions = subscriptions.filter((subscription) => {
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
