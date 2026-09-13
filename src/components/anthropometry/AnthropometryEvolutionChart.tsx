"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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
import { Activity } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";

interface EvolutionData {
  measuredAt: Date;
  weight: number | null;
  bmi: number | null;
  bodyFatPercentage: number | null;
  leanMassKg: number | null;
}

interface AnthropometryEvolutionChartProps {
  data: EvolutionData[];
}

export function AnthropometryEvolutionChart({ data }: AnthropometryEvolutionChartProps) {
  const { t } = useI18n();
  const chartData = useMemo(() => {
    return data.map((d) => ({
      date: format(new Date(d.measuredAt), "dd/MM/yy", { locale: ptBR }),
      fullDate: format(new Date(d.measuredAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
      weight: d.weight ?? null,
      bmi: d.bmi ?? null,
      bodyFat: d.bodyFatPercentage ?? null,
      leanMass: d.leanMassKg ?? null,
    }));
  }, [data]);

  if (chartData.length < 2) {
    return (
      <div className="bg-card-bg rounded-xl border border-border-neutral p-8 text-center h-full flex flex-col justify-center items-center min-h-[300px]">
        <Activity className="w-10 h-10 text-text-secondary/30 mb-3" />
        <h3 className="font-semibold text-text-primary mb-1">
          {t("anthropometry.patient_evolution")}
        </h3>
        <p className="text-sm text-text-secondary max-w-sm">
          {t("anthropometry.need_two_evaluations_desc")}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card-bg rounded-xl border border-border-neutral p-6">
      <h3 className="font-semibold text-text-primary mb-6">{t("anthropometry.evolution_charts")}</h3>
      
      <div className="space-y-8">
        <div>
          <h4 className="text-sm font-medium text-text-secondary mb-4 text-center">{t("anthropometry.weight_and_lean_mass")}</h4>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12, fill: "#64748B" }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <YAxis 
                  domain={['dataMin - 2', 'dataMax + 2']} 
                  tick={{ fontSize: 12, fill: "#64748B" }} 
                  axisLine={false} 
                  tickLine={false} 
                  width={40}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}
                  labelFormatter={(_, payload) => payload[0]?.payload.fullDate}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Line 
                  name="Peso (kg)"
                  type="monotone" 
                  dataKey="weight" 
                  stroke="#2563EB" 
                  strokeWidth={3} 
                  dot={{ r: 4, strokeWidth: 2 }} 
                  activeDot={{ r: 6 }} 
                  connectNulls 
                />
                <Line 
                  name="Massa Magra (kg)"
                  type="monotone" 
                  dataKey="leanMass" 
                  stroke="#10B981" 
                  strokeWidth={3} 
                  dot={{ r: 4, strokeWidth: 2 }} 
                  activeDot={{ r: 6 }} 
                  connectNulls 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="pt-6 border-t border-border-neutral">
          <h4 className="text-sm font-medium text-text-secondary mb-4 text-center">% Gordura e IMC</h4>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12, fill: "#64748B" }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <YAxis 
                  yAxisId="left"
                  domain={['dataMin - 2', 'dataMax + 2']} 
                  tick={{ fontSize: 12, fill: "#64748B" }} 
                  axisLine={false} 
                  tickLine={false} 
                  width={35}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  domain={['dataMin - 1', 'dataMax + 1']} 
                  tick={{ fontSize: 12, fill: "#64748B" }} 
                  axisLine={false} 
                  tickLine={false} 
                  width={35}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}
                  labelFormatter={(_, payload) => payload[0]?.payload.fullDate}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Line 
                  yAxisId="left"
                  name="% Gordura"
                  type="monotone" 
                  dataKey="bodyFat" 
                  stroke="#8B5CF6" 
                  strokeWidth={3} 
                  dot={{ r: 4, strokeWidth: 2 }} 
                  activeDot={{ r: 6 }} 
                  connectNulls 
                />
                <Line 
                  yAxisId="right"
                  name="IMC"
                  type="monotone" 
                  dataKey="bmi" 
                  stroke="#F59E0B" 
                  strokeWidth={3} 
                  dot={{ r: 4, strokeWidth: 2 }} 
                  activeDot={{ r: 6 }} 
                  connectNulls 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
