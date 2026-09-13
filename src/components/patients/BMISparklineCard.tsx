"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis, ReferenceLine } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { bmiClassify } from "@/lib/utils/bmi-classify";

type MeasurementPoint = {
  measuredAt: Date | string;
  bmi: number | null;
};

interface BMISparklineCardProps {
  measurements: MeasurementPoint[];
}

export function BMISparklineCard({ measurements }: BMISparklineCardProps) {
  const data = measurements
    .filter((m) => m.bmi != null)
    .map((m) => ({
      date: format(new Date(m.measuredAt), "dd/MM", { locale: ptBR }),
      imc: Number(Number(m.bmi).toFixed(1)),
    }));

  if (data.length === 0) return null;

  const latest = data[data.length - 1].imc;
  const first = data[0].imc;
  const diff = Number((latest - first).toFixed(1));
  const hasTrend = data.length >= 2;
  const trendTone = diff < 0 ? "text-emerald-600" : diff > 0 ? "text-amber-600" : "text-slate-500";
  const { label: bmiLabel, color: bmiColor } = bmiClassify(latest);

  return (
    <div className="bg-card-bg rounded-3xl p-5 shadow-sm border border-border-neutral">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-text-primary text-sm">Evolução do IMC</h3>
          <p className={`text-xs font-medium mt-0.5 ${bmiColor}`}>{bmiLabel}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-text-primary">{latest.toFixed(1)}</p>
          {hasTrend && (
            <p className={`text-xs font-semibold flex items-center justify-end gap-1 ${trendTone}`}>
              {diff < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : diff > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
              {diff > 0 ? "+" : ""}{diff.toFixed(1)}
            </p>
          )}
        </div>
      </div>

      {hasTrend ? (
        <div className="mt-4 h-24">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
              <YAxis hide domain={["dataMin - 0.5", "dataMax + 0.5"]} />
              <ReferenceLine y={18.5} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1} />
              <ReferenceLine y={25} stroke="#10b981" strokeDasharray="3 3" strokeWidth={1} />
              <ReferenceLine y={30} stroke="#f97316" strokeDasharray="3 3" strokeWidth={1} />
              <Tooltip
                cursor={{ stroke: "#DBEAFE", strokeWidth: 2 }}
                formatter={(value: unknown) => {
                  const v = typeof value === "number" ? value : Number(value);
                  return [`${v.toFixed(1)}`, "IMC"];
                }}
                labelFormatter={(label) => `Data: ${label}`}
                contentStyle={{ borderRadius: 12, borderColor: "var(--border-neutral)", backgroundColor: "var(--card-bg)", color: "var(--text-primary)", fontSize: 12 }}
              />
              <Line
                type="monotone"
                dataKey="imc"
                stroke="#8b5cf6"
                strokeWidth={3}
                dot={{ r: 3, fill: "#8b5cf6", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#7c3aed" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="mt-4 rounded-2xl bg-warm-surface dark:bg-slate-800/50 px-3 py-2 text-xs text-text-secondary">
          Cadastre outra avaliação para visualizar a tendência do IMC.
        </p>
      )}

      <div className="mt-3 flex gap-3 text-[10px] text-text-secondary">
        <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-amber-400 inline-block" />18.5</span>
        <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-emerald-500 inline-block" />25</span>
        <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-orange-500 inline-block" />30</span>
      </div>
    </div>
  );
}
