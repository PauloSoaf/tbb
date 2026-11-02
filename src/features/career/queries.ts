import { Prisma, type PrismaClient } from "@prisma/client";
import { z } from "zod";
import { addDays, dayKey, startOfWeek } from "@/lib/dates";
import { careerFunnel, closedStages, stages } from "./domain";
import { responses } from "./schemas";

export const careerFiltersSchema = z.object({
  q: z.string().max(300).catch(""),
  status: z.enum(["", ...stages]).catch(""),
  response: z.enum(["", ...responses]).catch(""),
  company: z.string().max(200).catch(""),
  stack: z.string().max(100).catch(""),
  workMode: z.enum(["", "REMOTE", "HYBRID", "ONSITE"]).catch(""),
  attention: z.enum(["", "due", "stale", "deadline"]).catch(""),
  sort: z.enum(["updated", "company", "applied", "followup"]).catch("updated"),
  direction: z.enum(["asc", "desc"]).catch("desc"),
  view: z.enum(["table", "cards", "kanban"]).catch("table"),
  group: z.enum(["", "status", "company", "stack", "response"]).catch(""),
  page: z.coerce.number().int().min(1).max(100000).catch(1),
});
export type CareerFilters = z.infer<typeof careerFiltersSchema>;
export function applicationWhere(
  workspaceId: string,
  f: CareerFilters,
  today: string,
  stackMatches: string[] = [],
): Prisma.ApplicationWhereInput {
  const AND: Prisma.ApplicationWhereInput[] = [];
  if (f.q)
    AND.push({
      OR: [
        { jobTitle: { contains: f.q, mode: "insensitive" } },
        { company: { name: { contains: f.q, mode: "insensitive" } } },
        { id: { in: stackMatches } },
        { technologies: { has: f.q } },
        { tags: { has: f.q } },
      ],
    });
  if (f.status) AND.push({ status: f.status });
  if (f.response) AND.push({ response: f.response });
  if (f.company) AND.push({ companyId: f.company });
  if (f.stack) AND.push({ technologies: { has: f.stack } });
  if (f.workMode) AND.push({ workMode: f.workMode });
  if (f.attention) {
    AND.push({
      status: {
        notIn: closedStages as Prisma.EnumApplicationStatusFilter["notIn"],
      },
    });
    if (f.attention === "due") AND.push({ nextActionDate: { lte: today } });
    if (f.attention === "stale")
      AND.push({
        statusChangedAt: { lt: new Date(`${addDays(today, -10)}T00:00:00Z`) },
      });
    if (f.attention === "deadline")
      AND.push({ deadline: { gte: today, lte: addDays(today, 3) } });
  }
  return { workspaceId, AND };
}
export async function searchableApplicationWhere(
  db: PrismaClient,
  workspaceId: string,
  f: CareerFilters,
  today: string,
) {
  const pattern = `%${f.q.replace(/[\\%_]/g, "\\$&")}%`;
  const matches = f.q
    ? await db.$queryRaw<
        { id: string }[]
      >`SELECT id FROM "Application" WHERE "workspaceId"=${workspaceId} AND (EXISTS (SELECT 1 FROM unnest(technologies) AS tech WHERE tech ILIKE ${pattern}) OR EXISTS (SELECT 1 FROM unnest(tags) AS tag WHERE tag ILIKE ${pattern}))`
    : [];
  return applicationWhere(
    workspaceId,
    f,
    today,
    matches.map((r) => r.id),
  );
}
export function applicationOrder(
  f: CareerFilters,
): Prisma.ApplicationOrderByWithRelationInput[] {
  const first: Prisma.ApplicationOrderByWithRelationInput =
    f.sort === "company"
      ? { company: { name: f.direction } }
      : f.sort === "applied"
        ? { appliedAt: { sort: f.direction, nulls: "last" } }
        : f.sort === "followup"
          ? { nextActionDate: { sort: f.direction, nulls: "last" } }
          : { updatedAt: f.direction };
  return [first, { id: "asc" }];
}
type Serialized<T> = T extends Date
  ? string
  : T extends (infer U)[]
    ? Serialized<U>[]
    : T extends object
      ? { [K in keyof T]: Serialized<T[K]> }
      : T;
const serialize = <T>(value: T): Serialized<T> =>
  JSON.parse(JSON.stringify(value));
export async function loadCareer(
  db: PrismaClient,
  workspaceId: string,
  userId: string,
  timeZone: string,
  query: Record<string, string | undefined> = {},
) {
  const filters = careerFiltersSchema.parse(query),
    today = dayKey(new Date(), timeZone),
    where = await searchableApplicationWhere(db, workspaceId, filters, today),
    w = { workspaceId };
  const count = await db.application.count({ where }),
    page = Math.min(filters.page, Math.max(1, Math.ceil(count / 40)));
  filters.page = page;
  const [
    applications,
    all,
    companies,
    interviews,
    events,
    resumes,
    profile,
    answers,
    stories,
    sessions,
    practiceTotals,
    goals,
    links,
    views,
    history,
    documents,
    contacts,
  ] = await Promise.all([
    db.application.findMany({
      where,
      include: {
        company: true,
        resumeVersion: { select: { id: true, title: true, number: true } },
        interviews: { orderBy: { scheduledAt: "asc" } },
      },
      orderBy: applicationOrder(filters),
      skip: (page - 1) * 40,
      take: 40,
    }),
    db.application.findMany({
      where: w,
      select: {
        id: true,
        companyId: true,
        jobTitle: true,
        status: true,
        response: true,
        appliedAt: true,
        statusChangedAt: true,
        createdAt: true,
        nextActionDate: true,
        deadline: true,
        technologies: true,
        lastContactOn: true,
        resumeVersionId: true,
      },
    }),
    db.company.findMany({
      where: w,
      orderBy: [{ isFavorite: "desc" }, { name: "asc" }],
      include: { _count: { select: { applications: true } } },
    }),
    db.interview.findMany({
      where: w,
      include: {
        application: {
          select: { jobTitle: true, company: { select: { name: true } } },
        },
      },
      orderBy: { scheduledAt: "asc" },
    }),
    db.careerEvent.findMany({ where: w, orderBy: { scheduledAt: "asc" } }),
    db.resumeProfile.findMany({
      where: w,
      orderBy: [{ isFavorite: "desc" }, { updatedAt: "desc" }],
      include: { versions: { orderBy: { number: "desc" } } },
    }),
    db.professionalProfile.findUnique({ where: { workspaceId } }),
    db.interviewAnswer.findMany({
      where: w,
      orderBy: [{ category: "asc" }, { createdAt: "asc" }],
    }),
    db.interviewStory.findMany({ where: w, orderBy: { updatedAt: "desc" } }),
    db.practiceSession.findMany({
      where: { ...w, userId },
      orderBy: { startedAt: "desc" },
    }),
    db.practiceSession.findMany({
      where: w,
      select: { startedAt: true, totalSeconds: true, status: true },
    }),
    db.careerGoal.findMany({ where: w, orderBy: { endsOn: "asc" } }),
    db.careerLink.findMany({
      where: w,
      orderBy: [{ isFavorite: "desc" }, { priority: "asc" }, { title: "asc" }],
    }),
    db.careerView.findMany({
      where: { ...w, userId },
      orderBy: { title: "asc" },
    }),
    db.activityEvent.findMany({
      where: { ...w, entityType: "Application" },
      orderBy: { createdAt: "desc" },
    }),
    db.careerDocument.findMany({ where: w, orderBy: { createdAt: "desc" } }),
    db.contact.findMany({
      where: w,
      include: { company: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
  ]);
  const funnel = careerFunnel(all, history),
    appliedIds = new Set(
      all
        .filter(
          (a) =>
            a.appliedAt ||
            !["SAVED", "WANT_TO_APPLY", "ARCHIVED", "WITHDRAWN"].includes(
              a.status,
            ) ||
            history.some(
              (e) =>
                e.entityId === a.id &&
                e.metadata &&
                typeof e.metadata === "object" &&
                !Array.isArray(e.metadata) &&
                typeof e.metadata.to === "string" &&
                (stages as readonly string[]).includes(e.metadata.to) &&
                !["SAVED", "WANT_TO_APPLY", "ARCHIVED", "WITHDRAWN"].includes(
                  e.metadata.to,
                ),
            ),
        )
        .map((a) => a.id),
    );
  const positive = all.filter((a) => a.response === "POSITIVE").length,
    negative = all.filter(
      (a) =>
        a.response === "NEGATIVE" ||
        (a.status === "REJECTED" && a.response !== "POSITIVE"),
    ).length;
  const interviewed = new Set([
    ...interviews
      .filter((i) => i.status !== "CANCELLED")
      .map((i) => i.applicationId),
    ...all
      .filter((a) =>
        [
          "HR_INTERVIEW",
          "TECHNICAL_INTERVIEW",
          "FINAL_INTERVIEW",
          "OFFER",
          "ACCEPTED",
        ].includes(a.status),
      )
      .map((a) => a.id),
    ...history
      .filter(
        (e) =>
          e.metadata &&
          typeof e.metadata === "object" &&
          !Array.isArray(e.metadata) &&
          typeof e.metadata.to === "string" &&
          [
            "HR_INTERVIEW",
            "TECHNICAL_INTERVIEW",
            "FINAL_INTERVIEW",
            "OFFER",
            "ACCEPTED",
          ].includes(e.metadata.to),
      )
      .map((e) => e.entityId),
  ]);
  for (const id of interviewed)
    if (!all.some((a) => a.id === id)) interviewed.delete(id);
  const latestApplied = all
    .flatMap((a) => (a.appliedAt ? [dayKey(a.appliedAt, timeZone)] : []))
    .sort()
    .at(-1);
  const stats = {
    ...funnel,
    positive,
    negative,
    interviews: Math.max(funnel.interviews, interviewed.size),
    active: all.filter((a) => !closedStages.includes(a.status)).length,
    saved: all.filter((a) => ["SAVED", "WANT_TO_APPLY"].includes(a.status))
      .length,
    companies: companies.length,
    resumesUsed: new Set(
      all.flatMap((a) => (a.resumeVersionId ? [a.resumeVersionId] : [])),
    ).size,
    daysWithoutApplying: latestApplied
      ? Math.max(
          0,
          Math.floor(
            (Date.parse(today) - Date.parse(latestApplied)) / 86400000,
          ),
        )
      : null,
    appliedThisWeek: all.filter(
      (a) => a.appliedAt && dayKey(a.appliedAt, timeZone) >= startOfWeek(today),
    ).length,
    appliedThisMonth: all.filter(
      (a) =>
        a.appliedAt &&
        dayKey(a.appliedAt, timeZone).slice(0, 7) === today.slice(0, 7),
    ).length,
  };
  stats.interviewRate = appliedIds.size
    ? Math.round(
        ([...interviewed].filter((id) => appliedIds.has(id)).length /
          appliedIds.size) *
          100,
      )
    : 0;
  stats.offerRate = stats.interviews
    ? Math.round((stats.offers / stats.interviews) * 100)
    : 0;
  const withProgress = goals.map((g) => {
    const inPeriod = (d: Date) => {
      const day = dayKey(d, timeZone);
      return day >= g.startsOn && day <= g.endsOn;
    };
    const value =
      g.metric === "APPLICATIONS"
        ? all.filter((a) => a.appliedAt && inPeriod(a.appliedAt)).length
        : g.metric === "INTERVIEWS"
          ? interviews.filter(
              (i) => i.status !== "CANCELLED" && inPeriod(i.scheduledAt),
            ).length
          : g.metric === "FOLLOW_UPS"
            ? history.filter(
                (e) => e.type === "FollowUpSent" && inPeriod(e.createdAt),
              ).length
            : g.metric === "RESUMES"
              ? resumes
                  .flatMap((r) => r.versions)
                  .filter((v) => inPeriod(v.createdAt)).length
              : g.metric === "PRACTICE"
                ? practiceTotals.filter(
                    (s) => s.status === "COMPLETED" && inPeriod(s.startedAt),
                  ).length
                : g.metric === "STUDY_MINUTES"
                  ? Math.floor(
                      practiceTotals
                        .filter((s) => inPeriod(s.startedAt))
                        .reduce((n, s) => n + s.totalSeconds, 0) / 60,
                    )
                  : g.metric === "COMPANIES"
                    ? companies.filter((c) => inPeriod(c.createdAt)).length
                    : g.manualProgress;
    return {
      ...g,
      progress: value,
      percent: Math.min(100, Math.round((value / g.target) * 100)),
      state:
        value >= g.target
          ? "COMPLETE"
          : g.endsOn < today
            ? "OVERDUE"
            : "ACTIVE",
    };
  });
  const active = all.filter((a) => !closedStages.includes(a.status));
  const attention = {
    due: active.filter((a) => a.nextActionDate && a.nextActionDate <= today),
    stale: active.filter(
      (a) => dayKey(a.statusChangedAt, timeZone) < addDays(today, -10),
    ),
    deadlines: active.filter(
      (a) =>
        a.deadline && a.deadline >= today && a.deadline <= addDays(today, 3),
    ),
    unprepared: interviews.filter(
      (i) =>
        ["PENDING", "RESCHEDULED"].includes(i.status) &&
        !i.preparationDone &&
        dayKey(i.scheduledAt, timeZone) >= today &&
        dayKey(i.scheduledAt, timeZone) <= addDays(today, 1),
    ),
    unrevised: resumes.filter(
      (r) => dayKey(r.updatedAt, timeZone) < addDays(today, -60),
    ),
    targetCompanies: companies.filter(
      (c) => c.trackingStatus === "WATCHING" && !c._count.applications,
    ),
  };
  const selectedOpportunity = query.record
    ? await db.application.findFirst({
        where: { workspaceId, id: query.record },
        include: {
          company: true,
          resumeVersion: { select: { id: true, title: true, number: true } },
          interviews: { orderBy: { scheduledAt: "asc" } },
        },
      })
    : null;
  return serialize({
    filters,
    today,
    timeZone,
    applications,
    count,
    page,
    all,
    companies,
    interviews,
    events,
    resumes,
    profile,
    answers,
    stories,
    sessions,
    goals: withProgress,
    links,
    views,
    history,
    documents,
    contacts,
    stats,
    attention,
    selectedOpportunity,
    preferenceKey: `career:${workspaceId}:${userId}`,
  });
}
export type CareerData = Awaited<ReturnType<typeof loadCareer>>;
export type Opportunity = CareerData["applications"][number];
