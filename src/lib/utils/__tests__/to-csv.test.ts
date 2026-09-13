import { describe, it, expect } from "vitest";
import { toCsv } from "../to-csv";

describe("toCsv", () => {
  it("returns empty string for empty array", () => {
    expect(toCsv([])).toBe("");
  });

  it("produces header row from first object keys", () => {
    const result = toCsv([{ name: "Ana", age: 30 }]);
    const lines = result.split("\n");
    expect(lines[0]).toBe("name,age");
  });

  it("produces data row with correct values", () => {
    const result = toCsv([{ name: "Ana", age: 30 }]);
    const lines = result.split("\n");
    expect(lines[1]).toBe("Ana,30");
  });

  it("converts null to empty string", () => {
    const result = toCsv([{ name: "Ana", weight: null }]);
    const lines = result.split("\n");
    expect(lines[1]).toBe("Ana,");
  });

  it("converts undefined to empty string", () => {
    const result = toCsv([{ name: "Ana", weight: undefined }]);
    const lines = result.split("\n");
    expect(lines[1]).toBe("Ana,");
  });

  it("quotes values that contain a comma", () => {
    const result = toCsv([{ name: "Silva, Ana" }]);
    const lines = result.split("\n");
    expect(lines[1]).toBe('"Silva, Ana"');
  });

  it("quotes values that contain a newline", () => {
    const result = toCsv([{ notes: "linha1\nlinha2" }]);
    expect(result).toContain('"linha1\nlinha2"');
  });

  it("escapes embedded double-quotes by doubling them", () => {
    const result = toCsv([{ name: 'diz "olá"' }]);
    const lines = result.split("\n");
    expect(lines[1]).toBe('"diz ""olá"""');
  });

  it("does not quote plain values", () => {
    const result = toCsv([{ name: "Ana Silva" }]);
    const lines = result.split("\n");
    expect(lines[1]).toBe("Ana Silva");
  });

  it("handles multiple rows", () => {
    const result = toCsv([
      { name: "Ana", age: 30 },
      { name: "Bruno", age: 25 },
    ]);
    const lines = result.split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe("Ana,30");
    expect(lines[2]).toBe("Bruno,25");
  });

  it("uses keys from first row as headers (extra keys in later rows are ignored)", () => {
    const result = toCsv([
      { name: "Ana" },
      { name: "Bruno", extra: "ignored" },
    ]);
    const lines = result.split("\n");
    expect(lines[0]).toBe("name");
    expect(lines[1]).toBe("Ana");
    expect(lines[2]).toBe("Bruno");
  });
});
