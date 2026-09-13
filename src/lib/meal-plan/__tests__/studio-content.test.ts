import { describe, expect, it } from "vitest";
import {
  extractMealDraftsFromContentBlocks,
  replaceMealNodesInStudioDocument,
  resolveStudioContentBlocks,
  toSerializableJson,
} from "../studio-content";

describe("studio-content", () => {
  it("sanitizes editor content before sending it to server actions", () => {
    const content = {
      type: "doc",
      createdAt: new Date("2026-07-08T08:00:00.000Z"),
      skip: undefined,
      fn: () => "nope",
      content: [{ type: "paragraph", attrs: { ok: true } }],
    };

    expect(toSerializableJson(content)).toEqual({
      type: "doc",
      createdAt: "2026-07-08T08:00:00.000Z",
      content: [{ type: "paragraph", attrs: { ok: true } }],
    });
  });

  it("extracts meals and items from Tiptap meal nodes", () => {
    const content = {
      type: "doc",
      content: [
        {
          type: "meal",
          attrs: {
            id: "meal-1",
            name: "Cafe da Manha",
            time: "07:00",
            items: [
              {
                id: "temp-1",
                foodName: "Ovos",
                source: "CUSTOM",
                quantity: 3,
                unit: "unidades",
                calories: 210,
                protein: 18,
                carbs: 1,
                fat: 15,
              },
            ],
          },
        },
      ],
    };

    expect(extractMealDraftsFromContentBlocks(content)).toEqual([
      {
        id: "meal-1",
        name: "Cafe da Manha",
        time: "07:00",
        notes: null,
        imageUrl: null,
        imageAlt: null,
        imageCaption: null,
        showImageInPdf: true,
        imageWidth: 480,
        imageHeight: 270,
        imageFit: "COVER",
        imageAlignment: "CENTER",
        imageLayer: "INLINE",
        imageX: 24,
        imageY: 24,
        position: 0,
        items: [
          {
            id: undefined,
            foodName: "Ovos",
            source: "CUSTOM",
            tacoFoodId: null,
            quantity: 3,
            unit: "unidades",
            householdMeasure: null,
            householdMeasureSource: null,
            imageUrl: null,
            imageAlt: null,
            imageCaption: null,
            showImageInPdf: true,
            imageWidth: 200,
            imageHeight: 120,
            imageFit: "COVER",
            imageAlignment: "LEFT",
            imageLayer: "INLINE",
            imageX: 24,
            imageY: 24,
            imagePlacement: "SIDE",
            calories: 210,
            protein: 18,
            carbs: 1,
            fat: 15,
            fiber: null,
            sodium: null,
            notes: null,
            position: 0,
          },
        ],
      },
    ]);
  });

  it("builds studio content from persisted meals when the editor document has no meals", () => {
    const content = resolveStudioContentBlocks(null, [
      {
        id: "meal-1",
        name: "Almoco",
        time: "12:00",
        position: 0,
        items: [
          {
            id: "item-1",
            foodName: "Frango",
            source: "CUSTOM",
            quantity: 120,
            unit: "g",
            calories: 196,
            protein: 37.8,
            carbs: 0,
            fat: 3.8,
            position: 0,
          },
        ],
      },
    ]);

    expect(content).toEqual({
      type: "doc",
      content: [
        {
          type: "meal",
          attrs: {
            id: "meal-1",
            name: "Almoco",
            time: "12:00",
            notes: null,
            imageUrl: null,
            imageAlt: null,
            imageCaption: null,
            showImageInPdf: true,
            imageWidth: 480,
            imageHeight: 270,
            imageFit: "COVER",
            imageAlignment: "CENTER",
            imageLayer: "INLINE",
            imageX: 24,
            imageY: 24,
            items: [
              {
                id: "item-1",
                foodName: "Frango",
                source: "CUSTOM",
                tacoFoodId: null,
                quantity: 120,
                unit: "g",
                householdMeasure: null,
                householdMeasureSource: null,
                imageUrl: null,
                imageAlt: null,
                imageCaption: null,
                showImageInPdf: true,
                imageWidth: 200,
                imageHeight: 120,
                imageFit: "COVER",
                imageAlignment: "LEFT",
                imageLayer: "INLINE",
                imageX: 24,
                imageY: 24,
                imagePlacement: "SIDE",
                calories: 196,
                protein: 37.8,
                carbs: 0,
                fat: 3.8,
                fiber: null,
                sodium: null,
                notes: null,
                position: 0,
              },
            ],
          },
        },
      ],
    });
  });

  it("replaces old meal nodes while preserving non-meal editor content", () => {
    const content = replaceMealNodesInStudioDocument(
      {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "Orientacao" }] },
          { type: "meal", attrs: { id: "source-meal", name: "Antiga", items: [] } },
        ],
      },
      [
        {
          id: "new-meal",
          name: "Almoco",
          position: 0,
          items: [
            {
              id: "new-item",
              foodName: "Arroz",
              source: "CUSTOM",
              quantity: 100,
              unit: "g",
              calories: 128,
              protein: 2.5,
              carbs: 28,
              fat: 0.2,
              position: 0,
            },
          ],
        },
      ],
    );

    const contentNodes = Array.isArray(content.content) ? content.content : [];
    expect(contentNodes).toHaveLength(2);
    expect(contentNodes[0]).toEqual({
      type: "paragraph",
      content: [{ type: "text", text: "Orientacao" }],
    });
    expect(extractMealDraftsFromContentBlocks(content)).toEqual([
      expect.objectContaining({
        id: "new-meal",
        name: "Almoco",
        items: [expect.objectContaining({ id: "new-item", foodName: "Arroz" })],
      }),
    ]);
  });

  it("preserves structured image and household-measure metadata", () => {
    const meals = extractMealDraftsFromContentBlocks({
      type: "doc",
      content: [{
        type: "meal",
        attrs: {
          id: "meal-1",
          name: "Almoco",
          imageUrl: "https://example.com/meal.webp",
          imageAlt: "Prato de almoco",
          imageCaption: "Sugestao de montagem",
          showImageInPdf: false,
          imageWidth: 640,
          imageHeight: 360,
          imageFit: "CONTAIN",
          imageAlignment: "RIGHT",
          imageLayer: "BEHIND",
          imageX: 120,
          imageY: 80,
          items: [{
            id: "item-1",
            foodName: "Arroz",
            source: "TACO",
            tacoFoodId: "1",
            quantity: 100,
            unit: "g",
            householdMeasure: "3 colheres de sopa",
            householdMeasureSource: "MANUAL",
            imageUrl: "https://example.com/rice.webp",
            imageAlt: "Arroz integral cozido",
            imageCaption: "Opcional",
            showImageInPdf: true,
            imageWidth: 200,
            imageHeight: 120,
            imageFit: "COVER",
            imageAlignment: "LEFT",
            imageLayer: "FRONT",
            imageX: 36,
            imageY: 48,
            calories: 128,
            protein: 2.5,
            carbs: 28,
            fat: 0.2,
          }],
        },
      }],
    });

    expect(meals[0]).toEqual(expect.objectContaining({
      imageUrl: "https://example.com/meal.webp",
      imageAlt: "Prato de almoco",
      imageCaption: "Sugestao de montagem",
      showImageInPdf: false,
      imageWidth: 640,
      imageHeight: 360,
      imageFit: "CONTAIN",
      imageAlignment: "RIGHT",
      imageLayer: "BEHIND",
      imageX: 120,
      imageY: 80,
    }));
    expect(meals[0].items[0]).toEqual(expect.objectContaining({
      householdMeasure: "3 colheres de sopa",
      householdMeasureSource: "MANUAL",
      imageUrl: "https://example.com/rice.webp",
      imageAlt: "Arroz integral cozido",
      imageCaption: "Opcional",
      showImageInPdf: true,
      imageWidth: 200,
      imageHeight: 120,
      imageFit: "COVER",
      imageAlignment: "LEFT",
      imageLayer: "FRONT",
      imageX: 36,
      imageY: 48,
      imagePlacement: "SIDE",
    }));
  });
});
