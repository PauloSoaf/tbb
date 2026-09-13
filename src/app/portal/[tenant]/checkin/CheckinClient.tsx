"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { submitWellnessCheckinAction } from "@/actions/patient-portal.action";
import { format } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { useI18n } from "@/lib/i18n/I18nContext";

type Checkin = {
  id: string;
  date: Date | string;
  mood: number;
  energy: number;
  sleep: number | null;
  notes: string | null;
};

interface Props {
  tenantSlug: string;
  todayCheckin: Checkin | null;
  recentCheckins: Checkin[];
}

export function CheckinClient({ tenantSlug, todayCheckin, recentCheckins }: Props) {
  const { t, locale } = useI18n();
  const dateLocale = locale === "en" ? enUS : locale === "es" ? es : ptBR;

  const MOOD_OPTIONS = [
    { value: 1, emoji: "😢", label: t("patient_portal.checkin.mood_1", { defaultValue: "Muito mal" }) },
    { value: 2, emoji: "😕", label: t("patient_portal.checkin.mood_2", { defaultValue: "Mal" }) },
    { value: 3, emoji: "😐", label: t("patient_portal.checkin.mood_3", { defaultValue: "Neutro" }) },
    { value: 4, emoji: "😊", label: t("patient_portal.checkin.mood_4", { defaultValue: "Bem" }) },
    { value: 5, emoji: "😁", label: t("patient_portal.checkin.mood_5", { defaultValue: "Ótimo" }) },
  ];

  const ENERGY_OPTIONS = [
    { value: 1, emoji: "🪴", label: t("patient_portal.checkin.energy_1", { defaultValue: "Sem energia" }) },
    { value: 2, emoji: "😴", label: t("patient_portal.checkin.energy_2", { defaultValue: "Cansado(a)" }) },
    { value: 3, emoji: "😌", label: t("patient_portal.checkin.energy_3", { defaultValue: "Normal" }) },
    { value: 4, emoji: "⚡", label: t("patient_portal.checkin.energy_4", { defaultValue: "Disposto(a)" }) },
    { value: 5, emoji: "🔥", label: t("patient_portal.checkin.energy_5", { defaultValue: "Cheio(a) de energia" }) },
  ];

  const [mood, setMood] = useState(todayCheckin?.mood ?? 3);
  const [energy, setEnergy] = useState(todayCheckin?.energy ?? 3);
  const [sleep, setSleep] = useState<string>(todayCheckin?.sleep?.toString() ?? "");
  const [notes, setNotes] = useState(todayCheckin?.notes ?? "");
  const [submitted, setSubmitted] = useState(!!todayCheckin);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    startTransition(async () => {
      const res = await submitWellnessCheckinAction(tenantSlug, {
        mood,
        energy,
        sleep: sleep ? parseFloat(sleep) : null,
        notes: notes.trim() || null,
      });
      if (res.success) {
        toast.success(t("patient_portal.checkin.success_msg", { defaultValue: "Check-in registrado!" }));
        setSubmitted(true);
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Today's checkin form */}
      <div className="bg-white rounded-2xl border border-border-neutral p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-text-primary">{t("patient_portal.checkin.how_are_you", { defaultValue: "Como você está hoje?" })}</h2>
          <span className="text-xs text-text-secondary capitalize">
            {format(new Date(), "EEEE, dd/MM", { locale: dateLocale })}
          </span>
        </div>

        {/* Mood */}
        <div>
          <p className="text-sm font-medium text-text-secondary mb-2">{t("patient_portal.checkin.mood", { defaultValue: "Humor" })}</p>
          <div className="flex gap-2">
            {MOOD_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => setMood(o.value)}
                title={o.label}
                className={`flex-1 text-2xl py-2 rounded-xl border-2 transition-all ${
                  mood === o.value
                    ? "border-brand-blue bg-brand-blue/5 scale-110"
                    : "border-transparent hover:border-gray-200"
                }`}
              >
                {o.emoji}
              </button>
            ))}
          </div>
          <p className="text-xs text-center text-text-secondary mt-1">
            {MOOD_OPTIONS.find((o) => o.value === mood)?.label}
          </p>
        </div>

        {/* Energy */}
        <div>
          <p className="text-sm font-medium text-text-secondary mb-2">{t("patient_portal.checkin.energy", { defaultValue: "Nível de Energia" })}</p>
          <div className="flex gap-2">
            {ENERGY_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => setEnergy(o.value)}
                title={o.label}
                className={`flex-1 text-2xl py-2 rounded-xl border-2 transition-all ${
                  energy === o.value
                    ? "border-brand-blue bg-brand-blue/5 scale-110"
                    : "border-transparent hover:border-gray-200"
                }`}
              >
                {o.emoji}
              </button>
            ))}
          </div>
          <p className="text-xs text-center text-text-secondary mt-1">
            {ENERGY_OPTIONS.find((o) => o.value === energy)?.label}
          </p>
        </div>

        {/* Sleep */}
        <div>
          <label className="text-sm font-medium text-text-secondary block mb-1">
            {t("patient_portal.checkin.sleep", { defaultValue: "Horas de sono" })} <span className="font-normal text-text-secondary">{t("patient_portal.checkin.optional", { defaultValue: "(opcional)" })}</span>
          </label>
          <input
            type="number"
            min="0"
            max="24"
            step="0.5"
            value={sleep}
            onChange={(e) => setSleep(e.target.value)}
            placeholder={t("patient_portal.checkin.sleep_placeholder", { defaultValue: "ex: 7.5" })}
            className="w-full border border-border-neutral rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="text-sm font-medium text-text-secondary block mb-1">
            {t("patient_portal.checkin.notes", { defaultValue: "Observações" })} <span className="font-normal text-text-secondary">{t("patient_portal.checkin.optional", { defaultValue: "(opcional)" })}</span>
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("patient_portal.checkin.notes_placeholder", { defaultValue: "Como foi seu dia? Algum sintoma?" })}
            className="w-full border border-border-neutral rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 resize-none"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="w-full bg-brand-blue text-white rounded-xl py-3 font-semibold text-sm hover:bg-brand-blue-hover transition-colors disabled:opacity-60"
        >
          {isPending 
            ? t("patient_portal.checkin.submitting", { defaultValue: "Registrando..." }) 
            : submitted 
              ? t("patient_portal.checkin.update_checkin", { defaultValue: "Atualizar check-in" }) 
              : t("patient_portal.checkin.submit_checkin", { defaultValue: "Registrar check-in" })}
        </button>
      </div>

      {/* Recent history */}
      {recentCheckins.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-text-primary mb-3">{t("patient_portal.checkin.recent_history", { defaultValue: "Histórico recente" })}</h2>
          <div className="space-y-2">
            {recentCheckins.map((c) => (
              <div key={c.id} className="bg-white rounded-xl border border-border-neutral p-3 flex items-center gap-3">
                <span className="text-xl">
                  {MOOD_OPTIONS.find((o) => o.value === c.mood)?.emoji}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary capitalize">
                    {format(new Date(c.date), "EEEE, dd/MM", { locale: dateLocale })}
                  </p>
                  {c.notes && (
                    <p className="text-xs text-text-secondary truncate">{c.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-lg" title={`Energia: ${ENERGY_OPTIONS.find((o) => o.value === c.energy)?.label}`}>
                    {ENERGY_OPTIONS.find((o) => o.value === c.energy)?.emoji}
                  </span>
                  {c.sleep != null && (
                    <span className="text-xs text-text-secondary">{c.sleep}h</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
