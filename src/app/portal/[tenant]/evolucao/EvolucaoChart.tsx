"use client";

import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { format } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { useI18n } from "@/lib/i18n/I18nContext";

interface Measurement {
  weight: number | null;
  bodyFatPercentage: number | null;
  measuredAt: Date | string;
}

interface Props {
  measurements: Measurement[];
}

export function EvolucaoChart({ measurements }: Props) {
  const { t, locale } = useI18n();
  const dateLocale = locale === "en" ? enUS : locale === "es" ? es : ptBR;

  const data = [...measurements]
    .reverse()
    .map((m) => ({
      data: format(new Date(m.measuredAt), "dd/MM", { locale: dateLocale }),
      "Peso (kg)": m.weight != null ? Number(Number(m.weight).toFixed(1)) : null,
      "% Gordura": m.bodyFatPercentage != null ? Number(Number(m.bodyFatPercentage).toFixed(1)) : null,
    }));

  const hasWeight = data.some((d) => d["Peso (kg)"] != null);
  const hasFat = data.some((d) => d["% Gordura"] != null);

  if (!hasWeight && !hasFat) return null;

  return (
    <div className="bg-white border border-border-neutral rounded-2xl p-4 space-y-4">
      <h2 className="text-base font-semibold text-text-primary">{t("patient_portal.progress.chart_title", { defaultValue: "Gráfico de Evolução" })}</h2>
      {hasWeight && (
        <div>
          <p className="text-xs text-text-secondary mb-1">{t("patient_portal.progress.weight", { defaultValue: "Peso" })} (kg)</p>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="data" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} unit=" kg" />
              <Tooltip formatter={(v: unknown) => [`${v} kg`]} />
              <Line type="monotone" dataKey="Peso (kg)" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      {hasFat && (
        <div>
          <p className="text-xs text-text-secondary mb-1">{t("patient_portal.progress.body_fat_percentage", { defaultValue: "% Gordura" })}</p>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="data" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} unit="%" />
              <Tooltip formatter={(v: unknown) => [`${v}%`]} />
              <Line type="monotone" dataKey="% Gordura" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
