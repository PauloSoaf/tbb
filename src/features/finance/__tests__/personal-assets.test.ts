import { describe, expect, it } from "vitest";
import { netWorthWithPersonalAssets, parsePersonalAsset } from "../personal-assets";

function form(fields: Record<string, string> = {}) {
  const fd = new FormData();
  for (const [key, value] of Object.entries({ name: "Synthetic vehicle", kind: "VEHICLE", value: "1.234,56", valuationDate: "2032-01-10", ...fields })) fd.set(key, value);
  return fd;
}
describe("personal asset valuations", () => {
  it("uses exact cents and optional purchase information without assuming a bank movement", () => {
    expect(parsePersonalAsset(form({ purchaseValue: "2.000,01", purchaseDate: "2031-12-20", debtId: "loan" }), "2032-01-10")).toEqual({
      name: "Synthetic vehicle", kind: "VEHICLE", valueCents: 123456, valuationDate: new Date("2032-01-10"), purchaseValueCents: 200001, purchaseDate: new Date("2031-12-20"), notes: null, debtId: "loan",
    });
  });
  it("allows a zero resale value and distinguishes missing purchase cost from zero", () => {
    expect(parsePersonalAsset(form({ value: "0", purchaseValue: "0" }), "2032-01-10")).toMatchObject({ valueCents: 0, purchaseValueCents: 0 });
    expect(parsePersonalAsset(form(), "2032-01-10").purchaseValueCents).toBeNull();
  });
  it.each<Record<string, string>>([
    { value: "" }, { value: "-1" }, { value: "1,2345" }, { value: "21474836,48" }, { kind: "INVALID" },
    { name: " " }, { name: "x".repeat(201) }, { notes: "x".repeat(1001) }, { valuationDate: "2032-02-30" },
    { valuationDate: "2032-01-11" }, { purchaseDate: "2032-01-11" }, { purchaseDate: "2032-01-09", valuationDate: "2032-01-08" },
  ])("rejects invalid input before any persistence: %j", fields => {
    expect(() => parsePersonalAsset(form(fields), "2032-01-10")).toThrow();
  });
  it("adds active resale values to financial wealth, which already includes debts", () => {
    expect(netWorthWithPersonalAssets(-5000, [{ valueCents: 20000, archivedAt: null }, { valueCents: 8000, archivedAt: "2032-01-10" }])).toEqual({ financialNetWorthCents: -5000, personalAssetsCents: 20000, netWorthCents: 15000 });
  });
});
