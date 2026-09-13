import { describe, it, expect } from "vitest";
import { parseSmartPasteText } from "../smart-paste-parser";

describe("parseSmartPasteText", () => {
  describe("meal header detection", () => {
    it("detects line ending with ':' as header", () => {
      const result = parseSmartPasteText("Café da manhã:\n- 1 banana");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Café da manhã");
    });

    it("detects line containing time as header", () => {
      const result = parseSmartPasteText("Almoço 12:00\n- 100g frango");
      expect(result).toHaveLength(1);
      expect(result[0].time).toBe("12:00");
    });

    it("strips time from meal name", () => {
      const result = parseSmartPasteText("Café da manhã 07:30:\n- 1 banana");
      expect(result[0].name).toBe("Café da manhã");
      expect(result[0].time).toBe("07:30");
    });

    it("parses multiple meals", () => {
      const text = "Café:\n- 1 banana\nAlmoço:\n- 100g arroz";
      const result = parseSmartPasteText(text);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Café");
      expect(result[1].name).toBe("Almoço");
    });

    it("uses 'Refeição' as fallback name when header has only time", () => {
      const result = parseSmartPasteText("08:00\n- 1 banana");
      expect(result[0].name).toBe("Refeição");
    });
  });

  describe("food item parsing", () => {
    it("parses '-' prefixed items", () => {
      const result = parseSmartPasteText("Café:\n- 100g frango");
      expect(result[0].items).toHaveLength(1);
      expect(result[0].items[0].foodName).toBe("frango");
    });

    it("parses '*' prefixed items", () => {
      const result = parseSmartPasteText("Café:\n* 100g frango");
      expect(result[0].items[0].foodName).toBe("frango");
    });

    it("parses '•' prefixed items", () => {
      const result = parseSmartPasteText("Café:\n• 100g frango");
      expect(result[0].items[0].foodName).toBe("frango");
    });
  });

  describe("quantity and unit extraction", () => {
    it("extracts integer quantity and 'g' unit", () => {
      const result = parseSmartPasteText("Almoço:\n- 120g frango grelhado");
      const item = result[0].items[0];
      expect(item.quantity).toBe(120);
      expect(item.unit).toBe("g");
      expect(item.foodName).toBe("frango grelhado");
    });

    it("extracts decimal quantity with comma (pt-BR)", () => {
      const result = parseSmartPasteText("Jantar:\n- 1,5 fatia pão");
      const item = result[0].items[0];
      expect(item.quantity).toBe(1.5);
    });

    it("extracts ml unit", () => {
      const result = parseSmartPasteText("Café:\n- 200ml leite");
      expect(result[0].items[0].unit).toBe("ml");
    });

    it("extracts 'fatia' unit", () => {
      const result = parseSmartPasteText("Café:\n- 2 fatia pão integral");
      const item = result[0].items[0];
      expect(item.quantity).toBe(2);
      expect(item.unit).toBe("fatia");
    });

    it("defaults to qty=1, unit='unid' when no quantity present", () => {
      const result = parseSmartPasteText("Café:\n- café sem açúcar");
      const item = result[0].items[0];
      expect(item.quantity).toBe(1);
      expect(item.unit).toBe("unid");
      expect(item.foodName).toBe("café sem açúcar");
    });
  });

  describe("notes capture", () => {
    it("appends non-item, non-header lines as notes", () => {
      const result = parseSmartPasteText("Café:\n- 1 banana\nobservação importante");
      expect(result[0].notes).toBe("observação importante");
    });

    it("concatenates multiple note lines with space", () => {
      const result = parseSmartPasteText("Café:\n- 1 banana\nnota1\nnota2");
      expect(result[0].notes).toBe("nota1 nota2");
    });
  });

  describe("filtering and edge cases", () => {
    it("excludes meals with no items and no name", () => {
      const result = parseSmartPasteText("");
      expect(result).toHaveLength(0);
    });

    it("handles blank lines between meals", () => {
      const text = "Café:\n- 1 banana\n\nAlmoço:\n- 100g arroz";
      const result = parseSmartPasteText(text);
      expect(result).toHaveLength(2);
    });

    it("assigns items to the correct meal", () => {
      const text = "Café:\n- 1 ovo\nAlmoço:\n- 100g arroz\n- 120g frango";
      const result = parseSmartPasteText(text);
      expect(result[0].items).toHaveLength(1);
      expect(result[1].items).toHaveLength(2);
    });

    it("ignores lines before first header", () => {
      const text = "texto solto\nCafé:\n- 1 banana";
      const result = parseSmartPasteText(text);
      expect(result).toHaveLength(1);
    });
  });
});
