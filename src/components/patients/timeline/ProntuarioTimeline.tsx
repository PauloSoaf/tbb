"use client";

import React, { useState } from "react";
import { TimelineEvent } from "@/services/patient-timeline.service";
import { 
  FileText, 
  Video, 
  Apple, 
  Ruler, 
  File, 
  MessageSquare, 
  Calendar,
  Clock,
  Pin,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface ProntuarioTimelineProps {
  events: TimelineEvent[];
  tenantSlug: string;
  patientId: string;
}

interface TimelineActionButtonProps {
  href: string;
  label: string;
  loadingLabel: string;
  variant: "orange" | "blue";
}

function TimelineActionButton({
  href,
  label,
  loadingLabel,
  variant,
}: TimelineActionButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isLoading) return;
    if (!href || href === "#" || href.endsWith("/undefined") || href.endsWith("/null")) {
      toast.error("Erro: Link do plano indisponível no momento.");
      return;
    }

    try {
      setIsLoading(true);
      router.push(href);
      setTimeout(() => setIsLoading(false), 10000);
    } catch (error) {
      console.error("Erro ao navegar:", error);
      toast.error("Ocorreu um erro ao abrir o item. Tente novamente.");
      setIsLoading(false);
    }
  };

  const isOrange = variant === "orange";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      aria-busy={isLoading}
      className={[
        "group/btn inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 shadow-sm",
        "focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.98]",
        isOrange
          ? "bg-orange-50 text-orange-600 border border-orange-200/80 hover:bg-orange-100/80 hover:border-orange-300 focus:ring-orange-500/30 dark:bg-orange-600 dark:text-white dark:border-orange-500 dark:hover:bg-orange-500 dark:shadow-md"
          : "bg-brand-blue/10 text-brand-blue border border-brand-blue/20 hover:bg-brand-blue/20 hover:border-brand-blue/30 focus:ring-brand-blue/30 dark:bg-brand-blue dark:text-white dark:border-brand-blue dark:hover:bg-brand-blue-hover dark:shadow-md",
        isLoading ? "opacity-80 cursor-wait pointer-events-none" : "cursor-pointer",
      ].join(" ")}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin shrink-0 text-current" />
          <span>{loadingLabel}</span>
        </>
      ) : (
        <>
          <span>{label}</span>
          <span className="transition-transform duration-200 group-hover/btn:translate-x-0.5">→</span>
        </>
      )}
    </button>
  );
}

export function ProntuarioTimeline({ events, tenantSlug, patientId }: ProntuarioTimelineProps) {
  const [filter, setFilter] = useState<TimelineEvent["type"] | "ALL">("ALL");

  const filteredEvents = filter === "ALL" ? events : events.filter(e => e.type === filter);

  const getEventIcon = (type: TimelineEvent["type"]) => {
    switch (type) {
      case "ANAMNESE": return <FileText className="w-5 h-5 text-indigo-500" />;
      case "MEASUREMENT": return <Ruler className="w-5 h-5 text-emerald-500" />;
      case "MEAL_PLAN": return <Apple className="w-5 h-5 text-orange-500" />;
      case "DOCUMENT": return <File className="w-5 h-5 text-blue-500" />;
      case "CARE_SESSION": return <Video className="w-5 h-5 text-brand-blue" />;
      case "APPOINTMENT": return <Calendar className="w-5 h-5 text-purple-500" />;
      case "NOTE": return <MessageSquare className="w-5 h-5 text-yellow-500" />;
      default: return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const getEventBadgeColor = (type: TimelineEvent["type"]) => {
    switch (type) {
      case "ANAMNESE": return "bg-indigo-100 border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-800";
      case "MEASUREMENT": return "bg-emerald-100 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800";
      case "MEAL_PLAN": return "bg-orange-100 border-orange-200 dark:bg-orange-900/30 dark:border-orange-800";
      case "DOCUMENT": return "bg-blue-100 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800";
      case "CARE_SESSION": return "bg-brand-blue/10 border-brand-blue/20";
      case "APPOINTMENT": return "bg-purple-100 border-purple-200 dark:bg-purple-900/30 dark:border-purple-800";
      case "NOTE": return "bg-yellow-100 border-yellow-200 dark:bg-yellow-900/30 dark:border-yellow-800";
      default: return "bg-gray-100 border-gray-200 dark:bg-card-bg dark:border-slate-700";
    }
  };

  return (
    <div className="w-full max-w-4xl">
      {/* Filters */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        {["ALL", "NOTE", "MEASUREMENT", "MEAL_PLAN", "ANAMNESE", "CARE_SESSION"].map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type as TimelineEvent["type"] | "ALL")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              filter === type
                ? "bg-brand-blue text-white shadow-md dark:bg-brand-blue dark:text-white"
                : "bg-card-bg text-text-secondary border border-border-neutral hover:border-border-neutral/80 dark:hover:border-slate-600 hover:text-text-primary"
            }`}
          >
            {type === "ALL" ? "Todos" : 
             type === "NOTE" ? "Notas Clínicas" : 
             type === "MEASUREMENT" ? "Medidas" :
             type === "MEAL_PLAN" ? "Planos Alimentares" :
             type === "ANAMNESE" ? "Anamneses" : "Atendimentos"}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="relative pl-6 border-l-2 border-border-neutral/60 space-y-8">
        {filteredEvents.length === 0 ? (
          <div className="py-12 text-center text-text-secondary">
            Nenhum evento registrado nesta categoria.
          </div>
        ) : (
          filteredEvents.map((event, idx) => (
            <div key={event.id || idx} className="relative group">
              {/* Timeline Dot */}
              <div className={`absolute -left-[35px] top-1.5 w-7 h-7 rounded-full border-2 flex items-center justify-center ${getEventBadgeColor(event.type)} bg-card-bg shadow-sm transition-transform group-hover:scale-110`}>
                {getEventIcon(event.type)}
              </div>

              {/* Event Card */}
              <div className="bg-card-bg rounded-2xl p-5 border border-border-neutral shadow-sm hover:shadow-md hover:border-gray-200 transition-all">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-text-primary text-base">
                      {event.title}
                    </h3>
                    {event.type === "NOTE" && !!(event.metadata as Record<string, unknown>)?.isPinned && (
                      <Pin className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-text-secondary font-medium bg-surface-warm px-2 py-1 rounded-md">
                    <Clock className="w-3.5 h-3.5" />
                    {format(new Date(event.date), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                  </div>
                </div>
                
                {event.description && (
                  <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">
                    {event.description}
                  </p>
                )}

                {/* Optional Action Button inside Card based on type */}
                {event.type === "CARE_SESSION" && (
                  <div className="mt-4">
                    <TimelineActionButton
                      href={`/dashboard/${tenantSlug}/atendimentos/${event.id}`}
                      label="Ver detalhes do atendimento"
                      loadingLabel="Abrindo atendimento..."
                      variant="blue"
                    />
                  </div>
                )}
                {event.type === "MEAL_PLAN" && (
                  <div className="mt-4">
                    <TimelineActionButton
                      href={`/dashboard/${tenantSlug}/pacientes/${patientId}/planos/${event.id}`}
                      label="Abrir plano alimentar"
                      loadingLabel="Abrindo plano alimentar..."
                      variant="orange"
                    />
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
