import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/ui/ActionForm";
import { PendingSubmitButton } from "@/components/ui/PendingSubmitButton";
import { getHabitData } from "@/features/habits/queries";
import { archiveHabit, recordHabitEntry } from "@/features/habits/actions";
import { HabitForm } from "@/features/habits/components/HabitForm";
import { HabitHeatmap } from "@/features/habits/components/HabitHeatmap";
import { HabitQuickActions } from "@/features/habits/components/HabitQuickActions";
import { habitProgress, habitStats, isHabitDay } from "@/features/habits/logic";
import { formatDay, isDateKey } from "@/lib/dates";
import styles from "@/features/habits/habits.module.css";

export default async function HabitDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ date?: string; year?: string }> }) {
  const [{ id }, search] = await Promise.all([params, searchParams]);
  const { habit, today, context } = await getHabitData(id);
  if (!habit) notFound();
  const date = search.date && isDateKey(search.date) ? search.date : today;
  const year = Number(date.slice(0, 4));
  const entry = habit.entries.find((item) => item.date === date);
  const progress = habitProgress(habit, habit.entries, date);
  const stats = habitStats(habit, habit.entries, today);
  const editable = !habit.isArchived && date <= today && isHabitDay(habit, date);
  return <div className="stack">
    <header className="page-header"><div><Link href="/habits" className="muted">← Hábitos</Link><h1><span style={{ color: habit.color }}>{habit.icon}</span> {habit.name}</h1><p className="muted">{habit.description || `${habit.target} ${habit.unit} por ${habit.frequency === "DAILY" ? "dia" : habit.frequency === "WEEKLY" ? "semana" : "mês"}`}</p></div><ActionForm action={archiveHabit}><input name="id" type="hidden" value={habit.id} /><PendingSubmitButton className="button-secondary">{habit.isArchived ? "Restaurar hábito" : "Arquivar hábito"}</PendingSubmitButton></ActionForm></header>
    <div className="stat-grid"><div className="stat-card"><span className="muted">Sequência atual</span><strong>{stats.currentStreak}</strong></div><div className="stat-card"><span className="muted">Maior sequência</span><strong>{stats.longestStreak}</strong></div><div className="stat-card"><span className="muted">Conclusão</span><strong>{stats.completionRate}%</strong></div><div className="stat-card"><span className="muted">Total acumulado</span><strong>{stats.total.toLocaleString(context.workspace.locale)} <small>{habit.unit}</small></strong></div></div>
    <section className={`panel ${styles.habitCard}`}><div className="row" style={{ justifyContent: "space-between", marginBottom: 14 }}><h2>{year}</h2><div className="row" style={{ gap: 12 }}><Link href={`/habits/${id}?date=${year - 1}-01-01`} aria-label="Ano anterior">← {year - 1}</Link><Link href={`/habits/${id}?date=${year + 1}-01-01`} aria-label="Próximo ano">{year + 1} →</Link></div></div><HabitHeatmap habit={habit} entries={habit.entries} year={year} today={today} locale={context.workspace.locale} /></section>
    <section className="panel stack" style={{ padding: 20 }}><div className="page-header"><div><h2>{formatDay(date, context.workspace.locale, { day: "numeric", month: "long", year: "numeric" })}</h2><p className="muted">{progress.value.toLocaleString(context.workspace.locale)} / {habit.target.toLocaleString(context.workspace.locale)} {habit.unit} no período · {progress.completed ? "Meta concluída" : "Em andamento"}</p></div>{editable && <HabitQuickActions habitId={habit.id} date={date} type={habit.type} value={entry?.value ?? 0} completed={progress.completed} />}</div>
      <form className="row" style={{ flexWrap: "wrap", gap: 8 }}><label className="field">Escolher dia<input type="date" name="date" defaultValue={date} required /></label><button className="button-secondary" style={{ alignSelf: "end" }}>Ver dia</button></form>
      {editable ? <ActionForm key={date} action={recordHabitEntry} className="stack"><input type="hidden" name="habitId" value={id} /><input type="hidden" name="date" value={date} /><input type="hidden" name="operation" value="set" /><label className="field">Valor registrado neste dia ({habit.unit})<input type="number" name="value" min="0" max={habit.type === "BOOLEAN" ? 1 : 1000000000} step={habit.type === "BOOLEAN" ? 1 : "any"} defaultValue={entry?.value ?? 0} required /></label><label className="field">Nota<textarea name="note" rows={3} maxLength={2000} defaultValue={entry?.note ?? ""} placeholder="Como foi seu dia?" /></label><div><PendingSubmitButton className="button">Salvar registro</PendingSubmitButton></div></ActionForm> : <p className="muted">{habit.isArchived ? "Restaure o hábito para editar registros." : date > today ? "Este dia ainda não chegou." : "Este dia está fora da programação do hábito."}{entry?.note && ` Nota: ${entry.note}`}</p>}
    </section>
    <details className={`panel ${styles.editDetails}`} style={{ padding: 20 }}><summary>Editar hábito e programação</summary><HabitForm habit={habit} today={today} /></details>
    <section className="panel stack" style={{ padding: 20 }}><h2>Registros recentes</h2>{habit.entries.length === 0 ? <p className="muted">Seu primeiro registro aparecerá aqui.</p> : habit.entries.slice(-15).reverse().map((item) => <Link href={`/habits/${id}?date=${item.date}`} className="row" key={item.id} style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}><span>{formatDay(item.date, context.workspace.locale)} {item.note && <span className="muted">· {item.note}</span>}</span><span className="badge">{item.value.toLocaleString(context.workspace.locale)} {habit.unit}</span></Link>)}</section>
  </div>;
}
