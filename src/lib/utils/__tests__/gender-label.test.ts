import { describe, it, expect } from "vitest";
import { genderLabel } from "../gender-label";

describe("genderLabel", () => {
  it("returns Feminino for F", () => {
    expect(genderLabel("F")).toBe("Feminino");
  });

  it("returns Masculino for M", () => {
    expect(genderLabel("M")).toBe("Masculino");
  });

  it("returns Outro for O", () => {
    expect(genderLabel("O")).toBe("Outro");
  });

  it("returns Não informado for null", () => {
    expect(genderLabel(null)).toBe("Não informado");
  });

  it("returns Não informado for undefined", () => {
    expect(genderLabel(undefined)).toBe("Não informado");
  });

  it("returns Não informado for unknown string", () => {
    expect(genderLabel("X")).toBe("Não informado");
    expect(genderLabel("")).toBe("Não informado");
  });

  it("is case-sensitive (lowercase f is not Feminino)", () => {
    expect(genderLabel("f")).toBe("Não informado");
    expect(genderLabel("m")).toBe("Não informado");
  });
});
