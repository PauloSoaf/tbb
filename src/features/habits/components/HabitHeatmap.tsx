"use client";

import Link from "next/link";
import { AppTooltip } from "@/components/ui/AppTooltip";
import { formatDay, weekday, yearDays } from "@/lib/dates";
import { habitProgress, isHabitDay, type HabitDefinition, type HabitValue } from "../logic";
import styles from "../habits.module.css";

type HeatmapHabit = HabitDefinition & { id: string; name: string; color: string; unit: string };

export function HabitHeatmap({ habit, entries, year, today, locale }: { habit: HeatmapHabit; entries: HabitValue[]; year: number; today: string; locale: string }) {
  const days = yearDays(year);
  const leading = (weekday(days[0]) + 6) % 7;
  const records = new Map(entries.map((entry) => [entry.date, entry]));
  const monthOffsets = days.filter((date) => date.endsWith("-01")).map((date) => ({ date, column: Math.floor((days.indexOf(date) + leading) / 7) + 1 }));
  return <div className={styles.heatmapScroll} aria-label={`Histórico de ${habit.name} em ${year}`}>
    <div className={styles.heatmapInner}>
      <div className={styles.monthLabels}>{monthOffsets.map(({ date, column }) => <span key={date} style={{ gridColumn: column }}>{formatDay(date, locale, { month: "short" }).replace(".", "")}</span>)}</div>
      <div className={styles.heatmap}>
        {Array.from({ length: leading }, (_, index) => <span key={`blank-${index}`} className={styles.blank} />)}
        {days.map((date) => {
          const entry = records.get(date);
          const eligible = isHabitDay(habit, date);
          const future = date > today;
          const value = entry?.value ?? 0;
          const progress = habitProgress(habit, entries, date);
          const status = future ? "Dia futuro" : !eligible ? "Fora da programação" : progress.completed ? "Meta do período concluída" : value > 0 ? "Em andamento" : "Sem registro";
          const label = `${formatDay(date, locale, { day: "numeric", month: "long", year: "numeric" })}: ${value} ${habit.unit}. ${status}`;
          const level = future || !eligible || value <= 0 ? 0 : progress.completed ? 1 : Math.max(.25, Math.min(.8, progress.percent / 100));
          return <AppTooltip key={date} content={<span className={styles.tooltip}><strong>{formatDay(date, locale, { day: "numeric", month: "long", year: "numeric" })}</strong><span>{value.toLocaleString(locale)} {habit.unit} registrados</span><span>{progress.value.toLocaleString(locale)} / {habit.target.toLocaleString(locale)} no período</span><span>{status}</span>{entry?.note && <span>{entry.note}</span>}</span>}>
            <Link href={`/habits/${habit.id}?date=${date}&year=${year}`} prefetch={false} aria-label={label} className={styles.cell} data-future={future || !eligible} style={level ? { backgroundColor: habit.color, opacity: level } : undefined} />
          </AppTooltip>;
        })}
      </div>
      <div className={styles.legend}><span className="muted">{year} · clique em um dia para ver ou editar</span><span className="row" style={{ gap: 5 }}>Menos <i className={styles.cell} /><i className={styles.cell} style={{ backgroundColor: habit.color, opacity: .4 }} /><i className={styles.cell} style={{ backgroundColor: habit.color }} /> Mais</span></div>
    </div>
  </div>;
}
