"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis, ReferenceLine } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { fatClassify } from "@/lib/utils/fat-classification";

type MeasurementPoint = {
  measuredAt: Date | string;
  bodyFatPercentage: number | null;
};

interface BodyFatSparklineCardProps {
  measurements: MeasurementPoint[];
  gender?: string | null;
}

export function BodyFatSparklineCard({ measurements, gender }: BodyFatSparklineCardProps) {
  const data = measurements
    .filter((m) => m.bodyFatPercentage != null)
    .map((m) => ({
      date: format(new Date(m.measuredAt), "dd/MM", { locale: ptBR }),
      gordura: Number(Number(m.bodyFatPercentage).toFixed(1)),
    }));

  if (data.length === 0) return null;

  const latest = data[data.length - 1].gordura;
  const first = data[0].gordura;
  const diff = Number((latest - first).toFixed(1));
  const hasTrend = data.length >= 2;
  const trendTone = diff < 0 ? "text-emerald-600" : diff > 0 ? "text-amber-600" : "text-slate-500";
  const { label: fatLabel, color: fatColor } = fatClassify(latest, gender ?? null);

  return (
    <div className="bg-card-bg rounded-3xl p-5 shadow-sm border border-border-neutral">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-text-primary text-sm">Gordura corporal</h3>
          <p className={`text-xs font-medium mt-0.5 ${fatColor}`}>{fatLabel}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-text-primary">{latest.toFixed(1)}%</p>
          {hasTrend && (
            <p className={`text-xs font-semibold flex items-center justify-end gap-1 ${trendTone}`}>
              {diff < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : diff > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
              {diff > 0 ? "+" : ""}{diff.toFixed(1)}%
            </p>
          )}
        </div>
      </div>

      {hasTrend ? (
        <div className="mt-4 h-24">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
              <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
              <ReferenceLine y={gender === "F" ? 20 : 13} stroke="#10b981" strokeDasharray="3 3" strokeWidth={1} />
              <ReferenceLine y={gender === "F" ? 31 : 24} stroke="#f97316" strokeDasharray="3 3" strokeWidth={1} />
              <Tooltip
                cursor={{ stroke: "#DBEAFE", strokeWidth: 2 }}
                formatter={(value: unknown) => {
                  const v = typeof value === "number" ? value : Number(value);
                  return [`${v.toFixed(1)}%`, "% Gordura"];
                }}
                labelFormatter={(label) => `Data: ${label}`}
                contentStyle={{ borderRadius: 12, borderColor: "var(--border-neutral)", backgroundColor: "var(--card-bg)", color: "var(--text-primary)", fontSize: 12 }}
              />
              <Line
                type="monotone"
                dataKey="gordura"
                stroke="#f59e0b"
                strokeWidth={3}
                dot={{ r: 3, fill: "#f59e0b", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#d97706" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="mt-4 rounded-2xl bg-warm-surface dark:bg-slate-800/50 px-3 py-2 text-xs text-text-secondary">
          Cadastre outra avaliação para visualizar a tendência de gordura corporal.
        </p>
      )}
    </div>
  );
}
