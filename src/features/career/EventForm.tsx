"use client";
import { useState } from "react";
import type { CareerData } from "./queries";
import { eventTypes, eventStatuses } from "./schemas";
import { CareerForm, field, numberField } from "./ui";
import { saveEventAction } from "./mutations";
import { localDateTimeValue } from "@/lib/dates";
export function EventForm({
  data,
  applicationId = "",
  day,
  event,
}: {
  data: CareerData;
  applicationId?: string;
  day?: string;
  event?: {
    id: string;
    revision: number;
    type?: string;
    applicationId: string | null;
    title: string;
    scheduledAt: string;
    durationMinutes: number;
    meetingUrl: string | null;
    notes: string | null;
    status: string;
    preparation?: string | null;
    preparationDone?: boolean;
  };
}) {
  const [type, setType] = useState(event?.type ?? "INTERVIEW");
  return (
    <CareerForm
      closeOnSuccess={!event}
      submit={async (fd) =>
        saveEventAction({
          id: event?.id,
          revision: event?.revision,
          type: field(fd, "type"),
          applicationId: field(fd, "applicationId"),
          title: field(fd, "title"),
          localTime: field(fd, "localTime"),
          durationMinutes: numberField(fd, "durationMinutes"),
          meetingUrl: field(fd, "meetingUrl"),
          notes: field(fd, "notes"),
          preparation: field(fd, "preparation"),
          preparationDone: fd.get("preparationDone") === "on",
          status: field(fd, "status"),
        })
      }
    >
      <p className="career-note">
        Horários no fuso {data.timeZone}. A entrevista aparece na vaga e no
        calendário a partir deste mesmo registro.
      </p>
      <div className="career-form-grid">
        <label>
          Tipo
          <select
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            disabled={!!event}
          >
            {Object.entries(eventTypes).map(([v, l]) => (
              <option value={v} key={v}>
                {l}
              </option>
            ))}
          </select>
          {event && (
            <input
              type="hidden"
              name="type"
              value={event.type ?? "INTERVIEW"}
            />
          )}
        </label>
        <label>
          Vaga relacionada
          <select
            name="applicationId"
            defaultValue={event?.applicationId ?? applicationId}
          >
            <option value="">Sem vaga — lembrete ou preparação</option>
            {data.all.map((a) => (
              <option key={a.id} value={a.id}>
                {a.jobTitle} ·{" "}
                {data.companies.find((c) => c.id === a.companyId)?.name}
              </option>
            ))}
          </select>
        </label>
        <label className="career-wide">
          Título
          <input name="title" required defaultValue={event?.title ?? ""} />
        </label>
        <label>
          Data e hora
          <input
            type="datetime-local"
            name="localTime"
            required
            defaultValue={
              event
                ? localDateTimeValue(new Date(event.scheduledAt), data.timeZone)
                : `${day ?? data.today}T09:00`
            }
          />
        </label>
        <label>
          Duração (minutos)
          <input
            type="number"
            name="durationMinutes"
            min={5}
            max={1440}
            defaultValue={event?.durationMinutes ?? 60}
          />
        </label>
        <label>
          Status
          <select name="status" defaultValue={event?.status ?? "PENDING"}>
            {Object.entries(eventStatuses).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          Link da reunião
          <input
            type="url"
            name="meetingUrl"
            defaultValue={event?.meetingUrl ?? ""}
          />
        </label>
        <label className="career-wide">
          Observações
          <textarea name="notes" rows={3} defaultValue={event?.notes ?? ""} />
        </label>
        {type === "INTERVIEW" && (
          <>
            <label className="career-wide">
              Notas de preparação
              <textarea
                name="preparation"
                rows={3}
                defaultValue={event?.preparation ?? ""}
              />
            </label>
            <label className="career-check career-wide">
              <input
                type="checkbox"
                name="preparationDone"
                defaultChecked={event?.preparationDone}
              />
              Preparação revisada
            </label>
          </>
        )}
      </div>
    </CareerForm>
  );
}
