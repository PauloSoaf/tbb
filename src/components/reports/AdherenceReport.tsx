"use client";

import { format, subDays, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";
import { Target, Trophy, Flame } from "lucide-react";

interface CheckIn {
  id: string;
  checkedAt: Date;
  value: number | null;
}

interface Goal {
  id: string;
  title: string;
  status: "ACTIVE" | "ACHIEVED" | "ABANDONED";
  type: string;
  checkIns: CheckIn[];
}

interface Patient {
  name: string;
}

interface Props {
  patient: Patient;
  goals: Goal[];
}

export function AdherenceReport({ patient, goals }: Props) {
  const activeGoals = goals.filter(g => g.status === "ACTIVE");
  const achievedGoals = goals.filter(g => g.status === "ACHIEVED");
  const abandonedGoals = goals.filter(g => g.status === "ABANDONED");

  const totalGoals = goals.length;
  const adherenceRate = totalGoals > 0 
    ? Math.round((achievedGoals.length / totalGoals) * 100) 
    : 0;

  // Gerar dados dos últimos 14 dias para o gráfico
  const last14Days = Array.from({ length: 14 }).map((_, i) => subDays(new Date(), 13 - i));
  
  const chartData = last14Days.map(date => {
    // Quantos checkins aconteceram neste dia?
    let count = 0;
    goals.forEach(g => {
      g.checkIns.forEach(c => {
        if (isSameDay(new Date(c.checkedAt), date)) {
          count++;
        }
      });
    });

    return {
      name: format(date, "dd/MM"),
      "Check-ins": count,
    };
  });

  // Calculate highest streak (rough approximation based on consecutive days with check-ins)
  let maxStreak = 0;
  let currentStreak = 0;
  for (let i = 0; i < chartData.length; i++) {
    if (chartData[i]["Check-ins"] > 0) {
      currentStreak++;
      if (currentStreak > maxStreak) maxStreak = currentStreak;
    } else {
      currentStreak = 0;
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-border-neutral shadow-sm">
        <h2 className="text-xl font-bold text-text-primary mb-2">Relatório de Adesão</h2>
        <p className="text-text-secondary">Visão geral do engajamento de {patient.name} com as metas estabelecidas.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-border-neutral shadow-sm flex items-center gap-4">
          <div className="bg-indigo-100 p-3 rounded-2xl text-indigo-600">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-text-secondary">Taxa de Conclusão</p>
            <p className="text-2xl font-bold text-text-primary">{adherenceRate}%</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-border-neutral shadow-sm flex items-center gap-4">
          <div className="bg-emerald-100 p-3 rounded-2xl text-emerald-600">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-text-secondary">Metas Atingidas</p>
            <p className="text-2xl font-bold text-text-primary">{achievedGoals.length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-border-neutral shadow-sm flex items-center gap-4">
          <div className="bg-amber-100 p-3 rounded-2xl text-amber-600">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-text-secondary">Maior Streak (14d)</p>
            <p className="text-2xl font-bold text-text-primary">{maxStreak} dias</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-border-neutral shadow-sm">
        <h3 className="text-lg font-bold text-text-primary mb-6">Frequência de Check-ins (Últimos 14 Dias)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} allowDecimals={false} />
            <Tooltip 
              cursor={{ fill: '#f8fafc' }} 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Bar dataKey="Check-ins" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="bg-white p-6 rounded-3xl border border-border-neutral shadow-sm">
        <h3 className="text-lg font-bold text-text-primary mb-4">Metas Ativas vs Abandonadas</h3>
        <div className="flex gap-8 items-center">
          <div className="flex-1">
             <div className="flex justify-between text-sm mb-1">
               <span className="font-medium text-emerald-700">Ativas ({activeGoals.length})</span>
               <span className="font-medium text-rose-700">Abandonadas ({abandonedGoals.length})</span>
             </div>
             <div className="h-4 flex rounded-full overflow-hidden w-full bg-gray-100">
               {totalGoals > 0 && (
                 <>
                  <div style={{ width: `${(activeGoals.length / totalGoals) * 100}%` }} className="bg-emerald-500 h-full"></div>
                  <div style={{ width: `${(achievedGoals.length / totalGoals) * 100}%` }} className="bg-indigo-500 h-full"></div>
                  <div style={{ width: `${(abandonedGoals.length / totalGoals) * 100}%` }} className="bg-rose-500 h-full"></div>
                 </>
               )}
             </div>
             <p className="text-xs text-text-secondary mt-2 text-center">A barra roxa representa metas já concluídas.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
