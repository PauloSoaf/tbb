import { FinancePrivacyBoundary } from "@/features/finance/FinancePrivacy";
import { PersonalAssetsPage } from "@/features/finance/PersonalAssetsPage";
import { personalAssetRows } from "@/features/finance/personal-asset-query";
import { dayKey } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { AuthorizationError, requirePermission } from "@/lib/workspace";

export default async function AssetsPage() {
  const ctx = await requirePermission("READ");
  let canWrite = false;
  try { await requirePermission("WRITE"); canWrite = true; }
  catch (error) { if (!(error instanceof AuthorizationError)) throw error; }
  const [assets, debts] = await Promise.all([
    personalAssetRows(ctx.workspaceId, true),
    prisma.debt.findMany({ where: { workspaceId: ctx.workspaceId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return <FinancePrivacyBoundary canWrite={canWrite}><PersonalAssetsPage assets={assets} debts={debts} canWrite={canWrite} today={dayKey(new Date(), ctx.workspace.timezone)}/></FinancePrivacyBoundary>;
}
