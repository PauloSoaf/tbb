"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface Props {
  data: { month: string; total: number; done: number }[];
}

export function MonthlyAppointmentsChart({ data }: Props) {
  return (
    <div className="bg-card-bg border border-border-neutral rounded-xl p-5">
      <h2 className="text-base font-semibold text-text-primary dark:text-slate-200 mb-4">
        Consultas por mês (últimos 6 meses)
      </h2>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0ece6" className="dark:stroke-slate-700" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} className="dark:text-slate-400" />
          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} className="dark:text-slate-400" />
          <Tooltip
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid #e5e0d8",
              fontSize: 12,
              backgroundColor: "white",
            }}
            itemStyle={{
              color: "#1f2937",
            }}
            labelStyle={{
              color: "#4b5563",
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="total" name="Agendadas" fill="#93c5fd" radius={[4, 4, 0, 0]} />
          <Bar dataKey="done" name="Realizadas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
