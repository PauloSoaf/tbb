"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { addDays, formatDay, isDateKey, startOfWeek } from "@/lib/dates";
import { useFinanceWriteAccess } from "@/features/finance/FinanceWriteAccess";
import type { CareerData } from "./queries";
import { calendarProjection, type CareerCalendarEvent } from "./calendar";
import { eventTypes, eventStatuses } from "./schemas";
import { CareerDrawer, CareerEmpty, SafeLink } from "./ui";
import { EventForm } from "./EventForm";
export function CareerCalendar({
  data,
  compact = false,
}: {
  data: CareerData;
  compact?: boolean;
}) {
  const router = useRouter(),
    path = usePathname(),
    search = useSearchParams(),
    canWrite = useFinanceWriteAccess();
  const [miniMonth, setMiniMonth] = useState(data.today.slice(0, 7)),
    [miniDay, setMiniDay] = useState(data.today),
    [selected, setSelected] = useState<CareerCalendarEvent | null>(null);
  const month = compact
      ? miniMonth
      : isDateKey(`${search.get("month")}-01`)
        ? search.get("month")!
        : data.today.slice(0, 7),
    day = compact
      ? miniDay
      : isDateKey(search.get("day") ?? "")
        ? search.get("day")!
        : month === data.today.slice(0, 7)
          ? data.today
          : `${month}-01`,
    mode = compact
      ? "month"
      : ["month", "week", "agenda"].includes(search.get("cv") ?? "")
        ? search.get("cv")!
        : "month";
  const events = calendarProjection(data),
    days = Array.from({ length: mode === "week" ? 7 : 42 }, (_, i) =>
      addDays(startOfWeek(mode === "week" ? day : `${month}-01`), i),
    );
  function navigate(next: { month?: string; day?: string; cv?: string }) {
    if (compact) {
      if (next.month) setMiniMonth(next.month);
      if (next.day) setMiniDay(next.day);
      return;
    }
    const p = new URLSearchParams(search.toString());
    for (const [k, v] of Object.entries(next)) if (v) p.set(k, v);
    router.replace(path + "?" + p, { scroll: false });
  }
  function move(amount: number) {
    if (mode === "week") {
      const d = addDays(day, amount * 7);
      navigate({ day: d, month: d.slice(0, 7) });
      return;
    }
    const date = new Date(`${month}-15T12:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + amount);
    const m = date.toISOString().slice(0, 7);
    navigate({ month: m, day: `${m}-01` });
  }
  const dayEvents = events.filter((e) => e.day === day),
    agenda = events.filter((e) => e.day.startsWith(month));
  const original =
    selected?.kind === "interview"
      ? data.interviews.find((e) => e.id === selected.id)
      : selected?.kind === "event"
        ? data.events.find((e) => e.id === selected.id)
        : null;
  const renderEvent = (e: CareerCalendarEvent) => (
    <button
      key={e.id}
      type="button"
      className="career-cal-event"
      data-type={e.type}
      data-cancelled={e.status === "CANCELLED" || undefined}
      onClick={() => setSelected(e)}
      title={`${eventTypes[e.type as keyof typeof eventTypes]} · ${e.title}${e.time ? ` · ${e.time}` : ""}`}
    >
      <span>{e.time}</span>
      <strong>{e.title}</strong>
    </button>
  );
  return (
    <section
      className={`career-calendar ${compact ? "is-compact" : ""}`}
      aria-label="Calendário de carreira"
    >
      <header>
        <div>
          <span className="career-eyebrow">PRÓXIMAS CONVERSAS</span>
          <h2>{compact ? "Sua agenda" : "Calendário de carreira"}</h2>
        </div>
        {compact ? (
          <Link href="/career/calendar">Ver mês ↗</Link>
        ) : (
          canWrite && (
            <CareerDrawer
              title="Adicionar evento"
              trigger={
                <>
                  <Plus size={14} /> Evento
                </>
              }
            >
              <EventForm data={data} day={day} />
            </CareerDrawer>
          )
        )}
      </header>
      <div className="career-calendar-tools">
        <button
          className="icon-button"
          type="button"
          aria-label="Período anterior"
          onClick={() => move(-1)}
        >
          <ChevronLeft size={16} />
        </button>
        <strong>
          {formatDay(`${month}-01`, "pt-BR", {
            month: "long",
            year: "numeric",
          })}
        </strong>
        <button
          className="icon-button"
          type="button"
          aria-label="Próximo período"
          onClick={() => move(1)}
        >
          <ChevronRight size={16} />
        </button>
        <button
          type="button"
          className="career-cell-link"
          onClick={() =>
            navigate({ month: data.today.slice(0, 7), day: data.today })
          }
        >
          Hoje
        </button>
      </div>
      {!compact && (
        <div className="career-calendar-viewbar">
          <div className="career-segmented">
            {[
              ["month", "Mês"],
              ["week", "Semana"],
              ["agenda", "Agenda"],
            ].map(([v, l]) => (
              <button
                type="button"
                aria-pressed={v === mode}
                key={v}
                onClick={() => navigate({ cv: v })}
              >
                {l}
              </button>
            ))}
          </div>
          <small>Fuso: {data.timeZone}</small>
        </div>
      )}
      {mode === "agenda" ? (
        <div className="career-agenda">
          {agenda.map((e) => (
            <div key={e.id}>
              <time>
                {formatDay(e.day, "pt-BR", { day: "2-digit", month: "short" })}
              </time>
              {renderEvent(e)}
              <span>
                {eventTypes[e.type as keyof typeof eventTypes]} ·{" "}
                {e.duration ? `${e.duration} min` : "Dia todo"}
              </span>
            </div>
          ))}
          {!agenda.length && (
            <CareerEmpty
              title="Uma agenda com espaço para o próximo passo"
              description="Entrevistas, follow-ups, metas e prazos aparecem aqui."
            />
          )}
        </div>
      ) : (
        <div
          className={`career-month-grid ${mode === "week" ? "is-week" : ""}`}
          role="grid"
          aria-label="Dias do calendário"
        >
          {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
            <span className="career-weekday" role="columnheader" key={d}>
              {d}
            </span>
          ))}
          {days.map((d) => {
            const items = events.filter((e) => e.day === d);
            return (
              <div
                key={d}
                role="gridcell"
                className="career-cal-day"
                data-outside={!d.startsWith(month) || undefined}
                data-today={d === data.today || undefined}
                data-selected={d === day || undefined}
              >
                <button
                  type="button"
                  className="career-cal-day-number"
                  aria-label={`${formatDay(d, "pt-BR", { day: "numeric", month: "long" })}; ${items.length} evento(s)`}
                  onClick={() => navigate({ day: d })}
                >
                  {Number(d.slice(-2))}
                  {compact && items.length > 0 && (
                    <span className="career-day-dot" />
                  )}
                </button>
                {!compact && items.slice(0, 3).map(renderEvent)}
                {!compact && items.length > 3 && (
                  <button
                    type="button"
                    className="career-cell-link"
                    onClick={() => navigate({ day: d })}
                  >
                    +{items.length - 3} eventos
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      <section className="career-selected-day" aria-label="Agenda do dia">
        <div className="row justify-between">
          <h3>
            {formatDay(day, "pt-BR", {
              weekday: "long",
              day: "numeric",
              month: "short",
            })}
          </h3>
          {canWrite && (
            <CareerDrawer
              title="Adicionar evento neste dia"
              trigger={<Plus size={14} />}
              className="icon-button"
            >
              <EventForm data={data} day={day} />
            </CareerDrawer>
          )}
        </div>
        {dayEvents.length ? (
          dayEvents.map((e) => (
            <div className="career-agenda-item" key={e.id}>
              {renderEvent(e)}
              <small>
                {eventTypes[e.type as keyof typeof eventTypes]}
                {e.duration ? ` · ${e.duration} min` : ""} ·{" "}
                {eventStatuses[e.status as keyof typeof eventStatuses] ??
                  e.status}
              </small>
            </div>
          ))
        ) : (
          <p className="career-note">
            Nenhum evento neste dia. Defina um próximo passo ou agende uma
            conversa.
          </p>
        )}
      </section>
      {selected && (
        <CareerDrawer
          title={selected.title}
          trigger="Evento"
          className="career-hidden"
          open
          onClose={() => setSelected(null)}
        >
          {original ? (
            <EventForm
              key={`${original.id}:${original.revision}`}
              data={data}
              event={{ ...original, type: selected.type }}
            />
          ) : (
            <div className="stack">
              <p>
                {eventTypes[selected.type as keyof typeof eventTypes]} ·{" "}
                {formatDay(selected.day)}
              </p>
              {selected.applicationId ? (
                <Link
                  className="button"
                  href={`/career/applications?record=${selected.applicationId}`}
                >
                  Abrir candidatura
                </Link>
              ) : (
                <Link className="button" href="/career/statistics">
                  Revisar meta
                </Link>
              )}
            </div>
          )}
          <SafeLink href={selected.meetingUrl} className="button-secondary">
            Entrar na reunião ↗
          </SafeLink>
          {selected.applicationId && (
            <Link
              className="button-secondary"
              href={`/career/pitch?application=${selected.applicationId}`}
            >
              Abrir preparação
            </Link>
          )}
        </CareerDrawer>
      )}
    </section>
  );
}
