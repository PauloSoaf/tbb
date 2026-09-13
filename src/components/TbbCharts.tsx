"use client";

import { AreaChart } from "@/components/charts/area-chart";
import { Area } from "@/components/charts/area";
import { BarChart } from "@/components/charts/bar-chart";
import { Bar } from "@/components/charts/bar";
import { FunnelChart } from "@/components/charts/funnel-chart";
import { Grid } from "@/components/charts/grid";
import { HeatmapCells, HeatmapChart, HeatmapLegend, HeatmapTooltip, HeatmapXAxis, HeatmapYAxis, type HeatmapColumn } from "@/components/charts/heatmap";

export function FinanceFlowChart({ data }: { data: { month: string; income: number; expenses: number }[] }) {
  return <BarChart data={data} xDataKey="month" aspectRatio="2.2 / 1" margin={{left:48,right:16,top:20,bottom:34}}><Grid/><Bar dataKey="income" fill="var(--success)"/><Bar dataKey="expenses" fill="var(--danger)"/></BarChart>;
}

export function SpendingTrendChart({ data }: { data: { date: Date; spending: number }[] }) {
  return <AreaChart data={data} xDataKey="date" aspectRatio="2.4 / 1" margin={{left:48,right:16,top:20,bottom:34}}><Grid/><Area dataKey="spending" fill="var(--primary)" stroke="var(--primary)"/></AreaChart>;
}

export function CareerFunnel({ data }: { data: { label: string; value: number }[] }) {
  if (!data.some(item=>item.value)) return <p className="empty-state muted">O funil aparecerá depois da primeira candidatura.</p>;
  return <FunnelChart data={data.map((item,index)=>({...item,color:["#605de9","#716eea","#8582ed","#9a97f0","#b0aef4"][index]}))} orientation="horizontal" showValues showPercentage className="career-funnel"/>;
}

export function HabitActivityHeatmap({ data, color, unit, year }: { data: HeatmapColumn[]; color: string; unit: string; year: number }) {
  const levels=["var(--muted)",`color-mix(in srgb, ${color} 25%, var(--card))`,`color-mix(in srgb, ${color} 45%, var(--card))`,`color-mix(in srgb, ${color} 70%, var(--card))`,color] as [string,string,string,string,string];
  return <div className="bklit-heatmap" aria-label={`Atividade em ${year}`}><HeatmapChart data={data} weekStartDay={1} levelColors={levels} margin={{top:24,left:34,right:8,bottom:4}}><HeatmapCells activeScale={1.08}/><HeatmapXAxis/><HeatmapYAxis labelFormat="initial"/><HeatmapTooltip formatLabel={count=>`${count.toLocaleString("pt-BR")} ${unit}`}/><HeatmapLegend lessLabel="Menos" moreLabel="Mais"/></HeatmapChart></div>;
}
