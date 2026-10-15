import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assembleSchema, schemaDrift } from "../../../scripts/assemble-schema.mjs";

describe("prisma schema fragments", () => {
  it("reproduce the committed schema.prisma, so the assembler can never erase a model", () => {
    expect(schemaDrift(assembleSchema(), readFileSync("prisma/schema.prisma", "utf8"))).toEqual([]);
  });

  it("detects a model or column that exists in only one of them", () => {
    const committed = readFileSync("prisma/schema.prisma", "utf8");
    expect(schemaDrift(assembleSchema(), committed.replace("model CardStatementPayment {", "model CardStatementPaymentX {")).length).toBeGreaterThan(0);
    expect(schemaDrift(assembleSchema(), committed.replace("amountIsOutstanding", "amountIsOutstandingX")).join("\n")).toContain("amountIsOutstanding");
  });
});
