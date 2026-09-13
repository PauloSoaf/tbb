import { describe, expect, it } from "vitest";
import { getDefaultTranslation, interpolateMessage } from "../translate";

describe("i18n interpolation", () => {
  it("replaces double-brace placeholders", () => {
    expect(interpolateMessage("{{count}} anos", { count: 33 })).toBe("33 anos");
  });

  it("replaces single-brace placeholders used by some UI strings", () => {
    expect(interpolateMessage("Paciente {name}", { name: "Ana" })).toBe("Paciente Ana");
  });

  it("ignores defaultValue as a placeholder param", () => {
    expect(interpolateMessage("{{count}} anos", { count: 41, defaultValue: "fallback" })).toBe("41 anos");
  });

  it("reads defaultValue when a translation key is missing", () => {
    expect(getDefaultTranslation({ defaultValue: "Valor {count}", count: 2 })).toBe("Valor {count}");
  });
});
