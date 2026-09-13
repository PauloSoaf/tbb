"use client";

import { useActionState } from "react";
import { Scale, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";

interface ManualWeightQuickFormProps {
  action: (
    prevState: { error?: string; success?: boolean; message?: string } | null,
    formData: FormData
  ) => Promise<{ error?: string; success?: boolean; message?: string } | null>;
}

export function ManualWeightQuickForm({ action }: ManualWeightQuickFormProps) {
  const { t } = useI18n();
  const [state, formAction, isPending] = useActionState(action, null);

  return (
    <section className="rounded-xl border border-border-neutral bg-card-bg p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-text-primary">
            <Scale className="h-4 w-4 text-brand-blue" />
            {t("anthropometry.manual_weight_title")}
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            {t("anthropometry.manual_weight_desc")}
          </p>
        </div>
      </div>

      <form action={formAction} className="grid grid-cols-1 gap-3 md:grid-cols-[140px_150px_minmax(0,1fr)_auto] md:items-end">
        <div>
          <label htmlFor="manual-weight" className="mb-1.5 block text-sm font-medium text-text-primary">
            {t("anthropometry.weight_kg")}
          </label>
          <input
            id="manual-weight"
            name="weight"
            inputMode="decimal"
            placeholder="Ex: 72,4"
            className="w-full rounded-lg border border-border-neutral bg-card-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/60 outline-none transition-colors focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
          />
        </div>

        <div>
          <label htmlFor="manual-weight-date" className="mb-1.5 block text-sm font-medium text-text-primary">
            {t("anthropometry.date")}
          </label>
          <input
            id="manual-weight-date"
            name="measuredAt"
            type="date"
            defaultValue={new Date().toISOString().split("T")[0]}
            className="w-full rounded-lg border border-border-neutral bg-card-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/60 outline-none transition-colors focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
          />
        </div>

        <div>
          <label htmlFor="manual-weight-notes" className="mb-1.5 block text-sm font-medium text-text-primary">
            {t("anthropometry.notes")}
          </label>
          <input
            id="manual-weight-notes"
            name="notes"
            placeholder="Ex: pesagem domiciliar, jejum, balanca da clinica"
            className="w-full rounded-lg border border-border-neutral bg-card-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/60 outline-none transition-colors focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-blue px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-blue-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scale className="h-4 w-4" />}
          {t("anthropometry.save")}
        </button>
      </form>

      {state?.error && (
        <p className="mt-3 text-sm font-medium text-danger">{state.error}</p>
      )}
      {state?.success && (
        <p className="mt-3 text-sm font-medium text-emerald-700 dark:text-emerald-400">{state.message}</p>
      )}
    </section>
  );
}
