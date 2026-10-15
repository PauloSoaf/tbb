"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cacheCalendarMonth, cachedCalendarMonth, type CalendarCache } from "./calendar-cache";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight, CreditCard, Plus, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { AppTooltip } from "@/components/ui/AppTooltip";
import { useI18n } from "@/lib/i18n/I18nContext";
import { calendarCopy, calendarLocale } from "./calendar-copy";
import { CardExpenseButton, CardExpenseDialog, type CardExpenseStatement } from "./CardExpenseDialog";
import { saveTransaction } from "./actions";
import { calendarDayTotals, calendarStatementDues, calendarMonthDays, calendarMonthTotals, calendarSelection, isMonthKey, shiftMonth,
  emptyDayAmounts, type FinanceCalendarCategory, type FinanceCalendarMonth, type FinanceCalendarOption } from "./calendar-core";
import { formatDay, isDateKey } from "@/lib/dates";
import { notePreview } from "./transaction-notes";
import "./finance-calendar.css";

type QuickForm = { type: "EXPENSE" | "INCOME"; description: string; amount: string; date: string; accountId: string; categoryId: string };
const emptyForm = (day: string, type: QuickForm["type"]): QuickForm => ({ type, description: "", amount: "", date: day, accountId: "", categoryId: "" });

export function FinanceSpendingCalendar({ initialMonth, today, accounts, categories, compact = false, initialDay, statements = [], canManageCards = false, canWrite = false }: {
  initialMonth: FinanceCalendarMonth;
  today: string;
  accounts: FinanceCalendarOption[];
  categories: FinanceCalendarCategory[];
  compact?: boolean;
  initialDay?: string;
  statements?: CardExpenseStatement[];
  canManageCards?: boolean;
  canWrite?: boolean;
}) {
  const router = useRouter();
  const { locale } = useI18n();
  const reduceMotion = useReducedMotion();
  const copy = calendarCopy[locale];
  const lang = calendarLocale[locale];
  const money = (cents: number) => new Intl.NumberFormat(lang, { style: "currency", currency: "BRL" }).format(cents / 100);
  const compactMoney = (cents: number) => new Intl.NumberFormat(lang, { maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
  const daysOfWeek = Array.from({ length: 7 }, (_, i) => formatDay(`2026-10-${String(5 + i).padStart(2, "0")}`, lang, { weekday: "short" }));
  const searchParams = useSearchParams();
  const [compactSelection, setCompactSelection] = useState(() => calendarSelection(initialMonth.month, initialDay, today));
  const view = compact ? compactSelection : calendarSelection(searchParams.get("month"), searchParams.get("day"), today);
  const { month, day: selected } = view;
  const [direction, setDirection] = useState(1);
  const [months, setMonths] = useState<CalendarCache>({});

  const [loadFailure, setLoadFailure] = useState<{ month: string; message: string } | null>(null);
  const [retry, setRetry] = useState(0);
  const [compactDetails, setCompactDetails] = useState(false);
  const [form, setForm] = useState<QuickForm>(emptyForm(selected, "EXPENSE"));
  const [pending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const todayMonth = today.slice(0, 7);
  const current = month === initialMonth.month ? initialMonth : cachedCalendarMonth(months, month, initialMonth);
  const error = !current && loadFailure?.month === month ? loadFailure.message : "";
  const days = useMemo(() => calendarMonthDays(month), [month]);
  const totalsByDay = useMemo(() => calendarDayTotals(current?.entries ?? [], today), [current, today]);
  const monthTotals = useMemo(() => calendarMonthTotals(totalsByDay, month), [totalsByDay, month]);
  const duesByDay = useMemo(() => calendarStatementDues(canManageCards ? statements : []), [statements, canManageCards]);
  const monthDueCents = useMemo(() => Object.entries(duesByDay).reduce((sum, [day, dues]) => day.startsWith(`${month}-`) ? sum + dues.reduce((total, due) => total + due.amountCents, 0) : sum, 0), [duesByDay, month]);
  const selectedDues = duesByDay[selected] ?? [];
  const statementName = (accountId: string) => accounts.find(account => account.id === accountId)?.name ?? copy.card;
  const billTooltip = (day: string) => `${copy.billsDue} · ${formatDay(day, lang, { day: "2-digit", month: "2-digit", year: "numeric" })}\n${(duesByDay[day] ?? []).map(due => `${statementName(due.accountId)}: ${money(due.amountCents)}`).join("\n")}\n${copy.billHint}`;
  const cellMoney = (cents: number) => compact && cents >= 100000
    ? new Intl.NumberFormat(lang, { notation: "compact", maximumFractionDigits: 1 }).format(cents / 100).replace(/\s/g, "") : compactMoney(cents);
  const chosenTotals = totalsByDay[selected] ?? emptyDayAmounts();
  const chosenEntries = useMemo(() => (current?.entries ?? []).filter(entry => entry.day === selected), [current, selected]);
  const allowedAccounts = accounts.filter(account => account.type !== "CREDIT_CARD");
  const activeCategories = categories.filter(category => category.type === form.type);
  const hasUndetailedStatements = canManageCards && statements.some(statement => statement.kind === "STATEMENT" && statement.amountCents > statement.detailedCents);

  // Native history keeps month/day shareable without triggering an unnecessary server navigation.
  function syncUrl(nextMonth: string, nextDay: string, replaceHistory = false) {
    if (compact || typeof window === "undefined" || window.location.pathname !== "/finance/calendar") return;
    const next = new URL(window.location.href);
    next.searchParams.set("month", nextMonth);
    next.searchParams.set("day", nextDay);
    const target = next.pathname + next.search + next.hash;
    if (target !== window.location.pathname + window.location.search + window.location.hash) {
      if (replaceHistory) window.history.replaceState(null, "", target);
      else window.history.pushState(null, "", target);
    }
  }

  // Returning from another financial screen/tab revalidates even the initial month.
  // Coalesce focus + visibility events; a server snapshot also invalidates the 12-month cache.
  const lastVisibilityRefresh = useRef(0);
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible" || Date.now() - lastVisibilityRefresh.current < 750) return;
      lastVisibilityRefresh.current = Date.now();
      router.refresh();
    };
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  useEffect(() => {
    if (current) return;
    const controller = new AbortController();
    fetch(`/api/finance/calendar?month=${encodeURIComponent(month)}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error(copy.loadError);
        const result: FinanceCalendarMonth = await response.json();
        if (result.month !== month || !Array.isArray(result.entries)) throw new Error(copy.loadError);
        return result;
      })
      .then(result => {
        if (!controller.signal.aborted) {
          setMonths(previous => cacheCalendarMonth(previous, result, initialMonth));
          setLoadFailure(null);
        }
      })
      .catch(reason => { if (!controller.signal.aborted) setLoadFailure({ month, message: reason instanceof Error ? reason.message : copy.loadError }); });
    return () => controller.abort();
  }, [month, current, initialMonth, copy.loadError, retry]);

  function retryLoad() { setLoadFailure(null); setRetry(value => value + 1); }

  function moveTo(value: string, targetDay?: string) {
    if (!isMonthKey(value) || value === "9998-12") return;
    const nextDay = targetDay && isDateKey(targetDay) && targetDay.startsWith(`${value}-`) ? targetDay : value === todayMonth ? today : `${value}-01`;
    setDirection(value >= month ? 1 : -1);
    if (compact) setCompactSelection({ month: value, day: nextDay });
    setCompactDetails(false);
    setLoadFailure(null);
    syncUrl(value, nextDay);
  }
  function moveBy(offset: number) {
    try { moveTo(shiftMonth(month, offset)); } catch { /* Supported date range boundary. */ }
  }
  function selectDay(day: string) {
    if (!isDateKey(day)) return;
    if (!day.startsWith(`${month}-`)) moveTo(day.slice(0, 7), day);
    else { if (compact) setCompactSelection({ month, day }); syncUrl(month, day); }
    if (compact) setCompactDetails(true);
  }
  function openAdd(type: QuickForm["type"]) {
    if (!canWrite) return;
    setForm(emptyForm(selected, type));
    dialogRef.current?.showModal();
  }
  function reset() { moveTo(todayMonth, today); }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWrite) return;
    startTransition(async () => {
      const fields = new FormData();
      fields.set("type", form.type);
      fields.set("date", form.date);
      fields.set("description", form.description.trim());
      fields.set("amount", form.amount.trim());
      fields.set("accountId", form.accountId);
      fields.set("categoryId", form.categoryId);
      try {
        const result = await saveTransaction(fields);
        if ("error" in result) { toast.error(result.error || copy.saveError); return; }
        dialogRef.current?.close();
        toast.success(result.success);
        const savedMonth = form.date.slice(0, 7);
        if (compact) { setCompactSelection({ month: savedMonth, day: form.date }); setCompactDetails(true); }
        setMonths({});
        syncUrl(savedMonth, form.date, true);
        router.refresh();
      } catch { toast.error(copy.saveError); }
    });
  }

  const monthName = formatDay(`${month}-01`, lang, { month: "long", year: "numeric" });
  const dateName = formatDay(selected, lang, { weekday: "long", day: "numeric", month: "long" });
  const title = monthName.charAt(0).toLocaleUpperCase(lang) + monthName.slice(1);
  const variants = { enter: (dir: number) => ({ opacity: 0, x: reduceMotion ? 0 : dir * 28 }), center: { opacity: 1, x: 0 }, exit: (dir: number) => ({ opacity: 0, x: reduceMotion ? 0 : dir * -28 }) };

  return <section className={`finance-spending-calendar ${compact ? "is-compact" : "is-full"}`} aria-label={copy.title}>
    <header className="finance-cal-header">
      <div className="finance-cal-heading"><span className="finance-cal-brand"><CalendarDays size={18}/></span><div>{!compact && <span className="finance-cal-eyebrow">{copy.daily}</span>}<h2>{compact ? copy.compactTitle : copy.title}</h2>{!compact && <p>{copy.hint}</p>}</div>{compact && <Link className="finance-cal-full-link" href={`/finance/calendar?month=${month}&day=${selected}`}>{copy.full} <ArrowRight size={14}/></Link>}</div>
      <div className="finance-cal-actions">
        <button type="button" className="finance-cal-icon-button" onClick={() => moveBy(-1)} aria-label={copy.previous} disabled={month === "1900-01"}><ChevronLeft size={18}/></button>
        <label className="finance-cal-month-picker"><span>{title}</span><input aria-label={copy.chooseMonth} type="month" value={month} min="1900-01" max="9998-11" onChange={event => moveTo(event.target.value)}/></label>
        <button type="button" className="finance-cal-icon-button" onClick={() => moveBy(1)} aria-label={copy.next} disabled={month === "9998-11"}><ChevronRight size={18}/></button>
        <button type="button" className="finance-cal-today" onClick={reset}><RotateCcw size={13}/> {copy.today}</button>
      </div>
    </header>
    <div className="finance-cal-metrics" aria-live="polite" aria-busy={!current}><span><ArrowUpRight size={13}/> {copy.expenses} <strong>{current ? money(monthTotals.expenseCents) : "…"}</strong></span>{compact && monthTotals.scheduledExpenseCents > 0 && <span>{copy.scheduled}: <strong>{money(monthTotals.scheduledExpenseCents)}</strong></span>}{!compact && <><span><ArrowDownLeft size={13}/> {copy.income} <strong>{current ? money(monthTotals.incomeCents) : "…"}</strong></span><span className="finance-cal-result">{copy.result} <strong>{current ? money(monthTotals.incomeCents - monthTotals.expenseCents) : "…"}</strong></span></>}</div>
    {monthDueCents > 0 && <div className="finance-cal-dues-total"><AppTooltip content={copy.billHint}><span><CreditCard size={13} aria-hidden="true"/>{copy.billsDue} <strong>{money(monthDueCents)}</strong></span></AppTooltip></div>}
    {!compact && (monthTotals.scheduledExpenseCents > 0 || monthTotals.scheduledIncomeCents > 0) && <div className="finance-cal-metrics"><span>{copy.scheduled} · {copy.expenses}: <strong>{money(monthTotals.scheduledExpenseCents)}</strong></span><span>{copy.income}: <strong>{money(monthTotals.scheduledIncomeCents)}</strong></span></div>}
    <div className="finance-cal-body" data-compact={compact || undefined}>
      <div className="finance-cal-month-area" onTouchStart={event => { const point = event.touches[0]; touchStart.current = point ? { x: point.clientX, y: point.clientY } : null; }} onTouchEnd={event => { const point = event.changedTouches[0]; const start = touchStart.current; if (point && start) { const dx = point.clientX - start.x; const dy = point.clientY - start.y; if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) moveBy(dx < 0 ? 1 : -1); } touchStart.current = null; }}>
        <div className="finance-cal-weekdays" aria-hidden="true">{daysOfWeek.map(day => <span key={day}>{day}</span>)}</div>
        {error && <div className="finance-cal-error" role="alert">{error}<button type="button" onClick={retryLoad}>{copy.retry}</button></div>}
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div key={month} className="finance-cal-days" role="group" aria-label={title} custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: reduceMotion ? 0 : 0.2 }}>
            {days.map(day => {
              const outside = !day.startsWith(`${month}-`);
              const value = outside ? undefined : totalsByDay[day];
              const selectedDay = day === selected;
              const dues = outside ? [] : duesByDay[day] ?? [];
              const dueCents = dues.reduce((sum, due) => sum + due.amountCents, 0);
              const billLabel = dues.length ? `, ${copy.billsDue.toLowerCase()} ${money(dueCents)} · ${dues.map(due => statementName(due.accountId)).join(", ")}` : "";
              const dailyLabel = outside ? `${new Intl.DateTimeFormat(lang, { dateStyle: "full", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`))}: ${copy.openAdjacent}` : `${new Intl.DateTimeFormat(lang,{dateStyle:"full",timeZone:"UTC"}).format(new Date(`${day}T00:00:00Z`))}: ${!current ? copy.loading : value ? `${money(value.expenseCents + value.scheduledExpenseCents)}${day > today ? ` (${copy.scheduled})` : ""}` : copy.noSpending}${(value?.incomeCents || value?.scheduledIncomeCents) ? `, ${copy.income.toLowerCase()} ${money(value.incomeCents + value.scheduledIncomeCents)}` : ""}`;
              const cell = <button type="button" className="finance-cal-day" data-scheduled={day > today || undefined} data-selected={selectedDay || undefined} data-today={day === today || undefined} data-outside={outside || undefined} data-bills={dues.length > 0 || undefined} data-spending={Boolean(value?.expenseCents || value?.scheduledExpenseCents) || undefined} onClick={() => selectDay(day)} aria-label={dailyLabel + billLabel} aria-pressed={selectedDay} aria-expanded={compact ? selectedDay && compactDetails : undefined} aria-controls={compact ? "finance-cal-details" : undefined} data-day={day} disabled={!isDateKey(day) || !isMonthKey(day.slice(0, 7)) || day.startsWith("9998-12") || (!current && !outside && !dues.length)}>
                <span className="finance-cal-day-number">{Number(day.slice(8))}</span>
                <span className="finance-cal-day-money">{!outside && (value?.expenseCents || value?.scheduledExpenseCents) ? `−${cellMoney(value.expenseCents + value.scheduledExpenseCents)}` : ""}</span>
                {dues.length > 0 && <span className="finance-cal-bill-badge"><CreditCard size={compact ? 9 : 11} aria-hidden="true"/><span>{cellMoney(dueCents)}</span></span>}
                <span className="finance-cal-day-dots" aria-hidden="true">{Boolean(value?.incomeCents || value?.scheduledIncomeCents) && <i className="income"/>}{Boolean(value?.expenseCents || value?.scheduledExpenseCents) && <i className="expense"/>}</span>
              </button>;
              return <AppTooltip key={day} content={<span className="finance-cal-tooltip-copy">{dues.length ? billTooltip(day) : dailyLabel}</span>} disabled={outside || (!current && !dues.length)} className="finance-cal-day-tooltip">{cell}</AppTooltip>;
            })}
          </motion.div>
        </AnimatePresence>
        {!current && !error && <p className="finance-cal-loading" role="status">{copy.loading}</p>}
        {!compact && <p className="finance-cal-hint">{copy.swipe}</p>}
      </div>
      {(!compact || compactDetails) && <aside className="finance-cal-day-panel" id="finance-cal-details" aria-busy={!current} aria-label={`${copy.entries} · ${dateName}`}>
        <div className="finance-cal-day-heading"><div><span>{copy.selected}</span><h3>{dateName}</h3></div><span className="finance-cal-count">{current ? `${chosenTotals.count} ${copy.entries}` : "…"}</span>{compact && <button type="button" className="finance-cal-icon-button" aria-label={copy.close} onClick={() => setCompactDetails(false)}><X size={14}/></button>}</div>
        {selected > today && <small className="muted">{copy.future}</small>}
        <div className="finance-cal-day-summary"><span>{copy.expenses} <strong>{current ? money(chosenTotals.expenseCents + chosenTotals.scheduledExpenseCents) : "…"}</strong></span><span>{copy.income} <strong>{current ? money(chosenTotals.incomeCents + chosenTotals.scheduledIncomeCents) : "…"}</strong></span></div>
        {selectedDues.length > 0 && <div className="finance-cal-bills">
          <h4><CreditCard size={14}/>{copy.billsDue}</h4>
          {selectedDues.map(due => <Link href="/finance/statements" className="finance-cal-bill-entry" key={due.id}>
            <CreditCard size={15} aria-hidden="true"/><span><strong>{statementName(due.accountId)}</strong><small>{copy.billDue} {formatDay(selected, lang, { day: "2-digit", month: "2-digit" })}</small></span><b>{money(due.amountCents)}</b><ArrowRight size={13} aria-hidden="true"/>
          </Link>)}
          <p>{copy.billHint}</p>
        </div>}
        <div className="finance-cal-entry-list" aria-live="polite">
          {!current && <p className="finance-cal-hint" role="status">{error || copy.loading}</p>}
          {current && chosenEntries.length === 0 && <div className="finance-cal-empty"><CalendarDays size={22}/><p>{copy.empty}</p></div>}
          {chosenEntries.map(entry => {
            const positive = entry.type === "INCOME" || entry.type === "REFUND";
            return <article className="finance-cal-entry" key={entry.id}>
              <span className="finance-cal-entry-icon" data-positive={positive || undefined}>{positive ? <ArrowDownLeft size={16}/> : entry.type === "TRANSFER" ? <ArrowRight size={16}/> : <ArrowUpRight size={16}/>}</span>
              <div><strong>{entry.merchant || entry.description}</strong>{entry.notes && <small className="finance-cal-note" title={entry.notes}>{notePreview(entry.notes, 140)}</small>}<small>{entry.merchant ? `${entry.description} · ` : ""}{entry.categoryName || (entry.type === "TRANSFER" ? copy.transfer : entry.type === "ADJUSTMENT" ? copy.adjustment : copy.noCategory)} · {entry.accountName}</small>{entry.isCardPurchase && <small><CreditCard size={11} className="inline mr-1"/>{entry.cardStatementId ? copy.linked : copy.cardPurchase}</small>}{entry.occurredAt && entry.occurredTimezone && <small>{new Date(entry.occurredAt).toLocaleTimeString(locale, { timeZone: entry.occurredTimezone, hour: "2-digit", minute: "2-digit" })} · {entry.occurredTimezone}</small>}{entry.postedDate && entry.postedDate !== entry.day && <small>{copy.postedDate}: {entry.postedDate}</small>}{entry.day > today && <small>{copy.scheduled}</small>}</div>
              <strong className="finance-cal-entry-amount" data-positive={positive || undefined}>{positive ? "+" : entry.type === "TRANSFER" || entry.type === "ADJUSTMENT" ? "" : "−"}{money(entry.amountCents)}</strong>
            </article>;
          })}
        </div>
        {hasUndetailedStatements && <p className="finance-cal-aggregate-hint">{copy.undetailedHint} <Link href="/finance/statements">{copy.viewStatements}</Link></p>}
        <div className="finance-cal-day-footer">{canWrite && <><button type="button" className="button" onClick={() => openAdd("EXPENSE")}><Plus size={15}/> {copy.expense}</button><button type="button" className="button-secondary" onClick={() => openAdd("INCOME")}><Plus size={15}/> {copy.revenue}</button></>}{canWrite && canManageCards && <CardExpenseButton date={selected} className="finance-cal-credit-link"><CreditCard size={14}/>{copy.card}</CardExpenseButton>}</div>
        {!compact && <Link className="finance-cal-all-link" href="/finance/transactions">{copy.all} <ArrowRight size={14}/></Link>}
      </aside>}
    </div>
    {canWrite && <dialog ref={dialogRef} className="modal finance-calendar-add-dialog" onClick={event => { if (event.target === event.currentTarget) dialogRef.current?.close(); }}>
      <div className="modal-content" aria-busy={pending}>
        <div className="row justify-between"><div><span className="eyebrow">{copy.quick}</span><h2>{form.type === "EXPENSE" ? copy.addExpense : copy.addIncome}</h2></div><button className="icon-button" type="button" aria-label={copy.close} onClick={() => dialogRef.current?.close()}><X size={18}/></button></div>
        <form onSubmit={save}><fieldset className="form-grid finance-cal-add-form" disabled={pending}>
          <label>{copy.type}<select name="type" value={form.type} onChange={event => setForm(previous => ({ ...previous, type: event.target.value as QuickForm["type"], categoryId: "" }))}><option value="EXPENSE">{copy.expense}</option><option value="INCOME">{copy.revenue}</option></select></label>
          <label>{copy.date}<input name="date" type="date" min="1900-01-01" max="2200-12-31" value={form.date} onChange={event => setForm(previous => ({ ...previous, date: event.target.value }))} required/></label>
          <label className="finance-cal-wide">{copy.description}<input name="description" type="text" value={form.description} onChange={event => setForm(previous => ({ ...previous, description: event.target.value }))} maxLength={200} placeholder={copy.example} autoFocus required/></label>
          <label>{copy.amount}<input name="amount" inputMode="decimal" value={form.amount} onChange={event => setForm(previous => ({ ...previous, amount: event.target.value }))} placeholder="0,00" required/></label>
          <label>{copy.account}<select name="accountId" value={form.accountId} onChange={event => setForm(previous => ({ ...previous, accountId: event.target.value }))}><option value="">{copy.unassigned}</option>{allowedAccounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
          <label className="finance-cal-wide">{copy.category}<select name="categoryId" value={form.categoryId} onChange={event => setForm(previous => ({ ...previous, categoryId: event.target.value }))}><option value="">{copy.noCategory}</option>{activeCategories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <p className="finance-cal-wide finance-cal-form-hint">{copy.cardHint}</p>
          <div className="finance-cal-wide row justify-between">{canManageCards && <button type="button" className="button-secondary" onClick={() => { dialogRef.current?.close(); window.dispatchEvent(new CustomEvent("tbb:card-expense", { detail: { date: form.date } })); }}><CreditCard size={14}/>{copy.card}</button>}<button className="button" type="submit" disabled={pending || !isDateKey(form.date) || !form.description.trim() || !form.amount.trim()}>{pending ? copy.saving : copy.save}</button></div>
        </fieldset></form>
      </div>
    </dialog>}
    {canWrite && canManageCards && <CardExpenseDialog today={selected} cards={accounts.filter(a => a.type === "CREDIT_CARD").map(a => ({ id: a.id, name: a.name, institution: null }))} categories={categories.filter(c => c.type === "EXPENSE")} statements={statements} onSaved={date => { setMonths({}); if (compact) { setCompactSelection({ month: date.slice(0, 7), day: date }); setCompactDetails(true); } syncUrl(date.slice(0, 7), date, true); }}/> }
    {!compact && <p className="finance-cal-hint">{copy.registeredHint}</p>}
  </section>;
}
