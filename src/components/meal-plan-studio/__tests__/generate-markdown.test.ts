import { describe, it, expect } from "vitest";
import { generateMarkdown } from "../generate-markdown";

const baseItem = {
  foodName: "Frango grelhado",
  source: "TACO" as const,
  quantity: 120,
  unit: "g",
  calories: 180,
  protein: 36,
  carbs: 0,
  fat: 4,
};

const basePlan = {
  title: "Plano Emagrecimento",
  meals: [
    {
      name: "Almoço",
      time: "12:00",
      notes: "",
      items: [baseItem],
    },
  ],
};

describe("generateMarkdown", () => {
  it("starts with H1 plan title", () => {
    const md = generateMarkdown(basePlan);
    expect(md).toContain("# Plano Emagrecimento");
  });

  it("includes meal name as H2", () => {
    const md = generateMarkdown(basePlan);
    expect(md).toContain("## Almoço");
  });

  it("includes meal time in parentheses", () => {
    const md = generateMarkdown(basePlan);
    expect(md).toContain("## Almoço (12:00)");
  });

  it("omits time when not provided", () => {
    const plan = { ...basePlan, meals: [{ name: "Café", items: [baseItem] }] };
    const md = generateMarkdown(plan);
    expect(md).toContain("## Café\n");
    expect(md).not.toContain("## Café (");
  });

  it("includes food item with quantity, unit, name and macros", () => {
    const md = generateMarkdown(basePlan);
    expect(md).toContain("- 120g Frango grelhado — 180kcal (C:0g P:36g G:4g)");
  });

  it("includes totals blockquote line", () => {
    const md = generateMarkdown(basePlan);
    expect(md).toContain("> Total: 180kcal · Carb:0g · Prot:36g · Gord:4g");
  });

  it("includes objective when provided", () => {
    const plan = { ...basePlan, objective: "Perda de peso" };
    const md = generateMarkdown(plan);
    expect(md).toContain("**Objetivo:** Perda de peso");
  });

  it("omits objective when null", () => {
    const md = generateMarkdown({ ...basePlan, objective: null });
    expect(md).not.toContain("Objetivo");
  });

  it("includes patient name when provided", () => {
    const plan = { ...basePlan, patient: { name: "Ana Silva" } };
    const md = generateMarkdown(plan);
    expect(md).toContain("**Paciente:** Ana Silva");
  });

  it("includes meal notes in italic", () => {
    const plan = {
      ...basePlan,
      meals: [{ name: "Almoço", time: "12:00", notes: "sem sal", items: [baseItem] }],
    };
    const md = generateMarkdown(plan);
    expect(md).toContain("_sem sal_");
  });

  it("includes observations section when plan.notes is set", () => {
    const plan = { ...basePlan, notes: "Beber 2L de água" };
    const md = generateMarkdown(plan);
    expect(md).toContain("**Observações:** Beber 2L de água");
  });

  it("handles meals with no items (empty totals)", () => {
    const plan = { ...basePlan, meals: [{ name: "Jantar", items: [] }] };
    const md = generateMarkdown(plan);
    expect(md).toContain("## Jantar");
    expect(md).toContain("> Total: 0kcal");
  });

  it("handles multiple meals", () => {
    const plan = {
      ...basePlan,
      meals: [
        { name: "Café", items: [baseItem] },
        { name: "Almoço", items: [baseItem] },
      ],
    };
    const md = generateMarkdown(plan);
    expect(md).toContain("## Café");
    expect(md).toContain("## Almoço");
  });
});
