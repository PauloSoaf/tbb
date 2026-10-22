import { Prisma, type PrismaClient } from "@prisma/client";
import { pluggyConfigFromEnv } from "./pluggy-client";
import { latestCreditBills } from "./credit-bills";

const iso = (value: Date | null) => value?.toISOString() ?? null;
const day = (value: Date | null) => value?.toISOString().slice(0, 10) ?? null;

/** Only what a screen or a mobile client may see: never the item id, its cipher or its hash. */
export async function openFinanceOverview(db: PrismaClient, workspaceId: string) {
  const configured = pluggyConfigFromEnv() !== null;
  try {
    const [connections, pendingReview, snapshots] = await Promise.all([
      db.openFinanceConnection.findMany({
        where: { workspaceId }, orderBy: { createdAt: "asc" },
        select: {
          id: true, label: true, provider: true, institutionName: true, status: true, providerStatus: true, providerExecutionStatus: true, providerUpdatedAt: true, nextAutoSyncAt: true,
          consentExpiresAt: true, lastSyncedAt: true, lastErrorCode: true, lastErrorAt: true, createdAt: true,
          accounts: { orderBy: [{ kind: "asc" }, { displayName: "asc" }], select: { id: true, externalAccountId: true, accountId: true, kind: true, subtype: true, displayName: true, maskedNumber: true, syncFromDate: true, isEnabled: true, providerBalanceCents: true, providerBalanceAt: true, lastTransactionDate: true } },
          runs: { orderBy: { startedAt: "desc" }, take: 6, select: { id: true, trigger: true, status: true, startedAt: true, finishedAt: true, accountsSeen: true, transactionsFetched: true, pendingSkipped: true, outsideWindow: true, staged: true, autoCreated: true, needsReview: true, alreadyKnown: true, errorCode: true } },
        },
      }),
      db.financialEvidence.count({ where: { workspaceId, decision: "NEEDS_REVIEW", source: { fileName: { startsWith: "Open Finance ·" } } } }),
      latestCreditBills(db, workspaceId),
    ]);
    const linkIds = new Set(connections.flatMap(connection => connection.accounts.map(account => account.id)));
    const reviews = snapshots.filter(row => row.kind === "OPEN_FINANCE_BILL_REVIEW" && linkIds.has(row.data.linkId));
    const statements = reviews.length ? await db.cardStatement.findMany({ where: { workspaceId, accountId: { in: [...new Set(reviews.map(row => row.accountId))] } }, select: { id: true, accountId: true, dueDate: true, closingDate: true, referenceMonth: true, amountCents: true, status: true, updatedAt: true, transactions: { where: { statementDetailMode: "ADDED_TO_STATEMENT" }, select: { type: true, amountCents: true } } }, orderBy: { dueDate: "desc" } }) : [];
    return {
      ready: true as const, configured, pendingReview,
      creditReviews: reviews.map(row => ({ id: row.id, linkId: row.data.linkId, totalCents: row.data.bill.totalCents, balanceCents: row.data.bill.balanceCents ?? null, dueDate: row.data.bill.dueDate, closingDate: row.data.bill.closingDate, status: row.data.bill.status, reason: row.data.reason, statementId: row.data.statementId,
        statements: statements.filter(statement => statement.accountId === row.accountId).map(statement => ({ id: statement.id, dueDate: day(statement.dueDate), closingDate: day(statement.closingDate), referenceMonth: statement.referenceMonth, amountCents: statement.amountCents + statement.transactions.reduce((sum, transaction) => sum + (transaction.type === "REFUND" ? -1 : 1) * transaction.amountCents, 0), status: statement.status, version: statement.updatedAt.toISOString() })),
      })),
      connections: connections.map(connection => ({
        ...connection, providerUpdatedAt: iso(connection.providerUpdatedAt), nextAutoSyncAt: iso(connection.nextAutoSyncAt), consentExpiresAt: iso(connection.consentExpiresAt),
        lastSyncedAt: iso(connection.lastSyncedAt), lastErrorAt: iso(connection.lastErrorAt), createdAt: connection.createdAt.toISOString(),
        accounts: connection.accounts.map(account => ({ ...account, syncFromDate: day(account.syncFromDate), providerBalanceAt: iso(account.providerBalanceAt), lastTransactionDate: day(account.lastTransactionDate) })),
        runs: connection.runs.map(run => ({ ...run, startedAt: run.startedAt.toISOString(), finishedAt: iso(run.finishedAt) })),
      })),
    };
  } catch (error) {
    // The three tables arrive with a migration; until it is applied the page says so instead of failing.
    if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2021" || error.code === "P2022")) return { ready: false as const, configured, pendingReview: 0, connections: [], creditReviews: [] };
    throw error;
  }
}
export type OpenFinanceOverview = Awaited<ReturnType<typeof openFinanceOverview>>;
