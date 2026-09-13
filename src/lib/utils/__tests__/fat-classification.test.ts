import { describe, it, expect } from "vitest";
import { fatClassify } from "../fat-classification";

describe("fatClassify", () => {
  describe("Feminino (F)", () => {
    it("classifies < 14% as Abaixo do ideal", () => {
      expect(fatClassify(10, "F").label).toBe("Abaixo do ideal");
      expect(fatClassify(13.9, "F").label).toBe("Abaixo do ideal");
    });

    it("classifies 14–20% as Atlética", () => {
      expect(fatClassify(14, "F").label).toBe("Atlética");
      expect(fatClassify(20, "F").label).toBe("Atlética");
    });

    it("classifies 21–24% as Boa condição", () => {
      expect(fatClassify(21, "F").label).toBe("Boa condição");
      expect(fatClassify(24, "F").label).toBe("Boa condição");
    });

    it("classifies 25–31% as Acima do ideal", () => {
      expect(fatClassify(25, "F").label).toBe("Acima do ideal");
      expect(fatClassify(31, "F").label).toBe("Acima do ideal");
    });

    it("classifies > 31% as Obesidade", () => {
      expect(fatClassify(32, "F").label).toBe("Obesidade");
      expect(fatClassify(45, "F").label).toBe("Obesidade");
    });
  });

  describe("Masculino (M)", () => {
    it("classifies < 6% as Abaixo do ideal", () => {
      expect(fatClassify(4, "M").label).toBe("Abaixo do ideal");
      expect(fatClassify(5.9, "M").label).toBe("Abaixo do ideal");
    });

    it("classifies 6–13% as Atlético", () => {
      expect(fatClassify(6, "M").label).toBe("Atlético");
      expect(fatClassify(13, "M").label).toBe("Atlético");
    });

    it("classifies 14–17% as Boa condição", () => {
      expect(fatClassify(14, "M").label).toBe("Boa condição");
      expect(fatClassify(17, "M").label).toBe("Boa condição");
    });

    it("classifies 18–24% as Acima do ideal", () => {
      expect(fatClassify(18, "M").label).toBe("Acima do ideal");
      expect(fatClassify(24, "M").label).toBe("Acima do ideal");
    });

    it("classifies > 24% as Obesidade", () => {
      expect(fatClassify(25, "M").label).toBe("Obesidade");
      expect(fatClassify(40, "M").label).toBe("Obesidade");
    });
  });

  it("null gender defaults to male thresholds", () => {
    expect(fatClassify(8, null).label).toBe("Atlético");
    expect(fatClassify(15, null).label).toBe("Boa condição");
  });

  it("unknown gender defaults to male thresholds", () => {
    expect(fatClassify(8, "X").label).toBe("Atlético");
  });

  it("M and F have different thresholds for the same % value", () => {
    const female14 = fatClassify(14, "F");
    const male14 = fatClassify(14, "M");
    expect(female14.label).toBe("Atlética");
    expect(male14.label).toBe("Boa condição");
  });

  it("returns a color string for all categories", () => {
    [fatClassify(10, "F"), fatClassify(17, "F"), fatClassify(22, "F"), fatClassify(28, "F"), fatClassify(35, "F")].forEach(
      (r) => expect(r.color).toBeTruthy()
    );
  });
});
