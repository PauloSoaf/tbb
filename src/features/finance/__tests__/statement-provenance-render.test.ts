import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StatementProvenanceTooltip } from "../StatementProvenanceTooltip";
import { describeProvenance, type StatementProvenance } from "../statement-provenance";

const provenance: StatementProvenance = { createdAt: "2032-10-01T15:00:00.000Z", modifiedAt: "2032-10-12T18:30:00.000Z", bankAsOfDate: "2032-09-24", sourceKind: "VERIFIED_DOCUMENT", lastVerifiedAt: null };
const view = (p: StatementProvenance, status: "OPEN" | "PAID" = "OPEN") => describeProvenance(p, { timeZone: "America/Manaus", today: "2032-10-12", now: new Date("2032-10-12T18:32:00.000Z"), status });
const render = (v: ReturnType<typeof view>, subject = "Cartão sintético") => renderToStaticMarkup(createElement(StatementProvenanceTooltip, { view: v, subject }));

describe("F04 · the provenance icon", () => {
  it("is a keyboard-reachable button whose accessible name carries both dates", () => {
    const html = render(view(provenance));
    expect(html).toContain("<button");
    expect(html).toContain('type="button"');
    expect(html).toContain("Procedência dos dados de Cartão sintético");
    expect(html).toContain("Alterada no TBB em 12/10/2032, 14:30 (GMT-4)");
    expect(html).toContain("Informação bancária até 24/09/2032");
    expect(html).not.toContain("data-stale");
  });

  it("is marked and named as unconfirmed when the bank data is old", () => {
    const html = render(view({ ...provenance, bankAsOfDate: "2032-07-01" }));
    expect(html).toContain('data-stale="true"');
    expect(html).toContain("Dados sem confirmação recente");
  });

  it("does not render tooltip text until it is opened, so the page never carries hidden duplicates", () => {
    expect(render(view(provenance))).not.toContain("role=\"tooltip\"");
  });
});
