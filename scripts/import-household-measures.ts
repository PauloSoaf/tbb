import { PrismaClient } from "@prisma/client";
import measures from "../src/data/household-measures/common-measures.json";
import mappings from "../src/data/household-measures/food-measure-mappings.json";
import { normalizeHouseholdFoodName } from "../src/lib/utils/household-measures";

const prisma = new PrismaClient();
const db = prisma as unknown as HouseholdMeasureDb;
const measureSeeds = measures as MeasureSeed[];
const mappingSeeds = mappings as MappingSeed[];

type MeasureSeed = {
  id: string;
  key?: string;
  type: string;
  size: string;
  namePt: string;
  nameEn?: string;
  nameEs?: string;
  abbreviationPt?: string;
  abbreviationEn?: string;
  abbreviationEs?: string;
  defaultVolumeMl?: number | null;
};

type MappingSeed = {
  foodName: string;
  tacoFoodId: string | null;
  measureId?: string;
  measureKey?: string;
  quantity?: number;
  labelPt?: string;
  labelEn?: string;
  labelEs?: string;
  grams: number;
  minGrams?: number;
  maxGrams?: number;
  source: string;
  sourceName?: string;
  sourceUrl?: string;
  sourceNotes?: string;
  confidence: string;
  isVerified: boolean;
  isDefault?: boolean;
  notes?: string;
};

type HouseholdMeasureDb = {
  householdMeasure: {
    findFirst: (args: { where: Record<string, unknown>; select: { id: true } }) => Promise<{ id: string } | null>;
    update: (args: { where: { id: string }; data: Record<string, unknown>; select?: { id: true } }) => Promise<{ id: string }>;
    create: (args: { data: Record<string, unknown>; select?: { id: true } }) => Promise<{ id: string }>;
  };
  foodHouseholdMeasure: {
    findFirst: (args: { where: Record<string, unknown>; select: { id: true } }) => Promise<{ id: string } | null>;
    update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown>;
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
  };
};

async function main() {
  const measureIdBySeedId = new Map<string, string>();

  for (const measure of measureSeeds) {
    const seedKey = measure.key ?? measure.id;
    const existing = await db.householdMeasure.findFirst({
      where: {
        type: measure.type,
        size: measure.size,
        namePt: measure.namePt,
      },
      select: { id: true },
    });

    const saved = existing
      ? await db.householdMeasure.update({
          where: { id: existing.id },
          data: {
            nameEn: measure.nameEn ?? null,
            nameEs: measure.nameEs ?? null,
            abbreviationPt: measure.abbreviationPt ?? null,
            abbreviationEn: measure.abbreviationEn ?? null,
            abbreviationEs: measure.abbreviationEs ?? null,
            defaultVolumeMl: measure.defaultVolumeMl ?? null,
          },
          select: { id: true },
        })
      : await db.householdMeasure.create({
          data: {
            type: measure.type,
            size: measure.size,
            namePt: measure.namePt,
            nameEn: measure.nameEn ?? null,
            nameEs: measure.nameEs ?? null,
            abbreviationPt: measure.abbreviationPt ?? null,
            abbreviationEn: measure.abbreviationEn ?? null,
            abbreviationEs: measure.abbreviationEs ?? null,
            defaultVolumeMl: measure.defaultVolumeMl ?? null,
          },
          select: { id: true },
        });

    measureIdBySeedId.set(measure.id, saved.id);
    measureIdBySeedId.set(seedKey, saved.id);
  }

  let imported = 0;

  for (const mapping of mappingSeeds) {
    const measureRef = mapping.measureKey ?? mapping.measureId ?? "";
    const householdMeasureId = measureIdBySeedId.get(measureRef);
    if (!householdMeasureId) {
      console.warn(`Skipping ${mapping.foodName}: measure ${measureRef} not found`);
      continue;
    }

    const normalizedFoodName = normalizeHouseholdFoodName(mapping.foodName);
    const existing = await db.foodHouseholdMeasure.findFirst({
      where: {
        normalizedFoodName,
        householdMeasureId,
        tacoFoodId: mapping.tacoFoodId ?? null,
        createdByNutritionistId: null,
      },
      select: { id: true },
    });

    const data = {
      tacoFoodId: mapping.tacoFoodId ?? null,
      tacoFoodName: mapping.foodName,
      normalizedFoodName,
      householdMeasureId,
      grams: mapping.grams,
      minGrams: mapping.minGrams ?? null,
      maxGrams: mapping.maxGrams ?? null,
      quantity: mapping.quantity ?? 1,
      labelPt: mapping.labelPt ?? null,
      labelEn: mapping.labelEn ?? null,
      labelEs: mapping.labelEs ?? null,
      source: mapping.source,
      sourceName: mapping.sourceName ?? null,
      sourceUrl: mapping.sourceUrl ?? null,
      sourceNotes: mapping.sourceNotes ?? mapping.notes ?? null,
      confidence: mapping.confidence,
      isVerified: mapping.isVerified,
      isDefault: mapping.isDefault ?? false,
    };

    if (existing) {
      await db.foodHouseholdMeasure.update({ where: { id: existing.id }, data });
    } else {
      await db.foodHouseholdMeasure.create({ data });
    }

    imported++;
  }

  console.log(`Imported ${measureSeeds.length} household measures and ${imported} food mappings.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
