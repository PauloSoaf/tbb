import type { OpenFinanceOverview } from "./queries";

export type CreditReview = OpenFinanceOverview["creditReviews"][number];

/** Present one card once. Different periods remain independent reviews and are never merged. */
export function groupCreditReviews(reviews: CreditReview[]) {
  const groups = new Map<string, { accountId: string; accountName: string; connectionLabel: string; maskedNumber: string | null; reviews: CreditReview[] }>();
  for (const review of reviews) {
    let group = groups.get(review.accountId);
    if (!group) {
      group = { accountId: review.accountId, accountName: review.accountName, connectionLabel: review.connectionLabel, maskedNumber: review.maskedNumber, reviews: [] };
      groups.set(review.accountId, group);
    }
    group.reviews.push(review);
  }
  return [...groups.values()].map(group => ({ ...group, reviews: [...group.reviews].sort((a, b) => a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0) }));
}
