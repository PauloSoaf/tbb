"use client";

import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Assessment {
  id: string;
  bodyFatPct: number | null;
  leanMassKg: number | null;
  assessedAt: Date;
  protocol: string;
}

interface Props {
  assessments: Assessment[];
}

export function SkinfoldEvolutionChart({ assessments }: Props) {
  if (assessments.length < 2) return null;

  const data = [...assessments]
    .reverse()
    .map((a) => ({
      data: format(new Date(a.assessedAt), "dd/MM/yy", { locale: ptBR }),
      "% Gordura": a.bodyFatPct != null ? Number(a.bodyFatPct.toFixed(1)) : null,
      "Massa Magra (kg)": a.leanMassKg != null ? Number(a.leanMassKg.toFixed(1)) : null,
    }));

  return (
    <div className="bg-card-bg border border-border-neutral rounded-xl p-4 space-y-4">
      <h3 className="text-sm font-semibold text-text-primary">Evolução — Dobras Cutâneas</h3>
      <div>
        <p className="text-xs text-text-secondary mb-2">% Gordura Corporal</p>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="data" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} unit="%" />
            <Tooltip />
            <Line type="monotone" dataKey="% Gordura" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div>
        <p className="text-xs text-text-secondary mb-2">Massa Magra (kg)</p>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="data" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} unit=" kg" />
            <Tooltip />
            <Line type="monotone" dataKey="Massa Magra (kg)" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
