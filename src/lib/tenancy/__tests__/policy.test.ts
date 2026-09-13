import { describe, expect, it } from "vitest";
import { resolvePermission, roleAllows } from "../policy";
describe("workspace authorization policy", () => {
  it("allows member changes and restricts viewers to reading", () => {
    expect(roleAllows("MEMBER", "WRITE")).toBe(true);
    expect(roleAllows("VIEWER", "READ")).toBe(true);
    expect(roleAllows("VIEWER", "tasks.view")).toBe(true);
    expect(roleAllows("VIEWER", "tasks.edit")).toBe(false);
    expect(roleAllows("VIEWER", "WRITE")).toBe(false);
  });
  it("does not let ordinary members manage permissions or billing", () => {
    expect(roleAllows("MEMBER", "permissions.manage")).toBe(false);
    expect(roleAllows("MEMBER", "billing.edit")).toBe(false);
    expect(roleAllows("ADMIN", "permissions.manage")).toBe(true);
  });
  it("applies explicit role denial followed by individual override", () => {
    expect(resolvePermission(true, false)).toBe(false);
    expect(resolvePermission(true, true, "DENY")).toBe(false);
    expect(resolvePermission(false, false, "ALLOW")).toBe(true);
  });
});
