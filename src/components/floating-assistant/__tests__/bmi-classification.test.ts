import { describe, expect, it } from "vitest";
import { classifyBmi } from "../bmi-classification";

describe("classifyBmi", () => {
  it("classifies below 18.5 as Baixo peso", () => {
    expect(classifyBmi(17.0)).toEqual({ label: "Baixo peso", cls: "low" });
    expect(classifyBmi(18.4)).toEqual({ label: "Baixo peso", cls: "low" });
  });

  it("classifies 18.5–24.9 as Eutrofia", () => {
    expect(classifyBmi(18.5)).toEqual({ label: "Eutrofia", cls: "normal" });
    expect(classifyBmi(22.0)).toEqual({ label: "Eutrofia", cls: "normal" });
    expect(classifyBmi(24.9)).toEqual({ label: "Eutrofia", cls: "normal" });
  });

  it("classifies 25–29.9 as Sobrepeso", () => {
    expect(classifyBmi(25.0)).toEqual({ label: "Sobrepeso", cls: "overweight" });
    expect(classifyBmi(28.5)).toEqual({ label: "Sobrepeso", cls: "overweight" });
  });

  it("classifies 30–34.9 as Obesidade Grau I", () => {
    expect(classifyBmi(30.0)).toEqual({ label: "Obesidade Grau I", cls: "obese1" });
    expect(classifyBmi(34.9)).toEqual({ label: "Obesidade Grau I", cls: "obese1" });
  });

  it("classifies 35–39.9 as Obesidade Grau II", () => {
    expect(classifyBmi(35.0)).toEqual({ label: "Obesidade Grau II", cls: "obese2" });
    expect(classifyBmi(39.9)).toEqual({ label: "Obesidade Grau II", cls: "obese2" });
  });

  it("classifies 40+ as Obesidade Grau III", () => {
    expect(classifyBmi(40.0)).toEqual({ label: "Obesidade Grau III", cls: "obese3" });
    expect(classifyBmi(55.0)).toEqual({ label: "Obesidade Grau III", cls: "obese3" });
  });
});
