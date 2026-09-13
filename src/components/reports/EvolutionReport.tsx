"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { PrintButton } from "@/components/meal-plans/PrintButton";

interface Measurement {
  id: string;
  weight: number | null;
  bodyFatPercentage: number | null;
  bmi: number | null;
  waist: number | null;
  measuredAt: Date;
}

interface Skinfold {
  id: string;
  bodyFatPercentage: number | null;
  leanMassKg: number | null;
  assessedAt: Date;
  protocol: string;
}

interface Goal {
  id: string;
  title: string;
  status: "ACTIVE" | "ACHIEVED" | "ABANDONED";
  targetValue: number | null;
  currentValue: number | null;
  targetUnit: string | null;
  type: string;
}

interface Patient {
  name: string;
  birthDate: Date | null;
}

interface Props {
  patient: Patient;
  nutritionistName: string;
  measurements: Measurement[];
  skinfoldsRaw: Skinfold[];
  goals: Goal[];
  generatedAt: Date;
}

const PROTOCOL_LABEL: Record<string, string> = {
  POLLOCK_3_MALE: "Pollock 3 (M)",
  POLLOCK_3_FEMALE: "Pollock 3 (F)",
  POLLOCK_7: "Pollock 7",
  GUEDES: "Guedes",
  PETROSKI_MALE: "Petroski (M)",
  PETROSKI_FEMALE: "Petroski (F)",
  DURNIN_WOMERSLEY: "Durnin-Womersley",
};

const GOAL_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Ativa",
  ACHIEVED: "Alcançada ✓",
  ABANDONED: "Abandonada",
};

export function EvolutionReport({ patient, nutritionistName, measurements, skinfoldsRaw, goals, generatedAt }: Props) {
  const weightData = measurements
    .filter((m) => m.weight != null)
    .map((m) => ({
      data: format(new Date(m.measuredAt), "dd/MM/yy"),
      Peso: Number(m.weight?.toFixed(1)),
    }))
    .reverse();

  const fatData = [
    ...measurements
      .filter((m) => m.bodyFatPercentage != null)
      .map((m) => ({
        data: format(new Date(m.measuredAt), "dd/MM/yy"),
        "% Gordura": Number(m.bodyFatPercentage?.toFixed(1)),
        source: "antro",
      })),
    ...skinfoldsRaw
      .filter((s) => s.bodyFatPercentage != null)
      .map((s) => ({
        data: format(new Date(s.assessedAt), "dd/MM/yy"),
        "% Gordura": Number(s.bodyFatPercentage?.toFixed(1)),
        source: "skinfold",
      })),
  ]
    .sort((a, b) => a.data.localeCompare(b.data));

  const latestMeasurement = measurements[0];
  const latestSkinfold = skinfoldsRaw[0];

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6 print:p-0">
      <div className="print:hidden flex justify-end">
        <PrintButton />
      </div>

      {/* Header */}
      <div className="border-b-2 border-brand-blue pb-4 print:border-gray-800">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-brand-blue print:text-black">Relatório de Evolução</h1>
            <p className="text-lg font-semibold text-text-primary mt-1">{patient.name}</p>
            {patient.birthDate && (
              <p className="text-sm text-text-secondary">
                Nascimento: {format(new Date(patient.birthDate), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            )}
          </div>
          <div className="text-right text-sm text-text-secondary">
            <p>Nutricionista: <span className="font-medium">{nutritionistName}</span></p>
            <p>Gerado em: {format(generatedAt, "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Peso atual", value: latestMeasurement?.weight ? `${latestMeasurement.weight.toFixed(1)} kg` : "—" },
          { label: "% Gordura (skinfold)", value: latestSkinfold?.bodyFatPercentage ? `${latestSkinfold.bodyFatPercentage.toFixed(1)}%` : (latestMeasurement?.bodyFatPercentage ? `${latestMeasurement.bodyFatPercentage.toFixed(1)}%` : "—") },
          { label: "Avaliações", value: `${measurements.length} medições` },
        ].map(({ label, value }) => (
          <div key={label} className="border border-border-neutral rounded-xl p-3 text-center bg-white">
            <p className="text-xs text-text-secondary">{label}</p>
            <p className="text-xl font-bold text-text-primary mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Weight chart */}
      {weightData.length >= 2 && (
        <div className="border border-border-neutral rounded-xl p-4 bg-white">
          <h2 className="text-sm font-bold text-text-primary mb-3">Evolução de Peso</h2>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={weightData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="data" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} unit=" kg" />
              <Tooltip />
              <Line type="monotone" dataKey="Peso" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Body fat chart */}
      {fatData.length >= 2 && (
        <div className="border border-border-neutral rounded-xl p-4 bg-white">
          <h2 className="text-sm font-bold text-text-primary mb-3">Evolução de Gordura Corporal</h2>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={fatData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="data" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} unit="%" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="% Gordura" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Skinfold history table */}
      {skinfoldsRaw.length > 0 && (
        <div className="border border-border-neutral rounded-xl p-4 bg-white">
          <h2 className="text-sm font-bold text-text-primary mb-3">Dobras Cutâneas</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-neutral text-left">
                <th className="pb-2 text-text-secondary font-medium">Data</th>
                <th className="pb-2 text-text-secondary font-medium">Protocolo</th>
                <th className="pb-2 text-text-secondary font-medium text-right">% Gordura</th>
                <th className="pb-2 text-text-secondary font-medium text-right">Massa Magra</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-neutral/50">
              {skinfoldsRaw.map((s) => (
                <tr key={s.id}>
                  <td className="py-2">{format(new Date(s.assessedAt), "dd/MM/yyyy", { locale: ptBR })}</td>
                  <td className="py-2 text-text-secondary">{PROTOCOL_LABEL[s.protocol] ?? s.protocol}</td>
                  <td className="py-2 text-right font-medium">{s.bodyFatPercentage?.toFixed(1) ?? "—"}%</td>
                  <td className="py-2 text-right">{s.leanMassKg?.toFixed(1) ?? "—"} kg</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Measurement history table */}
      {measurements.length > 0 && (
        <div className="border border-border-neutral rounded-xl p-4 bg-white">
          <h2 className="text-sm font-bold text-text-primary mb-3">Histórico Antropométrico</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-neutral text-left">
                {["Data", "Peso (kg)", "IMC", "Cintura (cm)", "% Gordura"].map((h) => (
                  <th key={h} className={`pb-2 font-medium text-text-secondary ${h === "Data" ? "" : "text-right"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-neutral/50">
              {measurements.map((m) => (
                <tr key={m.id}>
                  <td className="py-2">{format(new Date(m.measuredAt), "dd/MM/yyyy", { locale: ptBR })}</td>
                  <td className="py-2 text-right">{m.weight != null ? m.weight.toFixed(1) : "—"}</td>
                  <td className="py-2 text-right">{m.bmi != null ? m.bmi.toFixed(1) : "—"}</td>
                  <td className="py-2 text-right">{m.waist != null ? m.waist.toFixed(1) : "—"}</td>
                  <td className="py-2 text-right">{m.bodyFatPercentage != null ? `${m.bodyFatPercentage.toFixed(1)}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Goals */}
      {goals.length > 0 && (
        <div className="border border-border-neutral rounded-xl p-4 bg-white">
          <h2 className="text-sm font-bold text-text-primary mb-3">Metas Clínicas</h2>
          <div className="space-y-2">
            {goals.map((g) => (
              <div key={g.id} className="flex items-center justify-between py-1.5 border-b border-border-neutral/50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-text-primary">{g.title}</p>
                  <p className="text-xs text-text-secondary">{GOAL_STATUS_LABEL[g.status]}</p>
                </div>
                {g.targetValue != null && (
                  <div className="text-right text-sm">
                    <p className="font-semibold">{g.currentValue?.toFixed(1) ?? "—"} / {g.targetValue.toFixed(1)} {g.targetUnit}</p>
                    <p className="text-xs text-text-secondary">
                      {g.targetValue > 0 ? `${Math.min(Math.round(((g.currentValue ?? 0) / g.targetValue) * 100), 100)}%` : ""}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-text-secondary text-center print:text-gray-400">
        Documento gerado pelo NutriOpus — {format(generatedAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
      </p>
    </div>
  );
}
