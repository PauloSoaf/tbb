"use client";

import { HabitActivityHeatmap } from "@/components/TbbCharts";
import { addDays, dateKeyToUTC, startOfWeek, yearDays } from "@/lib/dates";
import type { HabitDefinition, HabitValue } from "../logic";

type HeatmapHabit = HabitDefinition & { id: string; name: string; color: string; unit: string };

export function HabitHeatmap({ habit, entries, year, today, locale }: { habit: HeatmapHabit; entries: HabitValue[]; year: number; today: string; locale: string }) {
  const days = yearDays(year);
  const records = new Map(entries.map((entry) => [entry.date, entry]));
  const first=startOfWeek(days[0]); const last=days.at(-1)!; const columns=[];
  for(let week=first,bin=0;week<=last;week=addDays(week,7),bin++) columns.push({bin,bins:Array.from({length:7},(_,row)=>{const date=addDays(week,row);return {bin:row,date:dateKeyToUTC(date),count:date>today||date.slice(0,4)!==String(year)?0:records.get(date)?.value||0};})});
  return <div><HabitActivityHeatmap data={columns} color={habit.color} unit={habit.unit} year={year}/><p className="muted text-xs">{year.toLocaleString(locale,{useGrouping:false})} · abra o detalhe do hábito para editar um dia.</p></div>;
}
