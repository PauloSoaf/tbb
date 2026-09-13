"use client";

import { useState, useTransition } from "react";
import { reviewAnamneseAction } from "@/actions/reviewAnamnese.action";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";

interface ReviewButtonProps {
  responseId: string;
  currentStatus: string;
}

export function ReviewButton({ responseId, currentStatus }: ReviewButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [reviewed, setReviewed] = useState(currentStatus === "REVIEWED");
  const { t } = useI18n();

  function handleReview() {
    startTransition(async () => {
      const result = await reviewAnamneseAction(responseId);
      if (result.success) {
        setReviewed(true);
      }
    });
  }

  if (reviewed) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl font-medium text-sm">
        <CheckCircle2 className="w-4 h-4" />
        {t("anamnese.status_reviewed", { defaultValue: "Revisada" })}
      </div>
    );
  }

  return (
    <button
      onClick={handleReview}
      disabled={isPending}
      className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-blue text-white rounded-xl
        font-medium text-sm shadow-md shadow-brand-blue/20
        hover:bg-brand-blue-hover transition-all duration-200
        disabled:opacity-50"
    >
      {isPending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          {t("anamnese.review_processing", { defaultValue: "Processando..." })}
        </>
      ) : (
        <>
          <CheckCircle2 className="w-4 h-4" />
          {t("anamnese.review_mark", { defaultValue: "Marcar como revisada" })}
        </>
      )}
    </button>
  );
}
