import type { Prisma, TransactionType } from "@prisma/client";

export type TransactionSearchParams = { q?: string; account?: string; category?: string; type?: string; source?: string; page?: string };
const TYPES: readonly TransactionType[] = ["EXPENSE", "INCOME", "REFUND", "TRANSFER", "ADJUSTMENT"];

/** Where-clause of the transactions page. Always scoped to the session's workspace; the text search
 * also looks into the optional note, so a remembered "dividido com Alexandre" finds the expense. */
export function transactionWhere(workspaceId: string, params: TransactionSearchParams): Prisma.FinanceTransactionWhereInput {
  const q = params.q?.trim();
  return {
    workspaceId,
    type: TYPES.find((type) => type === params.type),
    accountId: params.account || undefined,
    categoryId: params.category || undefined,
    source: params.source || undefined,
    ...(q ? { OR: [
      { description: { contains: q, mode: "insensitive" } },
      { merchant: { contains: q, mode: "insensitive" } },
      { notes: { contains: q, mode: "insensitive" } },
      { tags: { has: q } },
    ] } : {}),
  };
}
