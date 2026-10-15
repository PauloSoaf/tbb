import type { CardStatementStatus } from "@prisma/client";
import { isDateKey } from "@/lib/dates";

/** Where a bill's numbers come from and when. Three different dates, never interchangeable:
 * - modifiedAt: when the record last changed inside TBB (an edit, an import);
 * - bankAsOfDate: the date the bank's own information refers to (the document or file date);
 * - lastVerifiedAt: when the user last confirmed the values against the original document.
 * TBB does not talk to the banks, so nothing here ever says "synchronized". */
export type StatementSourceKind = "JSON_IMPORT" | "VERIFIED_DOCUMENT" | "UNKNOWN";
export type StatementProvenance = {
  createdAt: string | null;
  modifiedAt: string | null;
  bankAsOfDate: string | null;
  sourceKind: StatementSourceKind;
  lastVerifiedAt: string | null;
};
export type ProvenanceLine = { label: string; value: string };
export type ProvenanceView = { summary: string; stale: boolean; staleReason: string | null; lines: ProvenanceLine[]; note: string };

/** Bank information older than this is flagged as unconfirmed (a monthly bill goes stale after ~5 weeks). */
export const STALE_AFTER_DAYS = 35;
const SKEW_MS = 5 * 60_000;
const NOT_INFORMED = "Não informado";

export function sourceKindOf(source: string | null | undefined): StatementSourceKind {
  if (source === "MANUAL_IMPORT") return "JSON_IMPORT";
  if (source === "VERIFIED_DOCUMENT") return "VERIFIED_DOCUMENT";
  return "UNKNOWN";
}
const SOURCE_LABEL: Record<StatementSourceKind, string> = {
  JSON_IMPORT: "Arquivo de faturas (JSON) importado",
  VERIFIED_DOCUMENT: "Documento do banco conferido por você",
  UNKNOWN: "Origem não registrada",
};

export function buildProvenance(row: { createdAt?: Date | null; updatedAt?: Date | null; sourceAsOf?: Date | null; source?: string | null }, lastVerifiedAt?: Date | null): StatementProvenance {
  const iso = (value?: Date | null) => (value && !Number.isNaN(value.getTime()) ? value.toISOString() : null);
  return {
    createdAt: iso(row.createdAt), modifiedAt: iso(row.updatedAt), bankAsOfDate: row.sourceAsOf && !Number.isNaN(row.sourceAsOf.getTime()) ? row.sourceAsOf.toISOString().slice(0, 10) : null,
    sourceKind: sourceKindOf(row.source), lastVerifiedAt: iso(lastVerifiedAt),
  };
}

const isDayKey = (value: string | null): value is string => Boolean(value && isDateKey(value));
const days = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / 86_400_000);

/** Everything is formatted here, on the server, in the workspace's time zone, with the offset shown,
 * so the browser never re-formats it and cannot disagree with the server. */
export function describeProvenance(provenance: StatementProvenance | undefined, options: { timeZone: string; today: string; now: Date; status: CardStatementStatus; locale?: string; staleAfterDays?: number }): ProvenanceView {
  const locale = options.locale ?? "pt-BR";
  const instant = (value: string | null) => {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return NOT_INFORMED;
    if (date.getTime() > options.now.getTime() + SKEW_MS) return `${NOT_INFORMED} (horário inválido)`;
    const text = new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short", timeZone: options.timeZone }).format(date);
    const offset = new Intl.DateTimeFormat("en-US", { timeZone: options.timeZone, timeZoneName: "shortOffset" }).formatToParts(date).find((part) => part.type === "timeZoneName")?.value;
    return offset ? `${text} (${offset})` : text;
  };
  const bankDay = isDayKey(provenance?.bankAsOfDate ?? null) && provenance!.bankAsOfDate! <= options.today ? provenance!.bankAsOfDate! : null;
  const bankText = bankDay ? new Intl.DateTimeFormat(locale, { dateStyle: "short", timeZone: "UTC" }).format(new Date(`${bankDay}T00:00:00.000Z`)) : provenance?.bankAsOfDate ? `${NOT_INFORMED} (data inválida)` : NOT_INFORMED;
  const threshold = options.staleAfterDays ?? STALE_AFTER_DAYS;
  const mutable = options.status !== "PAID";
  const age = bankDay ? days(bankDay, options.today) : null;
  const stale = mutable && (age === null || age > threshold);
  const staleReason = !stale ? null : age === null ? "A data da informação bancária não consta no registro." : `A informação bancária tem ${age} dias (limite de ${threshold}).`;
  const modified = instant(provenance?.modifiedAt ?? null);
  const created = instant(provenance?.createdAt ?? null);
  const verified = provenance?.lastVerifiedAt ? instant(provenance.lastVerifiedAt) : "Nenhuma conferência registrada";
  const lines: ProvenanceLine[] = [
    { label: "Alterada no TBB", value: modified },
    { label: "Informação bancária até", value: bankText },
    { label: "Origem", value: SOURCE_LABEL[provenance?.sourceKind ?? "UNKNOWN"] },
    { label: "Registrada no TBB", value: created },
    { label: "Última conferência manual", value: verified },
  ];
  return {
    summary: `Alterada no TBB em ${modified}. Informação bancária até ${bankText}.${stale ? " Dados sem confirmação recente." : ""}`,
    stale, staleReason, lines,
    note: "O TBB não consulta o banco sozinho: estas datas dizem de onde vêm os números registrados. Para atualizar, use Corrigir fatura ou importe o documento do banco.",
  };
}
