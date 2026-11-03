import { describe, expect, it } from "vitest";
import { groupCreditReviews, type CreditReview } from "../review-groups";

const review = (overrides: Partial<CreditReview> = {}): CreditReview => ({
  id: "snapshot-a", accountId: "card-a", linkId: "link-a", connectionLabel: "Synthetic bank", accountName: "Synthetic card", maskedNumber: "0001", totalCents: 20000, balanceCents: null,
  dueDate: "2032-11-03", closingDate: "2032-10-26", status: "OPEN", reason: "Conferir total", statementId: null, statements: [], ...overrides,
});

describe("credit review presentation", () => {
  it("shows a card once while preserving every independent bill, amount and confirmation target", () => {
    const older = review({ id: "older", dueDate: "2032-10-03", totalCents: 12345, status: "PAID", statementId: "paid-statement", statements: [{ id: "paid-statement", dueDate: "2032-10-03", closingDate: "2032-09-26", referenceMonth: "2032-10", amountCents: 12345, status: "PAID", version: "2032-10-04T12:00:00Z" }] });
    const newer = review();
    const inputs = [newer, older];
    const result = groupCreditReviews(inputs);
    expect(result).toHaveLength(1);
    expect(result[0].reviews).toEqual([older, newer]);
    expect(result[0].reviews[0].statements).toEqual(older.statements);
    expect(inputs).toEqual([newer, older]);
  });

  it("keeps different cards separate even when the bank and marketing name match", () => {
    const inputs = [review(), review({ id: "snapshot-b", accountId: "card-b", linkId: "link-b", maskedNumber: "0002" })];
    const result = groupCreditReviews(inputs);
    expect(result.map(group => group.accountId)).toEqual(["card-a", "card-b"]);
    expect(result.map(group => group.maskedNumber)).toEqual(["0001", "0002"]);
    expect(result.every(group => group.reviews.length === 1)).toBe(true);
  });

  it("groups by the TBB card rather than the provider label or connection", () => {
    const inputs = [review(), review({ id: "reconnected", linkId: "replacement-link", connectionLabel: "Reconnected synthetic bank", dueDate: "2032-12-03" })];
    expect(groupCreditReviews(inputs)).toMatchObject([{ accountId: "card-a", reviews: [inputs[0], inputs[1]] }]);
  });

  it("preserves conflicting same-date reviews for explicit reconciliation instead of hiding evidence", () => {
    const inputs = [review(), review({ id: "same-day-other-source", totalCents: 90000 })];
    expect(groupCreditReviews(inputs)[0].reviews).toHaveLength(2);
    expect(groupCreditReviews(inputs)[0].reviews.map(row => row.totalCents).sort()).toEqual([20000, 90000]);
    expect(groupCreditReviews([])).toEqual([]);
  });
});
