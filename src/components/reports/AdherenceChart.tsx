"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Cell,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DayAdherence {
  date: string;
  plannedCalories: number;
  loggedCalories: number;
  loggedEntries: number;
  adherencePct: number;
}

interface Props {
  data: DayAdherence[];
  avgAdherencePct: number;
  daysLogged: number;
  totalDays: number;
  plannedAvgCalories: number;
  loggedAvgCalories: number;
}

const tooltipFormatter = (value: unknown) => {
  return [`${value}%`];
};

export function AdherenceChart({ data, avgAdherencePct, daysLogged, totalDays, plannedAvgCalories, loggedAvgCalories }: Props) {
  const chartData = data.map((d) => ({
    ...d,
    label: format(parseISO(d.date), "dd/MM", { locale: ptBR }),
    "% Adesão": d.loggedEntries > 0 ? d.adherencePct : null,
  }));

  const adherenceColor = (pct: number) =>
    pct >= 90 ? "#22c55e" : pct >= 70 ? "#f59e0b" : "#ef4444";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Adesão média", value: `${avgAdherencePct}%`, sub: "últimos dias" },
          { label: "Dias registrados", value: `${daysLogged}/${totalDays}`, sub: "com diário" },
          { label: "Kcal planejadas", value: `${plannedAvgCalories}`, sub: "plano ativo" },
          { label: "Kcal registradas", value: `${loggedAvgCalories}`, sub: "média/dia" },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-white border border-border-neutral rounded-xl p-3 text-center">
            <p className="text-xs text-text-secondary">{label}</p>
            <p className="text-xl font-bold text-text-primary mt-1">{value}</p>
            <p className="text-xs text-text-secondary">{sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-border-neutral rounded-xl p-4">
        <h3 className="text-sm font-semibold text-text-primary mb-3">Adesão diária ao plano alimentar (%)</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} domain={[0, 150]} unit="%" />
            <Tooltip formatter={tooltipFormatter} />
            <ReferenceLine y={100} stroke="#3b82f6" strokeDasharray="4 4" label={{ value: "Meta", fontSize: 10, fill: "#3b82f6" }} />
            <Bar dataKey="% Adesão" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, idx) => (
                <Cell key={idx} fill={entry["% Adesão"] != null ? adherenceColor(entry["% Adesão"]) : "#e5e7eb"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-4 text-xs text-text-secondary justify-center">
        {[
          { color: "#22c55e", label: "≥90% (ótimo)" },
          { color: "#f59e0b", label: "70-89% (bom)" },
          { color: "#ef4444", label: "<70% (atenção)" },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
