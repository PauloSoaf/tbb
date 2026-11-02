"use server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/workspace";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createHash } from "node:crypto";
import { parseCareerCsv } from "./transfer";
import { applicationSchema } from "./schemas";
import { saveOpportunityInTransaction, CareerError } from "./service";
export async function importCareerCsvAction(
  source: string,
): Promise<{ success?: string; error?: string }> {
  try {
    const c = await requirePermission("WRITE"),
      rows = parseCareerCsv(source);
    const checked = rows.map((row, index) => {
      try {
        return {
          sourceId: row.id,
          data: applicationSchema.parse({
            ...row,
            id: undefined,
            companyId: "",
            revision: undefined,
            technologies:
              row.technologies
                ?.split(",")
                .map((s) => s.trim())
                .filter(Boolean) ?? [],
            tags:
              row.tags
                ?.split(",")
                .map((s) => s.trim())
                .filter(Boolean) ?? [],
            salaryMinCents: row.salaryMinCents
              ? Number(row.salaryMinCents)
              : null,
            salaryMaxCents: row.salaryMaxCents
              ? Number(row.salaryMaxCents)
              : null,
          }),
        };
      } catch (e) {
        if (e instanceof z.ZodError)
          throw new CareerError(`Linha ${index + 2}: ${e.issues[0].message}`);
        throw e;
      }
    });
    // Validate the complete file before the transaction; the transaction also rolls back the complete batch on failure.
    const existing = await prisma.application.findMany({
      where: {
        workspaceId: c.workspaceId,
        id: { in: checked.flatMap((r) => (r.sourceId ? [r.sourceId] : [])) },
      },
      select: { id: true },
    });
    const actor = {
      workspaceId: c.workspaceId,
      userId: c.userId,
      timezone: c.workspace.timezone,
    };
    // Use the same service, inside a single database transaction, without opening nested transactions.
    const digest = createHash("sha256").update(source).digest("hex");
    const results = await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${actor.workspaceId + ":career-import:" + digest},0))`;
        if (
          await tx.activityEvent.findFirst({
            where: {
              workspaceId: actor.workspaceId,
              entityType: "CareerImport",
              entityId: digest,
              type: "CareerCsvImported",
            },
            select: { id: true },
          })
        )
          return 0;
        let created = 0;
        for (const r of checked) {
          if (existing.some((e) => e.id === r.sourceId)) continue;
          await saveOpportunityInTransaction(tx, actor, r.data);
          created++;
        }
        await tx.activityEvent.create({
          data: {
            workspaceId: actor.workspaceId,
            actorUserId: actor.userId,
            entityType: "CareerImport",
            entityId: digest,
            type: "CareerCsvImported",
            metadata: { created, skipped: checked.length - created },
          },
        });
        return created;
      },
      { timeout: 60000 },
    );
    revalidatePath("/career", "layout");
    return {
      success: `${results} vaga(s) importada(s). ${checked.length - results} identificador(es) já existente(s) preservado(s).`,
    };
  } catch (e) {
    return {
      error:
        e instanceof CareerError
          ? e.message
          : "Não foi possível importar. O lote não foi gravado; revise o arquivo e tente novamente.",
    };
  }
}
