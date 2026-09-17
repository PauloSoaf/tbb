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

const normalized = (value: string | null | undefined) =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Combines recurring expenses already posted in the month with active
 * subscriptions. A subscription is ignored when its name or merchant already
 * appears in a recurring posting, preventing the most common double count.
 */
export function calculateFixedExpenses(
  recurring: RecurringExpense[],
  subscriptions: ActiveSubscription[],
) {
  const recurringAmountCents = recurring.reduce((sum, item) => sum + item.amountCents, 0);
  const recurringNames = recurring.flatMap((item) => [normalized(item.description), normalized(item.merchant)]).filter(Boolean);

  const unmatchedSubscriptions = subscriptions.filter((subscription) => {
    const candidates = [normalized(subscription.name), normalized(subscription.merchant)].filter(Boolean);
    return !candidates.some((candidate) => recurringNames.some((posted) => posted.includes(candidate) || candidate.includes(posted)));
  });
  const subscriptionAmountCents = unmatchedSubscriptions.reduce(
    (sum, item) => sum + subscriptionEquivalent(item.amountCents, item.billingCycle, item.customDays).monthly,
    0,
  );

  return {
    amountCents: recurringAmountCents + subscriptionAmountCents,
    postedCents: recurringAmountCents,
    subscriptionAmountCents,
    recurringCount: recurring.length,
    subscriptionCount: unmatchedSubscriptions.length,
  };
}
