"use client";

import React, { useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { GlobalMetricsUIData } from "@/services/global-admin.service";
import { TrendingUp, PieChart as PieIcon, BarChart3, Activity, DollarSign, Users, Building2 } from "lucide-react";

interface Props {
  metrics: GlobalMetricsUIData;
}

export function GlobalAdminCharts({ metrics }: Props) {
  const [activeChartTab, setActiveChartTab] = useState<"growth" | "plans" | "activity">("growth");

  // Format MRR for tooltip
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value / 100);
  };

  const growthData = metrics.monthlyGrowth.map((g) => ({
    ...g,
    mrrFormatted: g.mrrCents / 100,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Chart Navigation Tabs */}
      <div className="bg-card-bg border border-border-neutral rounded-2xl p-2 shadow-sm flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveChartTab("growth")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all ${
              activeChartTab === "growth"
                ? "bg-brand-blue text-white shadow-md"
                : "text-text-secondary hover:text-text-primary hover:bg-border-neutral/30"
            }`}
          >
            <TrendingUp className="w-4 h-4" /> Evolução de Crescimento & MRR
          </button>

          <button
            onClick={() => setActiveChartTab("plans")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all ${
              activeChartTab === "plans"
                ? "bg-brand-blue text-white shadow-md"
                : "text-text-secondary hover:text-text-primary hover:bg-border-neutral/30"
            }`}
          >
            <PieIcon className="w-4 h-4" /> Distribuição de Planos & Assinaturas
          </button>

          <button
            onClick={() => setActiveChartTab("activity")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all ${
              activeChartTab === "activity"
                ? "bg-brand-blue text-white shadow-md"
                : "text-text-secondary hover:text-text-primary hover:bg-border-neutral/30"
            }`}
          >
            <BarChart3 className="w-4 h-4" /> Produção Clínica Global
          </button>
        </div>

        <span className="text-[11px] font-mono text-text-secondary px-3 py-1 bg-background rounded-lg border border-border-neutral/60">
          Dados Reais • Atualizado via DB
        </span>
      </div>

      {/* Tab 1: Growth & MRR */}
      {activeChartTab === "growth" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card-bg border border-border-neutral rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" /> Trajetória de MRR & Clínicas (Últimos 6 Meses)
                </h3>
                <p className="text-xs text-text-secondary mt-1">
                  Evolução mensal comparando receita recorrente mensal (em R$) e novos cadastros de clínicas.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={growthData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorTenants" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0ece6" className="dark:stroke-slate-700/50" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} className="dark:text-slate-400" />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} className="dark:text-slate-400" tickFormatter={(val) => `R$ ${val}`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} className="dark:text-slate-400" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid #e5e0d8",
                      fontSize: 12,
                      backgroundColor: "white",
                    }}
                    formatter={(value: any, name: any) => {
                      if (name === "Receita MRR") return [formatCurrency(Number(value) * 100), name];
                      return [value, name];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="mrrFormatted"
                    name="Receita MRR"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorMrr)"
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="tenants"
                    name="Clínicas Ativas"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorTenants)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Side summary cards */}
          <div className="space-y-4 flex flex-col justify-between">
            <div className="bg-card-bg border border-border-neutral rounded-2xl p-5 shadow-sm space-y-3 flex-1">
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" /> Ticket Médio Estimado (ARPU)
              </span>
              <div className="pt-1">
                <span className="text-3xl font-extrabold text-text-primary">
                  {metrics.activeTenants > 0
                    ? formatCurrency(metrics.estimatedMrrCents / metrics.activeTenants)
                    : "R$ 0,00"}
                </span>
                <p className="text-xs text-text-secondary mt-1">Por clínica/mês considerando planos pagos e gratuitos.</p>
              </div>
            </div>

            <div className="bg-card-bg border border-border-neutral rounded-2xl p-5 shadow-sm space-y-3 flex-1">
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-brand-blue" /> Taxa de Crescimento Rápido
              </span>
              <div className="pt-1">
                <span className="text-3xl font-extrabold text-brand-blue">+{metrics.newTenantsLast30Days}</span>
                <p className="text-xs text-text-secondary mt-1">Novas clínicas ativadas nos últimos 30 dias corridos.</p>
              </div>
            </div>

            <div className="bg-card-bg border border-border-neutral rounded-2xl p-5 shadow-sm space-y-3 flex-1">
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                <Users className="w-4 h-4 text-purple-600" /> Média de Pacientes / Clínica
              </span>
              <div className="pt-1">
                <span className="text-3xl font-extrabold text-purple-600">
                  {metrics.activeTenants > 0
                    ? Math.round(metrics.totalPatients / metrics.activeTenants)
                    : 0}
                </span>
                <p className="text-xs text-text-secondary mt-1">Indicador de engajamento clínico e retenção no SaaS.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Plans & Subscriptions */}
      {activeChartTab === "plans" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card-bg border border-border-neutral rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-brand-blue" /> Adoção por Planos de Assinatura
            </h3>
            <p className="text-xs text-text-secondary">
              Proporção de clínicas cadastradas por nível de plano contratado.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-6">
              <div className="w-full sm:w-1/2 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metrics.planBreakdown}
                      dataKey="count"
                      nameKey="planName"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                      label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                    >
                      {metrics.planBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid #e5e0d8",
                        fontSize: 12,
                        backgroundColor: "white",
                      }}
                      formatter={(value: any, name: any) => [`${value} clínica(s)`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="w-full sm:w-1/2 space-y-3">
                {metrics.planBreakdown.map((p) => {
                  const percentage = metrics.totalTenants > 0 ? Math.round((p.count / metrics.totalTenants) * 100) : 0;
                  return (
                    <div key={p.planCode} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-background border border-border-neutral/60">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.fill }} />
                        <span className="font-semibold text-text-primary">{p.planName}</span>
                      </div>
                      <span className="font-mono font-bold text-text-secondary">
                        {p.count} ({percentage}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-card-bg border border-border-neutral rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-600" /> Status do Ciclo de Assinatura
            </h3>
            <p className="text-xs text-text-secondary">
              Distribuição entre contas ativas, em período de teste (trial) ou canceladas.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-6">
              <div className="w-full sm:w-1/2 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metrics.subscriptionStatusBreakdown}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                    >
                      {metrics.subscriptionStatusBreakdown.map((entry, index) => (
                        <Cell key={`cell-status-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid #e5e0d8",
                        fontSize: 12,
                        backgroundColor: "white",
                      }}
                      formatter={(value: any, name: any) => [`${value} conta(s)`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="w-full sm:w-1/2 space-y-3">
                {metrics.subscriptionStatusBreakdown.map((s) => (
                  <div key={s.status} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-background border border-border-neutral/60">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.fill }} />
                      <span className="font-semibold text-text-primary uppercase">{s.status}</span>
                    </div>
                    <span className="font-mono font-bold text-text-secondary">{s.count} conta(s)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Clinical Production */}
      {activeChartTab === "activity" && (
        <div className="bg-card-bg border border-border-neutral rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-brand-blue" /> Volume de Produção & Uso do Ecossistema
              </h3>
              <p className="text-xs text-text-secondary mt-1">
                Total consolidado de atendimentos, registros de adipômetro, anamneses e planos prescritos na base do SaaS.
              </p>
            </div>
          </div>

          <div className="pt-4">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={metrics.activityBreakdown} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0ece6" className="dark:stroke-slate-700/50" />
                <XAxis dataKey="name" tick={{ fontSize: 13, fontWeight: 600 }} className="dark:text-slate-300" />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} className="dark:text-slate-400" />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e5e0d8",
                    fontSize: 12,
                    backgroundColor: "white",
                  }}
                  formatter={(value: any) => [`${value} registro(s) no banco`, "Quantidade"]}
                />
                <Bar dataKey="count" name="Total Registrado" radius={[8, 8, 0, 0]}>
                  {metrics.activityBreakdown.map((entry, index) => (
                    <Cell key={`cell-bar-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-border-neutral/60">
            {metrics.activityBreakdown.map((act) => (
              <div key={act.name} className="p-3 rounded-xl bg-background border border-border-neutral/60 text-center">
                <span className="text-xs font-semibold text-text-secondary block">{act.name}</span>
                <span className="text-xl font-extrabold block mt-1" style={{ color: act.fill }}>
                  {act.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
