import { Prisma, type PrismaClient } from "@prisma/client";
import { pluggyConfigFromEnv } from "./pluggy-client";

const iso = (value: Date | null) => value?.toISOString() ?? null;
const day = (value: Date | null) => value?.toISOString().slice(0, 10) ?? null;

/** Only what a screen or a mobile client may see: never the item id, its cipher or its hash. */
export async function openFinanceOverview(db: PrismaClient, workspaceId: string) {
  const configured = pluggyConfigFromEnv() !== null;
  try {
    const [connections, pendingReview] = await Promise.all([
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
    ]);
    return {
      ready: true as const, configured, pendingReview,
      connections: connections.map(connection => ({
        ...connection, providerUpdatedAt: iso(connection.providerUpdatedAt), nextAutoSyncAt: iso(connection.nextAutoSyncAt), consentExpiresAt: iso(connection.consentExpiresAt),
        lastSyncedAt: iso(connection.lastSyncedAt), lastErrorAt: iso(connection.lastErrorAt), createdAt: connection.createdAt.toISOString(),
        accounts: connection.accounts.map(account => ({ ...account, syncFromDate: day(account.syncFromDate), providerBalanceAt: iso(account.providerBalanceAt), lastTransactionDate: day(account.lastTransactionDate) })),
        runs: connection.runs.map(run => ({ ...run, startedAt: run.startedAt.toISOString(), finishedAt: iso(run.finishedAt) })),
      })),
    };
  } catch (error) {
    // The three tables arrive with a migration; until it is applied the page says so instead of failing.
    if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2021" || error.code === "P2022")) return { ready: false as const, configured, pendingReview: 0, connections: [] };
    throw error;
  }
}
export type OpenFinanceOverview = Awaited<ReturnType<typeof openFinanceOverview>>;
