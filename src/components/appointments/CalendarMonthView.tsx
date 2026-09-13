"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, isSameMonth, isToday, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { useI18n } from "@/lib/i18n/I18nContext";

interface CalendarMonthViewProps {
  tenantSlug: string;
  baseDate: Date;
  appointments: AppointmentCalendarItem[];
}

interface AppointmentCalendarItem {
  id: string;
  date: Date | string;
  startTime: string | null;
  status: string;
  patient: {
    id: string;
    name: string;
  };
}

export function CalendarMonthView({ tenantSlug, baseDate, appointments }: CalendarMonthViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loadingDate, setLoadingDate] = useState<string | null>(null);
  const loadingDateRef = useRef<string | null>(null);
  const observedPendingRef = useRef(false);
  const { t } = useI18n();

  useEffect(() => {
    if (isPending) {
      observedPendingRef.current = true;
      return;
    }

    if (observedPendingRef.current) {
      observedPendingRef.current = false;
      loadingDateRef.current = null;
    }
  }, [isPending]);

  const days = useMemo(() => {
    const monthStart = startOfMonth(baseDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const dateFormat = "yyyy-MM-dd";
    
    // Group appointments by date string
    const apptsByDay = appointments.reduce<Record<string, AppointmentCalendarItem[]>>((acc, appt) => {
      const dateStr = format(new Date(appt.date), dateFormat);
      if (!acc[dateStr]) acc[dateStr] = [];
      acc[dateStr].push(appt);
      return acc;
    }, {});

    return eachDayOfInterval({ start: startDate, end: endDate }).map(day => {
      const dateStr = format(day, dateFormat);
      return {
        date: day,
        isCurrentMonth: isSameMonth(day, monthStart),
        isToday: isToday(day),
        appointments: apptsByDay[dateStr] || []
      };
    });
  }, [baseDate, appointments]);

  const weekDays = (t("agenda.week_days", { defaultValue: "Seg,Ter,Qua,Qui,Sex,Sáb,Dom" }) as string).split(",");

  return (
    <div className="bg-card-bg border border-border-neutral rounded-xl overflow-hidden shadow-sm">
      <div className="grid grid-cols-7 border-b border-border-neutral bg-gray-50 dark:bg-card-bg/50">
        {weekDays.map(day => (
          <div key={day} className="py-2 text-center text-xs font-semibold text-text-secondary uppercase tracking-wider border-r border-border-neutral last:border-0">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 auto-rows-[minmax(100px,auto)]">
        {days.map((day, i) => {
          const dateStr = format(day.date, "yyyy-MM-dd");
          return (
            <div 
              key={day.date.toISOString()} 
              title={t("agenda.select_date", { defaultValue: "Selecionar data para consulta" })}
              onClick={(e) => {
                // Ignore if clicked on an appointment link
                if ((e.target as HTMLElement).closest("a")) return;
                if (loadingDateRef.current) return;

                const targetHref = `/dashboard/${tenantSlug}/agenda?view=month&date=${dateStr}`;
                if (`${window.location.pathname}${window.location.search}` === targetHref) return;

                loadingDateRef.current = dateStr;
                setLoadingDate(dateStr);
                try {
                  startTransition(() => {
                    router.push(targetHref);
                  });
                } catch (error) {
                  loadingDateRef.current = null;
                  setLoadingDate(null);
                  throw error;
                }
              }}
              aria-busy={isPending && loadingDate === dateStr ? true : undefined}
              className={`min-h-[100px] border-b border-r border-border-neutral last:border-r-0 relative p-1.5 flex flex-col gap-1 transition-colors cursor-pointer
                ${i % 7 === 6 ? "border-r-0" : ""}
                ${!day.isCurrentMonth ? "bg-gray-50 dark:bg-card-bg/30" : "bg-card-bg"}
                ${day.isToday ? "bg-blue-50/20 dark:bg-blue-500/10" : ""}
                hover:bg-gray-50 hover:bg-warm-beige/50
              `}
            >
              <div className="flex items-center justify-between px-1 mb-1">
              <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full
                ${day.isToday ? "bg-brand-blue text-white shadow-sm" : !day.isCurrentMonth ? "text-text-secondary/50" : "text-text-secondary"}
              `}>
                {isPending && loadingDate === dateStr ? (
                  <span className="w-3 h-3 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
                ) : (
                  format(day.date, "d")
                )}
              </span>
            </div>
            
            <div className="flex flex-col gap-1 overflow-y-auto max-h-[80px] px-1 custom-scrollbar">
              {day.appointments.map((appt) => {
                const isCanceled = appt.status === "CANCELED";
                const isDone = appt.status === "DONE";
                return (
                  <Link
                    key={appt.id}
                    href={`/dashboard/${tenantSlug}/pacientes/${appt.patient.id}`}
                    title={`${appt.startTime ?? ""} - ${appt.patient.name}`}
                    className={`
                      text-[10px] leading-tight px-1.5 py-1 rounded truncate transition-colors
                      ${isCanceled ? "bg-gray-100 dark:bg-card-bg text-gray-500 dark:text-gray-400 line-through" : 
                        isDone ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20" : 
                        "bg-brand-blue-soft text-brand-blue dark:text-blue-400 hover:bg-brand-blue/20 dark:hover:bg-brand-blue/30"}
                    `}
                  >
                    <span className="font-semibold opacity-75 mr-1">{appt.startTime ?? "--:--"}</span>
                    {appt.patient.name.split(" ")[0]}
                  </Link>
                );
              })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
