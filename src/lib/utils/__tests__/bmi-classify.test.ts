import { describe, it, expect } from "vitest";
import { bmiClassify } from "../bmi-classify";

describe("bmiClassify", () => {
  it("classifies < 18.5 as Abaixo do peso", () => {
    expect(bmiClassify(16).label).toBe("Abaixo do peso");
    expect(bmiClassify(18.4).label).toBe("Abaixo do peso");
  });

  it("classifies 18.5–24.9 as Peso normal", () => {
    expect(bmiClassify(18.5).label).toBe("Peso normal");
    expect(bmiClassify(24.9).label).toBe("Peso normal");
  });

  it("classifies 25–29.9 as Sobrepeso", () => {
    expect(bmiClassify(25).label).toBe("Sobrepeso");
    expect(bmiClassify(29.9).label).toBe("Sobrepeso");
  });

  it("classifies 30–34.9 as Obesidade I", () => {
    expect(bmiClassify(30).label).toBe("Obesidade I");
    expect(bmiClassify(34.9).label).toBe("Obesidade I");
  });

  it("classifies 35–39.9 as Obesidade II", () => {
    expect(bmiClassify(35).label).toBe("Obesidade II");
    expect(bmiClassify(39.9).label).toBe("Obesidade II");
  });

  it("classifies >= 40 as Obesidade III", () => {
    expect(bmiClassify(40).label).toBe("Obesidade III");
    expect(bmiClassify(55).label).toBe("Obesidade III");
  });

  it("returns Tailwind color strings for all categories", () => {
    [16, 22, 27, 32, 37, 45].forEach((bmi) => {
      expect(bmiClassify(bmi).color).toMatch(/^text-/);
    });
  });

  it("Obesidade III has darker rose than Obesidade II", () => {
    expect(bmiClassify(37).color).toBe("text-rose-600");
    expect(bmiClassify(45).color).toBe("text-rose-700");
  });
});
