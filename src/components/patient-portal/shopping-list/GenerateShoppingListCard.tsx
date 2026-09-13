"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ShoppingCart, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nContext";
import { generateShoppingListAction } from "@/actions/shopping-list.action";

interface Props {
  tenantSlug: string;
  activePlan: { id: string; title: string } | null;
}

const PERIOD_OPTIONS = [1, 3, 7, 14] as const;

export function GenerateShoppingListCard({ tenantSlug, activePlan }: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const [periodDays, setPeriodDays] = useState<number>(7);
  const [isPending, startTransition] = useTransition();

  const handleGenerate = () => {
    if (!activePlan) return;
    startTransition(async () => {
      const result = await generateShoppingListAction(tenantSlug, {
        mealPlanId: activePlan.id,
        periodDays,
      });
      if (result.success) {
        toast.success(t("shopping_list.toasts.generated", { defaultValue: "Lista gerada!" }));
        router.refresh();
      } else {
        toast.error(result.error ?? t("shopping_list.toasts.error_generate", { defaultValue: "Erro ao gerar lista." }));
      }
    });
  };

  const periodLabel: Record<number, string> = {
    1: t("shopping_list.period_1_day", { defaultValue: "1 dia" }),
    3: t("shopping_list.period_3_days", { defaultValue: "3 dias" }),
    7: t("shopping_list.period_7_days", { defaultValue: "7 dias" }),
    14: t("shopping_list.period_14_days", { defaultValue: "14 dias" }),
  };

  return (
    <div className="bg-card-bg border border-border-neutral rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-brand-blue/10 rounded-xl">
          <ShoppingCart className="w-5 h-5 text-brand-blue" />
        </div>
        <div>
          <h2 className="font-semibold text-text-primary text-sm">
            {t("shopping_list.generate_from_plan", { defaultValue: "Gerar a partir do plano ativo" })}
          </h2>
          {activePlan ? (
            <p className="text-xs text-text-secondary truncate max-w-[220px]">{activePlan.title}</p>
          ) : (
            <p className="text-xs text-danger">
              {t("shopping_list.no_active_plan", { defaultValue: "Nenhum plano ativo" })}
            </p>
          )}
        </div>
      </div>

      {/* Period selector */}
      <div>
        <p className="text-xs font-medium text-text-secondary mb-2">
          {t("shopping_list.period", { defaultValue: "Período" })}
        </p>
        <div className="flex gap-2 flex-wrap">
          {PERIOD_OPTIONS.map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setPeriodDays(days)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                periodDays === days
                  ? "border-brand-blue bg-brand-blue text-white"
                  : "border-border-neutral text-text-secondary hover:border-brand-blue/40"
              }`}
            >
              {periodLabel[days]}
            </button>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-[11px] text-text-tertiary bg-surface-warm rounded-lg px-3 py-2 leading-relaxed">
        ⚠️ {t("shopping_list.estimated_notice", {
          defaultValue:
            "Esta lista é uma estimativa. Ajuste conforme sua rotina e siga as orientações da sua nutricionista.",
        })}
      </p>

      <button
        onClick={handleGenerate}
        disabled={!activePlan || isPending}
        className="w-full flex items-center justify-center gap-2 bg-brand-blue text-white rounded-xl py-3 font-semibold text-sm hover:bg-brand-blue-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <ShoppingCart className="w-4 h-4" />
        )}
        {isPending
          ? t("common.loading", { defaultValue: "Gerando..." })
          : t("shopping_list.generate", { defaultValue: "Gerar lista" })}
      </button>
    </div>
  );
}
