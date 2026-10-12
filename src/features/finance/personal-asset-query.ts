import "server-only";
import { prisma } from "@/lib/prisma";
import type { PersonalAssetRow } from "./personal-assets";

export async function personalAssetRows(workspaceId: string, includeArchived = false): Promise<PersonalAssetRow[]> {
  const rows = await prisma.personalAsset.findMany({
    where: { workspaceId, ...(!includeArchived && { archivedAt: null }) },
    include: { debt: { select: { workspaceId: true, name: true, remainingBalanceCents: true, status: true } } },
    orderBy: [{ archivedAt: "asc" }, { valueCents: "desc" }, { name: "asc" }],
  });
  return rows.map(row => ({
    id: row.id, name: row.name, kind: row.kind, valueCents: row.valueCents,
    valuationDate: row.valuationDate.toISOString().slice(0, 10),
    purchaseValueCents: row.purchaseValueCents, purchaseDate: row.purchaseDate?.toISOString().slice(0, 10) || null,
    notes: row.notes, debtId: row.debt?.workspaceId === workspaceId ? row.debtId : null, version: row.version, archivedAt: row.archivedAt?.toISOString() || null,
    debt: row.debt?.workspaceId === workspaceId ? { name: row.debt.name, remainingBalanceCents: row.debt.remainingBalanceCents, status: row.debt.status } : null,
  }));
}
