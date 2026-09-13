import { describe, it, expect } from "vitest";
import { getRCQRisk, getWaistRisk } from "../clinical-risk";

describe("getRCQRisk", () => {
  describe("Feminino", () => {
    it("classifies RCQ < 0.71 as Baixo risco", () => {
      expect(getRCQRisk(0.65, "F").label).toBe("Baixo risco");
      expect(getRCQRisk(0.70, "F").label).toBe("Baixo risco");
    });

    it("classifies 0.71–0.77 as Risco moderado", () => {
      expect(getRCQRisk(0.71, "F").label).toBe("Risco moderado");
      expect(getRCQRisk(0.77, "F").label).toBe("Risco moderado");
    });

    it("classifies 0.78–0.81 as Alto risco", () => {
      expect(getRCQRisk(0.78, "F").label).toBe("Alto risco");
      expect(getRCQRisk(0.81, "F").label).toBe("Alto risco");
    });

    it("classifies >= 0.82 as Muito alto risco", () => {
      expect(getRCQRisk(0.82, "F").label).toBe("Muito alto risco");
      expect(getRCQRisk(0.95, "F").label).toBe("Muito alto risco");
    });
  });

  describe("Masculino", () => {
    it("classifies RCQ < 0.82 as Baixo risco", () => {
      expect(getRCQRisk(0.75, "M").label).toBe("Baixo risco");
      expect(getRCQRisk(0.81, "M").label).toBe("Baixo risco");
    });

    it("classifies 0.82–0.87 as Risco moderado", () => {
      expect(getRCQRisk(0.82, "M").label).toBe("Risco moderado");
      expect(getRCQRisk(0.87, "M").label).toBe("Risco moderado");
    });

    it("classifies 0.88–0.94 as Alto risco", () => {
      expect(getRCQRisk(0.88, "M").label).toBe("Alto risco");
      expect(getRCQRisk(0.94, "M").label).toBe("Alto risco");
    });

    it("classifies >= 0.95 as Muito alto risco", () => {
      expect(getRCQRisk(0.95, "M").label).toBe("Muito alto risco");
      expect(getRCQRisk(1.10, "M").label).toBe("Muito alto risco");
    });
  });

  it("M and F have different thresholds for the same value", () => {
    const maleBorder = getRCQRisk(0.71, "M");
    const femaleBorder = getRCQRisk(0.71, "F");
    expect(maleBorder.label).toBe("Baixo risco");
    expect(femaleBorder.label).toBe("Risco moderado");
  });

  it("returns a color for every classification", () => {
    const labels = [0.65, 0.74, 0.80, 0.90].map((v) => getRCQRisk(v, "F").color);
    labels.forEach((color) => expect(color).toBeTruthy());
  });
});

describe("getWaistRisk", () => {
  describe("Feminino", () => {
    it("classifies waist < 80 as Sem risco aumentado", () => {
      expect(getWaistRisk(79, "F").label).toBe("Sem risco aumentado");
      expect(getWaistRisk(70, "F").label).toBe("Sem risco aumentado");
    });

    it("classifies 80–87 as Risco aumentado", () => {
      expect(getWaistRisk(80, "F").label).toBe("Risco aumentado");
      expect(getWaistRisk(87, "F").label).toBe("Risco aumentado");
    });

    it("classifies >= 88 as Risco muito aumentado", () => {
      expect(getWaistRisk(88, "F").label).toBe("Risco muito aumentado");
      expect(getWaistRisk(100, "F").label).toBe("Risco muito aumentado");
    });

    it("detail mentions OMS cutoff for women", () => {
      expect(getWaistRisk(70, "F").detail).toContain("80 cm");
    });
  });

  describe("Masculino", () => {
    it("classifies waist < 94 as Sem risco aumentado", () => {
      expect(getWaistRisk(90, "M").label).toBe("Sem risco aumentado");
      expect(getWaistRisk(93, "M").label).toBe("Sem risco aumentado");
    });

    it("classifies 94–101 as Risco aumentado", () => {
      expect(getWaistRisk(94, "M").label).toBe("Risco aumentado");
      expect(getWaistRisk(101, "M").label).toBe("Risco aumentado");
    });

    it("classifies >= 102 as Risco muito aumentado", () => {
      expect(getWaistRisk(102, "M").label).toBe("Risco muito aumentado");
      expect(getWaistRisk(120, "M").label).toBe("Risco muito aumentado");
    });

    it("detail mentions OMS cutoff for men", () => {
      expect(getWaistRisk(90, "M").detail).toContain("94 cm");
    });
  });

  it("M and F have different cutoffs for the same waist measurement", () => {
    const female = getWaistRisk(80, "F");
    const male = getWaistRisk(80, "M");
    expect(female.label).toBe("Risco aumentado");
    expect(male.label).toBe("Sem risco aumentado");
  });
});
