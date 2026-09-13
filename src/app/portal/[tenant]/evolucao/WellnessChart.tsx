"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { useI18n } from "@/lib/i18n/I18nContext";

type Checkin = {
  date: Date | string;
  mood: number;
  energy: number;
};

interface Props {
  checkins: Checkin[];
}

const MOOD_LABEL = ["", "Muito mal", "Mal", "Neutro", "Bem", "Ótimo"];

export function WellnessChart({ checkins }: Props) {
  const { t, locale } = useI18n();
  const dateLocale = locale === "en" ? enUS : locale === "es" ? es : ptBR;

  const data = [...checkins]
    .reverse()
    .map((c) => ({
      date: format(new Date(c.date), "dd/MM", { locale: dateLocale }),
      humor: c.mood,
      energia: c.energy,
    }));

  if (data.length < 2) return null;

  return (
    <div className="bg-white rounded-2xl border border-border-neutral p-5">
      <h2 className="font-semibold text-text-primary mb-1">{t("patient_portal.progress.wellness_title", { defaultValue: "Bem-estar — Humor & Energia" })}</h2>
      <p className="text-xs text-text-secondary mb-4">{t("patient_portal.progress.wellness_subtitle", { count: data.length.toString(), defaultValue: `Últimos ${data.length} check-ins diários (1=muito mal, 5=ótimo)` })}</p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(value, name) => [
              `${value} — ${MOOD_LABEL[Number(value)] ?? ""}`,
              name === "humor" ? t("patient_portal.progress.mood", { defaultValue: "Humor" }) : t("patient_portal.progress.energy", { defaultValue: "Energia" }),
            ]}
          />
          <Legend
            formatter={(value) => (value === "humor" ? t("patient_portal.progress.mood", { defaultValue: "Humor" }) : t("patient_portal.progress.energy", { defaultValue: "Energia" }))}
          />
          <Line
            type="monotone"
            dataKey="humor"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="energia"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
