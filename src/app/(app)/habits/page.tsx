import Link from "next/link";
import type { CSSProperties } from "react";
import { getHabitsData } from "@/features/habits/queries";
import { habitProgress, habitStats, isHabitDay } from "@/features/habits/logic";
import { HabitForm } from "@/features/habits/components/HabitForm";
import { HabitHeatmap } from "@/features/habits/components/HabitHeatmap";
import { HabitQuickActions } from "@/features/habits/components/HabitQuickActions";
import { addDays, daysBetween, endOfMonth, formatDay, startOfMonth, startOfWeek, weekday } from "@/lib/dates";
import styles from "@/features/habits/habits.module.css";

const views = [{ id: "today", label: "Hoje" }, { id: "week", label: "Semana" }, { id: "month", label: "Mês" }, { id: "year", label: "Ano" }, { id: "stats", label: "Estatísticas" }];
const periods = { DAILY: "dia", WEEKLY: "semana", MONTHLY: "mês" };

export default async function HabitsPage({ searchParams }: { searchParams: Promise<{ view?: string; year?: string; archived?: string }> }) {
  const params = await searchParams;
  const { habits, today, context } = await getHabitsData();
  const view = views.some((item) => item.id === params.view) ? params.view! : "year";
  const currentYear = Number(today.slice(0, 4));
  const year = /^\d{4}$/.test(params.year ?? "") && Number(params.year) >= 1900 && Number(params.year) <= currentYear + 1 ? Number(params.year) : currentYear;
  const archived = params.archived === "true";
  const visible = habits.filter((habit) => habit.isArchived === archived && (view !== "today" || isHabitDay(habit, today)));
  const activeToday = habits.filter((habit) => !habit.isArchived && isHabitDay(habit, today));
  const completeToday = activeToday.filter((habit) => habitProgress(habit, habit.entries, today).completed).length;
  const totalStats = habits.filter((habit) => !habit.isArchived).map((habit) => habitStats(habit, habit.entries, today));
  const totalPeriods = totalStats.reduce((sum, item) => sum + item.totalPeriods, 0);
  const overallRate = totalPeriods ? Math.round(totalStats.reduce((sum, item) => sum + item.completedPeriods, 0) / totalPeriods * 100) : 0;
  const monthDays = daysBetween(startOfMonth(today), endOfMonth(today));
  const dates = view === "week" ? daysBetween(startOfWeek(today), addDays(startOfWeek(today), 6)) : monthDays;
  return <div className="stack">
    <header className="page-header"><div><p className="muted">LIFE / HABITS</p><h1>Pequenos passos. Todos os dias.</h1><p className="muted">Construa uma rotina que faça sentido para você.</p></div><a className="button" href="#new-habit">+ Novo hábito</a></header>
    <div className="stat-grid"><div className="stat-card"><span className="muted">Concluídos hoje</span><strong>{completeToday}<small className="muted"> / {activeToday.length}</small></strong></div><div className="stat-card"><span className="muted">Hábitos ativos</span><strong>{habits.filter((habit) => !habit.isArchived).length}</strong></div><div className="stat-card"><span className="muted">Metas concluídas</span><strong>{overallRate}%</strong></div><div className="stat-card"><span className="muted">Maior sequência</span><strong>{Math.max(0, ...totalStats.map((item) => item.longestStreak))}<small className="muted"> períodos</small></strong></div></div>
    <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}><nav className="tabs" aria-label="Visualização de hábitos">{views.map((item) => <Link key={item.id} href={`/habits?view=${item.id}&year=${year}${archived ? "&archived=true" : ""}`} aria-current={view === item.id ? "page" : undefined}>{item.label}</Link>)}</nav><div className="row" style={{ gap: 12 }}><Link href={`/habits?view=${view}&archived=${!archived}`} className="muted">{archived ? "Ver ativos" : "Arquivados"}</Link>{view === "year" && <form className="row" style={{ gap: 6 }}><input type="hidden" name="view" value="year" />{archived && <input type="hidden" name="archived" value="true" />}<label className="sr-only" htmlFor="habit-year">Ano</label><input id="habit-year" name="year" type="number" defaultValue={year} min="1900" max={currentYear + 1} style={{ width: 80 }} /><button className="button-secondary">Ver</button></form>}</div></div>
    {visible.length === 0 && <div className="empty-state panel"><h2>{archived ? "Nenhum hábito arquivado" : view === "today" ? "Sua agenda de hábitos está livre hoje" : "Sua próxima versão começa aqui"}</h2><p className="muted">{archived ? "Hábitos arquivados preservam seu histórico." : "Crie um hábito com uma meta pequena e acompanhe sua evolução."}</p></div>}
    {visible.map((habit) => {
      const progress = habitProgress(habit, habit.entries, today);
      const stats = habitStats(habit, habit.entries, today);
      const todayEntry = habit.entries.find((entry) => entry.date === today);
      return <article className={`panel ${styles.habitCard}`} key={habit.id} style={{ "--habit-color": habit.color } as CSSProperties}>
        <div className={styles.habitHeader}><div style={{ flex: "1 1 240px", minWidth: 0 }}><div className={styles.habitName}><span className={styles.habitIcon}>{habit.icon}</span><div><h2><Link href={`/habits/${habit.id}`}>{habit.name}</Link></h2><div className={styles.habitMeta}><span>{habit.target.toLocaleString(context.workspace.locale)} {habit.unit} / {periods[habit.frequency]}</span><span>{stats.completionRate}% concluído</span><span>{stats.currentStreak} {periods[habit.frequency]}{stats.currentStreak !== 1 ? "s" : ""} em sequência</span></div></div></div></div><div className="row" style={{ gap: 14, flexWrap: "wrap" }}><span className="badge">{progress.percent}%</span>{!habit.isArchived && isHabitDay(habit, today) && <HabitQuickActions habitId={habit.id} date={today} type={habit.type} completed={progress.completed} value={todayEntry?.value ?? 0} />}</div></div>
        {view === "year" && <HabitHeatmap habit={habit} entries={habit.entries} year={year} today={today} locale={context.workspace.locale} />}
        {view === "today" && <><p className="muted">{progress.value.toLocaleString(context.workspace.locale)} / {habit.target.toLocaleString(context.workspace.locale)} {habit.unit}{todayEntry?.note ? ` · ${todayEntry.note}` : ""}</p><div className={styles.progressTrack}><div style={{ width: `${progress.percent}%`, background: habit.color, height: "100%" }} /></div><Link href={`/habits/${habit.id}?date=${today}`} className="muted" style={{ display: "inline-block", marginTop: 10 }}>Editar valor e nota →</Link></>}
        {(view === "week" || view === "month") && <div className={styles.dayGrid}>{view === "month" && Array.from({ length: (weekday(dates[0]) + 6) % 7 }, (_, index) => <span key={`blank-${index}`} />)}{dates.map((date) => { const entry = habit.entries.find((item) => item.date === date); const done = isHabitDay(habit, date) && habitProgress(habit, habit.entries, date).completed; return <Link key={date} href={`/habits/${habit.id}?date=${date}`} className={styles.day} data-complete={done} data-future={date > today || !isHabitDay(habit, date)} aria-label={`${formatDay(date, context.workspace.locale)}: ${entry?.value ?? 0} ${habit.unit}${done ? ", meta concluída" : ""}`}><span>{formatDay(date, context.workspace.locale, view === "week" ? { weekday: "short" } : { day: "numeric" })}</span><strong>{done ? "✓ " : ""}{entry?.value ?? "·"}</strong></Link>; })}</div>}
        {view === "stats" && <><div className="stat-grid"><div className="stat-card"><span className="muted">Maior sequência</span><strong>{stats.longestStreak}</strong></div><div className="stat-card"><span className="muted">Consistência da semana</span><strong>{stats.weeklyConsistency}%</strong></div><div className="stat-card"><span className="muted">Consistência do mês</span><strong>{stats.monthlyConsistency}%</strong></div><div className="stat-card"><span className="muted">Média por dia programado</span><strong>{stats.average.toLocaleString(context.workspace.locale, { maximumFractionDigits: 1 })}</strong></div></div><p className="muted" style={{ marginTop: 12 }}>Total: {stats.total.toLocaleString(context.workspace.locale)} {habit.unit} · Melhor dia: {stats.bestWeekday === null ? "—" : ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"][stats.bestWeekday]} · Menor consistência: {stats.worstWeekday === null ? "—" : ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"][stats.worstWeekday]}</p><p className="muted">Sequências contam {periods[habit.frequency]}s. Metas semanais e mensais somam os registros do período; consistência mede os dias com atividade.</p></>}
      </article>;
    })}
    <section className="panel" id="new-habit" style={{ padding: 20 }}><h2 style={{ marginBottom: 18 }}>Novo hábito</h2><HabitForm today={today} /></section>
  </div>;
}
