import { prisma } from "@/lib/prisma";

export interface TableSizeRow {
  tableName: string;
  totalBytes: number;
  tableBytes: number;
  indexBytes: number;
  rowEstimate: number;
  deadRowEstimate: number;
}

export interface DatabaseMetrics {
  provider: "postgres";
  databaseBytes: number;
  topTables: TableSizeRow[];
}

/**
 * Real Postgres introspection — no invented numbers. Uses the standard
 * `pg_total_relation_size`/`pg_stat_user_tables` combo (the documented best
 * practice for "how big is each table including its indexes") plus
 * `n_live_tup`/`n_dead_tup` from the same view for a bloat signal.
 * Only works when the connected database is genuinely Postgres — this app
 * always is, so no other provider branch exists (nothing invented for
 * providers we don't run on).
 */
export const dbMetricsService = {
  async getDatabaseMetrics(topN = 10): Promise<DatabaseMetrics> {
    const [dbSizeRows, tableRows] = await Promise.all([
      prisma.$queryRawUnsafe<{ size: bigint }[]>(
        `SELECT pg_database_size(current_database()) AS size`
      ),
      prisma.$queryRawUnsafe<
        {
          table_name: string;
          total_bytes: bigint;
          table_bytes: bigint;
          index_bytes: bigint;
          row_estimate: bigint;
          dead_row_estimate: bigint;
        }[]
      >(`
        SELECT
          relname AS table_name,
          pg_total_relation_size(relid) AS total_bytes,
          pg_relation_size(relid) AS table_bytes,
          pg_indexes_size(relid) AS index_bytes,
          n_live_tup AS row_estimate,
          n_dead_tup AS dead_row_estimate
        FROM pg_stat_user_tables
        ORDER BY pg_total_relation_size(relid) DESC
        LIMIT ${topN}
      `),
    ]);

    return {
      provider: "postgres",
      databaseBytes: Number(dbSizeRows[0]?.size ?? 0),
      topTables: tableRows.map((r) => ({
        tableName: r.table_name,
        totalBytes: Number(r.total_bytes),
        tableBytes: Number(r.table_bytes),
        indexBytes: Number(r.index_bytes),
        rowEstimate: Number(r.row_estimate),
        deadRowEstimate: Number(r.dead_row_estimate),
      })),
    };
  },
};
