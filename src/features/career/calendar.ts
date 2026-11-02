import { dayKey, isDateKey } from "@/lib/dates";
import { closedStages } from "./domain";
import type { CareerData } from "./queries";

export type CareerCalendarEvent = {
  id: string;
  kind: "interview" | "event" | "followup" | "goal" | "deadline";
  title: string;
  type: string;
  status: string;
  day: string;
  time: string;
  duration: number;
  applicationId: string | null;
  meetingUrl: string | null;
};
export function calendarProjection(
  data: Pick<
    CareerData,
    "interviews" | "events" | "all" | "goals" | "timeZone"
  >,
): CareerCalendarEvent[] {
  const timed = (
    row: {
      id: string;
      title: string;
      status: string;
      scheduledAt: string;
      durationMinutes: number;
      applicationId: string | null;
      meetingUrl: string | null;
    },
    kind: "interview" | "event",
    type: string,
  ): CareerCalendarEvent => ({
    id: row.id,
    kind,
    title: row.title,
    type,
    status: row.status,
    day: dayKey(new Date(row.scheduledAt), data.timeZone),
    time: new Intl.DateTimeFormat("en-GB", {
      timeZone: data.timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date(row.scheduledAt)),
    duration: row.durationMinutes,
    applicationId: row.applicationId,
    meetingUrl: row.meetingUrl,
  });
  return [
    ...data.interviews.map((i) => timed(i, "interview", "INTERVIEW")),
    ...data.events.map((i) => timed(i, "event", i.type)),
    ...data.all
      .filter((a) => !closedStages.includes(a.status))
      .flatMap((a) =>
        [
          {
            id: "f-" + a.id,
            kind: "followup" as const,
            title: a.jobTitle,
            type: "FOLLOW_UP",
            status: "PENDING",
            day: a.nextActionDate ?? "",
            time: "",
            duration: 0,
            applicationId: a.id,
            meetingUrl: null,
          },
          {
            id: "d-" + a.id,
            kind: "deadline" as const,
            title: a.jobTitle,
            type: "APPLICATION",
            status: "PENDING",
            day: a.deadline ?? "",
            time: "",
            duration: 0,
            applicationId: a.id,
            meetingUrl: null,
          },
        ].filter((e) => isDateKey(e.day)),
      ),
    ...data.goals.map((g) => ({
      id: g.id,
      kind: "goal" as const,
      title: g.title,
      type: "GOAL",
      status: g.state === "COMPLETE" ? "COMPLETED" : "PENDING",
      day: g.endsOn,
      time: "",
      duration: 0,
      applicationId: null,
      meetingUrl: null,
    })),
  ].sort((a, b) => (a.day + a.time).localeCompare(b.day + b.time));
}
