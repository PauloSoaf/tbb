interface MealPlanNutritionistSignatureProps {
  nutritionistName: string;
  crn?: string | null;
  title: string;
  professionLabel: string;
  automaticHint?: string;
  showAutomaticHint?: boolean;
  className?: string;
}

export function MealPlanNutritionistSignature({
  nutritionistName,
  crn,
  title,
  professionLabel,
  automaticHint,
  showAutomaticHint = false,
  className = "",
}: MealPlanNutritionistSignatureProps) {
  return (
    <section className={`break-inside-avoid text-center ${className}`} aria-label={title}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-secondary">{title}</p>
      <div className="mx-auto mt-8 max-w-sm">
        <p className="px-4 font-serif text-xl italic text-text-primary">{nutritionistName}</p>
        <div className="mt-1 border-t border-text-secondary/50 pt-2">
          <p className="text-sm font-semibold text-text-primary">{nutritionistName}</p>
          <p className="mt-0.5 text-xs text-text-secondary">
            {professionLabel}{crn ? ` · CRN ${crn}` : ""}
          </p>
        </div>
      </div>
      {showAutomaticHint && automaticHint && (
        <p className="mx-auto mt-3 max-w-md text-[11px] text-text-secondary">{automaticHint}</p>
      )}
    </section>
  );
}
