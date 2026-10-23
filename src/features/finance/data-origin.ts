import { Prisma } from "@prisma/client";

import { IMPORT_SOURCES, type FinanceOrigin } from "./data-origin-core";
export * from "./data-origin-core";

/** Evidence is many-to-one: the same purchase can be confirmed by a file and the bank.
 * Keep its original source; both origin filters must find that one canonical purchase. */
export function transactionOriginWhere(origin: FinanceOrigin): Prisma.FinanceTransactionWhereInput {
  if (origin === "combined") return {};
  const bank: Prisma.FinanceTransactionWhereInput = { OR: [{ source: "OPEN_FINANCE" }, { tags: { has: "open-finance" } }, { evidence: { some: { decision: "COMMITTED", source: { fileName: { startsWith: "Open Finance ·" } } } } }] };
  const imported: Prisma.FinanceTransactionWhereInput = { OR: [{ source: { in: IMPORT_SOURCES }, NOT: { tags: { has: "open-finance" } } }, { evidence: { some: { decision: "COMMITTED", source: { NOT: { fileName: { startsWith: "Open Finance ·" } } } } } }] };
  return origin === "open-finance" ? bank : origin === "imported" ? imported : { source: { notIn: [...IMPORT_SOURCES, "OPEN_FINANCE"] }, NOT: { tags: { has: "open-finance" } } };
}

/** Same predicate for aggregate queries, with a fixed, locally chosen table alias. */
export function transactionOriginSql(origin: FinanceOrigin, alias: "FinanceTransaction" | "t" = "FinanceTransaction"): Prisma.Sql {
  if (origin === "combined") return Prisma.sql`TRUE`;
  const table = Prisma.raw(`"${alias}"`);
  const evidence = (bank: boolean) => Prisma.sql`EXISTS (SELECT 1 FROM "FinancialEvidence" e JOIN "FinancialSource" f ON f.id=e."sourceId" AND f."workspaceId"=e."workspaceId" WHERE e."transactionId"=${table}.id AND e."workspaceId"=${table}."workspaceId" AND e.decision='COMMITTED' AND ${bank ? Prisma.sql`f."fileName" LIKE 'Open Finance ·%'` : Prisma.sql`f."fileName" NOT LIKE 'Open Finance ·%'`})`;
  const bank = Prisma.sql`(${table}.source='OPEN_FINANCE' OR 'open-finance'=ANY(${table}.tags) OR ${evidence(true)})`;
  const imported = Prisma.sql`((${table}.source IN (${Prisma.join(IMPORT_SOURCES)}) AND NOT ('open-finance'=ANY(${table}.tags))) OR ${evidence(false)})`;
  return origin === "open-finance" ? bank : origin === "imported" ? imported : Prisma.sql`${table}.source NOT IN (${Prisma.join([...IMPORT_SOURCES, "OPEN_FINANCE"])}) AND NOT ('open-finance'=ANY(${table}.tags))`;
}

export function transactionOriginLabel(row: { source: string; tags?: string[]; evidence?: { source: { fileName: string } }[] }) {
  const bank = row.source === "OPEN_FINANCE" || row.tags?.includes("open-finance") || row.evidence?.some(item => item.source.fileName.startsWith("Open Finance ·"));
  const imported = IMPORT_SOURCES.includes(row.source) && !row.tags?.includes("open-finance") || row.evidence?.some(item => !item.source.fileName.startsWith("Open Finance ·"));
  const manual = !IMPORT_SOURCES.includes(row.source) && row.source !== "OPEN_FINANCE" && !row.tags?.includes("open-finance");
  return manual && bank ? "Manual + Open Finance" : bank && imported ? "Importação + Open Finance" : bank ? "Open Finance" : imported ? "Importação" : "Manual";
}
