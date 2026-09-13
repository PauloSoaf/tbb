import { describe, it, expect } from "vitest";
import { classifyBMI } from "@/lib/utils/classifyBMI";

describe("classifyBMI", () => {
  it("returns 'Não calculado' for null", () => {
    const result = classifyBMI(null);
    expect(result.label).toBe("Não calculado");
    expect(result.color).toBe("gray");
  });

  it("returns 'Abaixo do peso' for BMI < 18.5", () => {
    expect(classifyBMI(17).label).toBe("Abaixo do peso");
    expect(classifyBMI(18.4).label).toBe("Abaixo do peso");
  });

  it("returns 'Peso normal' for 18.5–24.9", () => {
    expect(classifyBMI(18.5).label).toBe("Peso normal");
    expect(classifyBMI(22).label).toBe("Peso normal");
    expect(classifyBMI(24.9).label).toBe("Peso normal");
  });

  it("returns 'Sobrepeso' for 25–29.9", () => {
    expect(classifyBMI(25).label).toBe("Sobrepeso");
    expect(classifyBMI(29.9).label).toBe("Sobrepeso");
  });

  it("returns 'Obesidade grau I' for 30–34.9", () => {
    expect(classifyBMI(30).label).toBe("Obesidade grau I");
    expect(classifyBMI(34.9).label).toBe("Obesidade grau I");
  });

  it("returns 'Obesidade grau II' for 35–39.9", () => {
    expect(classifyBMI(35).label).toBe("Obesidade grau II");
  });

  it("returns 'Obesidade grau III' for >= 40", () => {
    expect(classifyBMI(40).label).toBe("Obesidade grau III");
    expect(classifyBMI(55).label).toBe("Obesidade grau III");
  });
});
