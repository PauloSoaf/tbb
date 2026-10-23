export const FINANCE_ORIGINS = ["combined", "imported", "open-finance", "manual"] as const;
export type FinanceOrigin = typeof FINANCE_ORIGINS[number];
export const ORIGIN_LABELS: Record<FinanceOrigin, string> = { combined: "Consolidado", imported: "Importações", "open-finance": "Open Finance", manual: "Manual" };
export const IMPORT_SOURCES = ["DOCUMENT_V2", "MANUAL_IMPORT", "CSV", "CSV_IMPORT", "PDF", "OFX", "XLSX", "EXCEL", "PASTE"];
export const parseFinanceOrigin = (value?: string | null): FinanceOrigin => FINANCE_ORIGINS.find(origin => origin === value) ?? "combined";
