import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { resolveLocalUploadPath } from "../route";

describe("resolveLocalUploadPath", () => {
  it("resolves files only inside public/uploads", () => {
    expect(resolveLocalUploadPath(["meal-plans", "plan-1", "image.png"])).toBe(
      resolve(process.cwd(), "public", "uploads", "meal-plans", "plan-1", "image.png"),
    );
  });

  it("rejects path traversal", () => {
    expect(resolveLocalUploadPath(["..", "..", ".env"])).toBeNull();
  });
});
