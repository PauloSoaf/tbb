import { describe, expect, it } from "vitest";
import { getFloatingTools } from "../FloatingToolsLauncher";

describe("getFloatingTools", () => {
  it("lists quick tools with tenant-safe hrefs", () => {
    const tools = getFloatingTools("teste");

    expect(tools.length).toBeGreaterThan(6);
    expect(tools.every((tool) => !tool.href || tool.href.startsWith("/dashboard/teste"))).toBe(true);
    expect(tools.some((tool) => tool.floating === "taco")).toBe(true);
    expect(tools.some((tool) => tool.floating === "bmi")).toBe(true);
    expect(tools.some((tool) => tool.floating === "tmb")).toBe(true);
  });

  it("includes all 5 floating tool IDs", () => {
    const tools = getFloatingTools("teste");
    const floatingIds = tools.map((t) => t.floating).filter(Boolean);
    expect(floatingIds).toContain("taco");
    expect(floatingIds).toContain("bmi");
    expect(floatingIds).toContain("macros");
    expect(floatingIds).toContain("water");
    expect(floatingIds).toContain("tmb");
  });
});
