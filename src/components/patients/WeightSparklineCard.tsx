"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";

type WeightPoint = {
  measuredAt: Date | string;
  weight: number | null;
};

interface WeightSparklineCardProps {
  measurements: WeightPoint[];
}

export function WeightSparklineCard({ measurements }: WeightSparklineCardProps) {
  const data = measurements
    .filter((measurement) => measurement.weight != null)
    .map((measurement) => ({
      date: format(new Date(measurement.measuredAt), "dd/MM", { locale: ptBR }),
      weight: Number(measurement.weight!.toFixed(1)),
    }));

  if (data.length === 0) return null;

  const first = data[0].weight;
  const latest = data[data.length - 1].weight;
  const diff = Number((latest - first).toFixed(1));
  const hasTrend = data.length >= 2;
  const trendTone = diff < 0 ? "text-emerald-600" : diff > 0 ? "text-rose-600" : "text-slate-500";

  return (
    <div className="bg-card-bg rounded-3xl p-5 shadow-sm border border-border-neutral">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-text-primary text-sm">Histórico de peso</h3>
          <p className="text-xs text-text-secondary mt-0.5">
            {data.length} registro{data.length === 1 ? "" : "s"} antropométrico{data.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-text-primary">{latest.toFixed(1)} kg</p>
          {hasTrend && (
            <p className={`text-xs font-semibold flex items-center justify-end gap-1 ${trendTone}`}>
              {diff < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : diff > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
              {diff > 0 ? "+" : ""}{diff.toFixed(1)} kg
            </p>
          )}
        </div>
      </div>

      {hasTrend ? (
        <div className="mt-4 h-24">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
              <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
              <Tooltip
                cursor={{ stroke: "#DBEAFE", strokeWidth: 2 }}
                formatter={(value: unknown) => {
                  const numericValue = typeof value === "number" ? value : Number(value);
                  return [`${numericValue.toFixed(1)} kg`, "Peso"];
                }}
                labelFormatter={(label) => `Data: ${label}`}
                contentStyle={{ borderRadius: 12, borderColor: "var(--border-neutral)", backgroundColor: "var(--card-bg)", color: "var(--text-primary)", fontSize: 12 }}
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#2563EB"
                strokeWidth={3}
                dot={{ r: 3, fill: "#2563EB", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#1D4ED8" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="mt-4 rounded-2xl bg-warm-surface dark:bg-slate-800/50 px-3 py-2 text-xs text-text-secondary">
          Cadastre outra avaliação para visualizar a tendência.
        </p>
      )}
    </div>
  );
}
