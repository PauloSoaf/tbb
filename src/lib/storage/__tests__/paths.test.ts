import { describe, expect, it } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveStoragePath } from "../local-storage.provider";
const storageRoot=join(tmpdir(),"tbb-storage-test");
describe("private storage key containment", () => {
  it("resolves internal keys inside the private storage root", () => {
    expect(resolveStoragePath(storageRoot, "workspace1/file1")).toBe(join(storageRoot,"workspace1","file1"));
  });
  it.each(["../secret", "workspace/../../secret", "/etc/passwd", "workspace/a/b", "workspace/%2e%2e", "workspace/file.txt"])("rejects unsafe provider key %s", (key) => {
    expect(() => resolveStoragePath(storageRoot, key)).toThrow();
  });
});
