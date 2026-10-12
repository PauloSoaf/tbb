import { describe, expect, it } from "vitest";
import { localPurchaseInstant } from "../import-dates";
describe("local purchase timestamps", () => {
  it("preserves Manaus day and minute including midnight crossing in UTC", () => {
    expect(localPurchaseInstant("2032-10-08", "19:17", "America/Manaus")).toBe("2032-10-08T23:17:00.000Z");
    expect(localPurchaseInstant("2032-10-08", "22:31", "America/Manaus")).toBe("2032-10-09T02:31:00.000Z");
  });
  it("rejects invalid and ambiguous local times rather than inventing an offset", () => {
    expect(() => localPurchaseInstant("2032-02-30", "09:00", "America/Manaus")).toThrow();
    expect(() => localPurchaseInstant("2032-10-08", "24:00", "America/Manaus")).toThrow();
    expect(() => localPurchaseInstant("2026-03-08", "02:30", "America/New_York")).toThrow(/inexistente/);
    expect(() => localPurchaseInstant("2026-11-01", "01:30", "America/New_York")).toThrow(/ambíguo/);
  });
});
