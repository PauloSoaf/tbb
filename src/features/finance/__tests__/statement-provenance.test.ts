import { describe, expect, it } from "vitest";
import { buildProvenance, describeProvenance, sourceKindOf, STALE_AFTER_DAYS, type StatementProvenance } from "../statement-provenance";

const NOW = new Date("2032-10-12T18:32:00.000Z"); // 14:32 in Manaus (GMT-4)
const base: StatementProvenance = { createdAt: "2032-10-01T15:00:00.000Z", modifiedAt: "2032-10-12T18:30:00.000Z", bankAsOfDate: "2032-09-24", sourceKind: "VERIFIED_DOCUMENT", lastVerifiedAt: null };
const view = (provenance: StatementProvenance | undefined, extra: Partial<Parameters<typeof describeProvenance>[1]> = {}) =>
  describeProvenance(provenance, { timeZone: "America/Manaus", today: "2032-10-12", now: NOW, status: "OPEN", ...extra });
const value = (v: ReturnType<typeof view>, label: string) => v.lines.find((line) => line.label === label)?.value;

describe("F04 · two different dates, never mixed up", () => {
  it("shows the TBB edit time and the bank's reference date as separate facts", () => {
    const v = view(base);
    expect(value(v, "Alterada no TBB")).toBe("12/10/2032, 14:30 (GMT-4)");
    expect(value(v, "Informação bancária até")).toBe("24/09/2032");
    expect(v.summary).toContain("Alterada no TBB em 12/10/2032, 14:30 (GMT-4)");
    expect(v.summary).toContain("Informação bancária até 24/09/2032");
  });

  it("never claims synchronization with a bank", () => {
    const text = JSON.stringify(view(base)).toLowerCase();
    expect(text).not.toContain("sincroniz");
    expect(text).not.toContain("atualizada pelo banco");
    expect(view(base).note).toContain("documento e a última conferência");
  });

  it("uses the workspace's time zone and shows its offset", () => {
    expect(value(view(base, { timeZone: "America/Sao_Paulo" }), "Alterada no TBB")).toBe("12/10/2032, 15:30 (GMT-3)");
    expect(value(view(base, { timeZone: "UTC" }), "Alterada no TBB")).toContain("GMT");
  });
});

describe("F04 · missing, doubtful and recent data", () => {
  it("says 'Não informado' instead of inventing a time or a date", () => {
    const v = view({ ...base, modifiedAt: null, createdAt: null, bankAsOfDate: null });
    expect(value(v, "Alterada no TBB")).toBe("Não informado");
    expect(value(v, "Informação bancária até")).toBe("Não informado");
    expect(view(undefined).lines.every((line) => typeof line.value === "string" && line.value.length > 0)).toBe(true);
  });

  it("treats an invalid or future instant (clock skew) as unknown, but tolerates a few minutes of skew", () => {
    expect(value(view({ ...base, modifiedAt: "not-a-date" }), "Alterada no TBB")).toBe("Não informado");
    expect(value(view({ ...base, modifiedAt: "2032-10-13T18:30:00.000Z" }), "Alterada no TBB")).toBe("Não informado (horário inválido)");
    expect(value(view({ ...base, modifiedAt: "2032-10-12T18:34:00.000Z" }), "Alterada no TBB")).toContain("12/10/2032");
  });

  it("rejects a bank reference date in the future or malformed", () => {
    expect(value(view({ ...base, bankAsOfDate: "2032-11-30" }), "Informação bancária até")).toBe("Não informado (data inválida)");
    expect(value(view({ ...base, bankAsOfDate: "2032-02-31" }), "Informação bancária até")).toBe("Não informado (data inválida)");
  });

  it("flags bank information older than the limit as unconfirmed, only for bills that can still change", () => {
    const old = { ...base, bankAsOfDate: "2032-08-01" };
    expect(view(old).stale).toBe(true);
    expect(view(old).staleReason).toContain("dias");
    expect(view(old).summary).toContain("Dados sem confirmação recente");
    expect(view(old, { status: "FUTURE_KNOWN" }).stale).toBe(true);
    expect(view(old, { status: "PAID" }).stale).toBe(false);
    expect(view(base).stale).toBe(false);
  });

  it("flags a missing bank date on an open bill, with a configurable limit", () => {
    expect(view({ ...base, bankAsOfDate: null }).stale).toBe(true);
    const nineteenDays = { ...base, bankAsOfDate: "2032-09-23" };
    expect(view(nineteenDays, { staleAfterDays: 10 }).stale).toBe(true);
    expect(view(nineteenDays).stale).toBe(false);
    expect(STALE_AFTER_DAYS).toBe(35);
  });
});

describe("F04 · provenance built from the stored columns", () => {
  const row = { createdAt: new Date("2032-10-01T15:00:00.000Z"), updatedAt: new Date("2032-10-12T18:30:00.000Z"), sourceAsOf: new Date("2032-09-24T00:00:00.000Z"), source: "VERIFIED_DOCUMENT" };
  it("copies the three dates and the source kind without touching them", () => {
    expect(buildProvenance(row)).toEqual({ createdAt: "2032-10-01T15:00:00.000Z", modifiedAt: "2032-10-12T18:30:00.000Z", bankAsOfDate: "2032-09-24", sourceKind: "VERIFIED_DOCUMENT", lastVerifiedAt: null });
  });
  it("keeps the manual verification separate from the system edit", () => {
    const built = buildProvenance(row, new Date("2032-10-05T12:00:00.000Z"));
    expect(built.lastVerifiedAt).toBe("2032-10-05T12:00:00.000Z");
    expect(built.modifiedAt).not.toBe(built.lastVerifiedAt);
    expect(value(view(built), "Última conferência manual")).toContain("05/10/2032");
    expect(value(view(buildProvenance(row)), "Última conferência manual")).toBe("Nenhuma conferência registrada");
  });
  it("maps the stored source and tolerates invalid dates", () => {
    expect(sourceKindOf("MANUAL_IMPORT")).toBe("JSON_IMPORT");
    expect(sourceKindOf("VERIFIED_DOCUMENT")).toBe("VERIFIED_DOCUMENT");
    expect(sourceKindOf("anything-else")).toBe("UNKNOWN");
    expect(sourceKindOf(null)).toBe("UNKNOWN");
    expect(buildProvenance({ updatedAt: new Date("invalid"), sourceAsOf: null }).modifiedAt).toBeNull();
  });
  it("zero, one and several edits all leave a coherent view", () => {
    for (const modifiedAt of [null, base.modifiedAt, "2032-10-12T18:31:59.000Z"]) {
      const v = view({ ...base, modifiedAt });
      expect(v.lines).toHaveLength(5);
      expect(v.summary.length).toBeGreaterThan(20);
    }
  });
});
