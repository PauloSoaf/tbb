export const MEAL_PLAN_LOGO_POSITIONS = ["LEFT", "CENTER", "RIGHT"] as const;
export const MEAL_PLAN_LOGO_SIZES = ["SM", "MD", "LG"] as const;
export const MEAL_PLAN_WATERMARK_TYPES = ["TEXT", "IMAGE"] as const;
export const MEAL_PLAN_WATERMARK_POSITIONS = ["CENTER", "DIAGONAL", "FOOTER", "CORNER"] as const;
export const MEAL_PLAN_PAGE_NUMBER_POSITIONS = ["LEFT", "CENTER", "RIGHT"] as const;
export const MEAL_PLAN_PAGE_NUMBER_FORMATS = ["PAGE_OF_TOTAL", "FRACTION"] as const;
export const MEAL_PLAN_IMAGE_MODES = ["ALL", "MEALS", "NONE"] as const;

export type MealPlanLogoPosition = (typeof MEAL_PLAN_LOGO_POSITIONS)[number];
export type MealPlanLogoSize = (typeof MEAL_PLAN_LOGO_SIZES)[number];
export type MealPlanWatermarkType = (typeof MEAL_PLAN_WATERMARK_TYPES)[number];
export type MealPlanWatermarkPosition = (typeof MEAL_PLAN_WATERMARK_POSITIONS)[number];
export type MealPlanPageNumberPosition = (typeof MEAL_PLAN_PAGE_NUMBER_POSITIONS)[number];
export type MealPlanPageNumberFormat = (typeof MEAL_PLAN_PAGE_NUMBER_FORMATS)[number];
export type MealPlanImageMode = (typeof MEAL_PLAN_IMAGE_MODES)[number];

export interface MealPlanPdfStyle {
  logoUrl: string | null;
  logoPosition: MealPlanLogoPosition;
  logoSize: MealPlanLogoSize;
  showLogo: boolean;
  watermarkEnabled: boolean;
  watermarkType: MealPlanWatermarkType;
  watermarkText: string | null;
  watermarkImageUrl: string | null;
  watermarkOpacity: number;
  watermarkPosition: MealPlanWatermarkPosition;
  watermarkRepeat: boolean;
  pageNumbers: boolean;
  showFirstPage: boolean;
  pageNumberPosition: MealPlanPageNumberPosition;
  pageNumberFormat: MealPlanPageNumberFormat;
  includeDate: boolean;
  includePatientName: boolean;
  imageMode: MealPlanImageMode;
}

export const DEFAULT_MEAL_PLAN_PDF_STYLE: MealPlanPdfStyle = {
  logoUrl: null,
  logoPosition: "LEFT",
  logoSize: "MD",
  // When no custom logo is supplied, the PDF renderer can safely fall back
  // to the nutritionist/clinic profile image.
  showLogo: true,
  watermarkEnabled: false,
  watermarkType: "TEXT",
  watermarkText: null,
  watermarkImageUrl: null,
  watermarkOpacity: 0.12,
  watermarkPosition: "DIAGONAL",
  watermarkRepeat: true,
  pageNumbers: false,
  showFirstPage: true,
  pageNumberPosition: "RIGHT",
  pageNumberFormat: "PAGE_OF_TOTAL",
  includeDate: false,
  includePatientName: false,
  imageMode: "MEALS",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown, fallback: string | null): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function readEnum<T extends readonly string[]>(value: unknown, allowed: T, fallback: T[number]): T[number] {
  return typeof value === "string" && allowed.includes(value) ? value as T[number] : fallback;
}

function readOpacity(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(1, Math.max(0.02, Math.round(parsed * 100) / 100));
}

/**
 * Normalizes the JSON persisted in `MealPlan.pdfStyle`. Keep this helper free
 * of server-only dependencies so both the Studio and the PDF renderer use the
 * same safe defaults.
 */
export function parseMealPlanPdfStyle(value: unknown): MealPlanPdfStyle {
  const raw = isRecord(value) ? value : {};

  return {
    logoUrl: readString(raw.logoUrl, DEFAULT_MEAL_PLAN_PDF_STYLE.logoUrl),
    logoPosition: readEnum(raw.logoPosition, MEAL_PLAN_LOGO_POSITIONS, DEFAULT_MEAL_PLAN_PDF_STYLE.logoPosition),
    logoSize: readEnum(raw.logoSize, MEAL_PLAN_LOGO_SIZES, DEFAULT_MEAL_PLAN_PDF_STYLE.logoSize),
    showLogo: readBoolean(raw.showLogo, DEFAULT_MEAL_PLAN_PDF_STYLE.showLogo),
    watermarkEnabled: readBoolean(raw.watermarkEnabled, DEFAULT_MEAL_PLAN_PDF_STYLE.watermarkEnabled),
    watermarkType: readEnum(raw.watermarkType, MEAL_PLAN_WATERMARK_TYPES, DEFAULT_MEAL_PLAN_PDF_STYLE.watermarkType),
    watermarkText: readString(raw.watermarkText, DEFAULT_MEAL_PLAN_PDF_STYLE.watermarkText),
    watermarkImageUrl: readString(raw.watermarkImageUrl, DEFAULT_MEAL_PLAN_PDF_STYLE.watermarkImageUrl),
    watermarkOpacity: readOpacity(raw.watermarkOpacity, DEFAULT_MEAL_PLAN_PDF_STYLE.watermarkOpacity),
    watermarkPosition: readEnum(raw.watermarkPosition, MEAL_PLAN_WATERMARK_POSITIONS, DEFAULT_MEAL_PLAN_PDF_STYLE.watermarkPosition),
    watermarkRepeat: readBoolean(raw.watermarkRepeat, DEFAULT_MEAL_PLAN_PDF_STYLE.watermarkRepeat),
    pageNumbers: readBoolean(raw.pageNumbers, DEFAULT_MEAL_PLAN_PDF_STYLE.pageNumbers),
    showFirstPage: readBoolean(raw.showFirstPage, DEFAULT_MEAL_PLAN_PDF_STYLE.showFirstPage),
    pageNumberPosition: readEnum(raw.pageNumberPosition, MEAL_PLAN_PAGE_NUMBER_POSITIONS, DEFAULT_MEAL_PLAN_PDF_STYLE.pageNumberPosition),
    pageNumberFormat: readEnum(raw.pageNumberFormat, MEAL_PLAN_PAGE_NUMBER_FORMATS, DEFAULT_MEAL_PLAN_PDF_STYLE.pageNumberFormat),
    includeDate: readBoolean(raw.includeDate, DEFAULT_MEAL_PLAN_PDF_STYLE.includeDate),
    includePatientName: readBoolean(raw.includePatientName, DEFAULT_MEAL_PLAN_PDF_STYLE.includePatientName),
    imageMode: readEnum(raw.imageMode, MEAL_PLAN_IMAGE_MODES, DEFAULT_MEAL_PLAN_PDF_STYLE.imageMode),
  };
}
