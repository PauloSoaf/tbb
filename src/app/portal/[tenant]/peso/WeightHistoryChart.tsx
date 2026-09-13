"use client";

import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { format } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { useI18n } from "@/lib/i18n/I18nContext";

interface WeightEntry {
  id: string;
  weight: number | null;
  measuredAt: Date;
}

interface Props {
  history: WeightEntry[];
}

export function WeightHistoryChart({ history }: Props) {
  const { t, locale } = useI18n();
  const dateLocale = locale === "en" ? enUS : locale === "es" ? es : ptBR;

  const data = [...history]
    .reverse()
    .map((m) => ({
      data: format(new Date(m.measuredAt), "dd/MM", { locale: dateLocale }),
      "Peso (kg)": m.weight != null ? Number(m.weight.toFixed(1)) : null,
    }));

  return (
    <div className="bg-white border border-border-neutral rounded-xl p-4">
      <h3 className="text-sm font-semibold text-text-primary mb-3">{t("patient_portal.weight.chart_title", { defaultValue: "Evolução do Peso" })}</h3>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="data" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} unit=" kg" />
          <Tooltip formatter={(v: unknown) => [`${v} kg`]} />
          <Line
            type="monotone"
            dataKey="Peso (kg)"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
