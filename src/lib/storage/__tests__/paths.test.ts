import { describe, expect, it } from "vitest";
import { resolveStoragePath } from "../local-storage.provider";
describe("private storage key containment", () => {
  it("resolves internal keys inside the private storage root", () => {
    expect(resolveStoragePath("/tmp/tbb-storage-test", "workspace1/file1")).toBe("/tmp/tbb-storage-test/workspace1/file1");
  });
  it.each(["../secret", "workspace/../../secret", "/etc/passwd", "workspace/a/b", "workspace/%2e%2e", "workspace/file.txt"])("rejects unsafe provider key %s", (key) => {
    expect(() => resolveStoragePath("/tmp/tbb-storage-test", key)).toThrow();
  });
});
