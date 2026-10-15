import { describe, expect, it } from "vitest";
import { fitLabels } from "../chart-labels";

describe("chart axis labels", () => {
  it("keeps names that fit and ends longer ones in an ellipsis within the room available", () => {
    expect(fitLabels(["Quitar agora", "Parcelar a fatura inteira"], 18)).toEqual(["Quitar agora", "Parcelar a fatura…"]);
    expect(fitLabels(["Empréstimo pessoal"], 9)).toEqual(["Emprésti…"]);
    for (const label of fitLabels(["Um nome bem comprido para caber"], 10)) expect(Array.from(label).length).toBeLessThanOrEqual(10);
  });
  it("never gives two bars the same label, even when they are cut to the same text or typed the same", () => {
    const labels = fitLabels(["Empréstimo banco A", "Empréstimo banco B", "Empréstimo banco C"], 12);
    expect(new Set(labels).size).toBe(3);
    expect(labels).toEqual(["Empréstimo…", "Empréstimo… 2", "Empréstimo… 3"]); // the space before the cut is dropped, the copies are numbered
    expect(new Set(fitLabels(["Cenário", "Cenário", "Cenário"], 18)).size).toBe(3);
  });
  it("labels a blank name with a dash instead of an invisible bar", () => {
    expect(fitLabels(["", "   "], 10)).toEqual(["—", "— 2"]);
  });
  it("never cuts an emoji in half, and never goes below two characters", () => {
    expect(fitLabels(["😀😀😀😀😀😀"], 4)).toEqual(["😀😀😀…"]);
    expect(fitLabels(["abcdef"], 0)).toEqual(["a…"]);
    expect(fitLabels(["abcdef"], 1.9)).toEqual(["a…"]);
  });
  it("does not change the order or the number of labels", () => {
    expect(fitLabels([], 10)).toEqual([]);
    expect(fitLabels(["b", "a"], 10)).toEqual(["b", "a"]);
  });
});
