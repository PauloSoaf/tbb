import type { MealPlanPdfStyle } from "@/lib/meal-plan/pdf-style";

const logoSizeClasses: Record<MealPlanPdfStyle["logoSize"], string> = {
  SM: "h-8 max-w-24",
  MD: "h-12 max-w-36",
  LG: "h-16 max-w-48",
};

const logoPositionClasses: Record<MealPlanPdfStyle["logoPosition"], string> = {
  LEFT: "justify-start",
  CENTER: "justify-center",
  RIGHT: "justify-end",
};

/**
 * A deliberately plain <img> keeps public Vercel Blob/local-upload assets
 * compatible with both browser printing and html2canvas PDF export.
 */
export function MealPlanPdfBranding({
  style,
  fallbackLogoUrl,
  alt,
}: {
  style: MealPlanPdfStyle;
  fallbackLogoUrl?: string | null;
  alt: string;
}) {
  const logoUrl = style.logoUrl ?? fallbackLogoUrl;
  if (!style.showLogo || !logoUrl) return null;

  return (
    <div className={`mb-4 flex ${logoPositionClasses[style.logoPosition]}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoUrl}
        alt={alt}
        className={`${logoSizeClasses[style.logoSize]} w-auto object-contain`}
      />
    </div>
  );
}
