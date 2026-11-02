import { Prisma, type PrismaClient } from "@prisma/client";
import { z } from "zod";
import { dayKey, zonedDateTimeToUtc } from "@/lib/dates";
import {
  applicationSchema,
  eventSchema,
  resumeSchema,
  profileContentSchema,
  answerSchema,
  storySchema,
  goalSchema,
  usefulLinkSchema,
  questionTemplates,
  answerContentSchema,
  emptyProfile,
} from "./schemas";
import { resolveResume } from "./resume";

export type CareerActor = {
  workspaceId: string;
  userId: string;
  timezone: string;
};
export class CareerError extends Error {}
const missing = () => new CareerError("Registro não encontrado neste espaço.");
const conflict = () =>
  new CareerError(
    "Este registro foi atualizado em outra tela. Reabra para revisar a versão atual.",
  );
type Tx = Prisma.TransactionClient;
export const json = (value: unknown) =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
const clean = (s: string | undefined) => s || null;
async function activity(
  tx: Tx,
  actor: CareerActor,
  type: string,
  entityId: string,
  metadata: Prisma.InputJsonValue = {},
) {
  await tx.activityEvent.create({
    data: {
      workspaceId: actor.workspaceId,
      actorUserId: actor.userId,
      type,
      entityType: "Application",
      entityId,
      metadata,
    },
  });
}
async function related(tx: Tx, workspaceId: string, applicationId: string) {
  if (
    applicationId &&
    !(await tx.application.findFirst({
      where: { id: applicationId, workspaceId },
      select: { id: true },
    }))
  )
    throw missing();
}

export async function saveOpportunity(
  db: PrismaClient,
  actor: CareerActor,
  input: unknown,
) {
  return db.$transaction((tx) =>
    saveOpportunityInTransaction(tx, actor, input),
  );
}
export async function saveOpportunityInTransaction(
  tx: Tx,
  actor: CareerActor,
  input: unknown,
) {
  const d = applicationSchema.parse(input);
  const old = d.id
    ? await tx.application.findFirst({
        where: { id: d.id, workspaceId: actor.workspaceId },
      })
    : null;
  if (d.id && !old) throw missing();
  if (old && old.revision !== d.revision) throw conflict();
  let companyId = d.companyId;
  if (companyId) {
    if (
      !(await tx.company.findFirst({
        where: { id: companyId, workspaceId: actor.workspaceId },
      }))
    )
      throw missing();
  } else {
    const existing = await tx.company.findFirst({
      where: {
        workspaceId: actor.workspaceId,
        name: { equals: d.companyName, mode: "insensitive" },
      },
    });
    companyId =
      existing?.id ??
      (
        await tx.company.create({
          data: {
            workspaceId: actor.workspaceId,
            name: d.companyName,
            careersUrl: clean(d.careersUrl),
          },
        })
      ).id;
  }
  if (
    d.resumeVersionId &&
    !(await tx.resumeVersion.findFirst({
      where: { id: d.resumeVersionId, workspaceId: actor.workspaceId },
    }))
  )
    throw missing();
  const {
    id: _id,
    revision: _rev,
    companyName: _companyName,
    careersUrl: _url,
    appliedOn,
    ...fields
  } = d;
  void _id;
  void _rev;
  void _companyName;
  void _url;
  const effectiveApplied =
    appliedOn ||
    (!old &&
    !["SAVED", "WANT_TO_APPLY", "ARCHIVED", "WITHDRAWN"].includes(d.status)
      ? dayKey(new Date(), actor.timezone)
      : "");
  const data = {
    ...fields,
    companyId,
    resumeVersionId: clean(d.resumeVersionId),
    appliedAt: effectiveApplied
      ? new Date(`${effectiveApplied}T12:00:00Z`)
      : null,
    nextActionDate: clean(d.nextActionDate),
    statusChangedAt:
      old?.status === d.status ? old.statusChangedAt : new Date(),
  };
  const record = old
    ? await tx.application.updateMany({
        where: {
          id: old.id,
          workspaceId: actor.workspaceId,
          revision: d.revision,
        },
        data: { ...data, revision: { increment: 1 } },
      })
    : null;
  if (record && !record.count) throw conflict();
  const id =
    old?.id ??
    (
      await tx.application.create({
        data: { ...data, workspaceId: actor.workspaceId },
      })
    ).id;
  await activity(
    tx,
    actor,
    old ? "ApplicationUpdated" : "ApplicationCreated",
    id,
    { from: old?.status ?? null, to: d.status, response: d.response },
  );
  if (old && old.status !== d.status)
    await activity(tx, actor, "ApplicationStatusChanged", id, {
      from: old.status,
      to: d.status,
    });
  if (d.response === "FOLLOW_UP" && old?.response !== d.response)
    await activity(tx, actor, "FollowUpSent", id);
  return id;
}

const patchSchema = z.object({
  records: z
    .array(z.object({ id: z.string(), revision: z.number().int().positive() }))
    .min(1)
    .max(100),
  field: z.enum([
    "status",
    "response",
    "appliedOn",
    "nextActionDate",
    "nextAction",
    "notes",
    "duplicate",
    "followUp",
  ]),
  value: z.string().max(20000),
});
export async function patchOpportunities(
  db: PrismaClient,
  actor: CareerActor,
  input: unknown,
) {
  const d = patchSchema.parse(input),
    today = dayKey(new Date(), actor.timezone);
  return db.$transaction(async (tx) => {
    for (const row of d.records) {
      const old = await tx.application.findFirst({
        where: { id: row.id, workspaceId: actor.workspaceId },
      });
      if (!old) throw missing();
      if (old.revision !== row.revision) throw conflict();
      if (d.field === "duplicate") {
        const {
          id: _id,
          createdAt: _c,
          updatedAt: _u,
          revision: _r,
          ...source
        } = old;
        void _id;
        void _c;
        void _u;
        void _r;
        const copy = await tx.application.create({
          data: {
            ...source,
            status: "SAVED",
            response: "NONE",
            appliedAt: null,
            statusChangedAt: new Date(),
            nextActionDate: null,
            lastContactOn: null,
            jobTitle: old.jobTitle + " (nova candidatura)",
          },
        });
        await activity(tx, actor, "ApplicationCreated", copy.id, {
          to: "SAVED",
          duplicatedFrom: old.id,
        });
        continue;
      }
      const data: Prisma.ApplicationUpdateManyMutationInput = {
        revision: { increment: 1 },
      };
      if (d.field === "status") {
        data.status = applicationSchema.shape.status.parse(d.value);
        data.statusChangedAt = new Date();
        if (
          !old.appliedAt &&
          !["SAVED", "WANT_TO_APPLY", "ARCHIVED", "WITHDRAWN"].includes(d.value)
        )
          data.appliedAt = new Date(`${today}T12:00:00Z`);
        if (d.value === "REJECTED") data.response = "NEGATIVE";
      } else if (d.field === "response") {
        data.response = applicationSchema.shape.response.parse(d.value);
        if (["POSITIVE", "NEGATIVE", "FOLLOW_UP"].includes(d.value))
          data.lastContactOn = today;
      } else if (d.field === "appliedOn")
        data.appliedAt = d.value
          ? new Date(
              `${applicationSchema.shape.appliedOn.parse(d.value)}T12:00:00Z`,
            )
          : null;
      else if (d.field === "nextActionDate")
        data.nextActionDate = clean(
          applicationSchema.shape.nextActionDate.parse(d.value),
        );
      else if (d.field === "followUp") {
        data.lastContactOn = today;
        data.response = "FOLLOW_UP";
        data.nextActionDate = null;
      } else data[d.field] = d.value;
      const result = await tx.application.updateMany({
        where: {
          id: old.id,
          workspaceId: actor.workspaceId,
          revision: row.revision,
        },
        data,
      });
      if (!result.count) throw conflict();
      await activity(
        tx,
        actor,
        d.field === "status"
          ? "ApplicationStatusChanged"
          : d.field === "followUp" ||
              (d.field === "response" && d.value === "FOLLOW_UP")
            ? "FollowUpSent"
            : "ApplicationUpdated",
        old.id,
        {
          field: d.field,
          from: d.field === "status" ? old.status : null,
          to: d.value,
        },
      );
    }
  });
}

export async function saveCareerEvent(
  db: PrismaClient,
  actor: CareerActor,
  input: unknown,
) {
  const d = eventSchema.parse(input),
    scheduledAt = zonedDateTimeToUtc(d.localTime, actor.timezone);
  return db.$transaction(async (tx) => {
    await related(tx, actor.workspaceId, d.applicationId);
    const table = d.type === "INTERVIEW" ? "interview" : "careerEvent";
    const previous = d.id
      ? table === "interview"
        ? await tx.interview.findFirst({
            where: { id: d.id, workspaceId: actor.workspaceId },
          })
        : await tx.careerEvent.findFirst({
            where: { id: d.id, workspaceId: actor.workspaceId },
          })
      : null;
    if (d.id && !previous) throw missing();
    if (previous && previous.revision !== d.revision) throw conflict();
    const common = {
      title: d.title,
      scheduledAt,
      durationMinutes: d.durationMinutes,
      meetingUrl: clean(d.meetingUrl),
      notes: d.notes,
      status: d.status,
    };
    let id: string;
    if (table === "interview") {
      const data = {
        ...common,
        applicationId: d.applicationId,
        preparation: d.preparation,
        preparationDone: d.preparationDone,
      };
      if (previous) {
        const r = await tx.interview.updateMany({
          where: {
            id: previous.id,
            workspaceId: actor.workspaceId,
            revision: d.revision,
          },
          data: { ...data, revision: { increment: 1 } },
        });
        if (!r.count) throw conflict();
        id = previous.id;
      } else
        id = (
          await tx.interview.create({
            data: { ...data, workspaceId: actor.workspaceId },
          })
        ).id;
      if (d.applicationId)
        await activity(tx, actor, "InterviewScheduled", d.applicationId, {
          interviewId: id,
          scheduledAt: scheduledAt.toISOString(),
          status: d.status,
        });
    } else {
      const data = {
        ...common,
        applicationId: clean(d.applicationId),
        type: d.type,
      };
      if (previous) {
        const r = await tx.careerEvent.updateMany({
          where: {
            id: previous.id,
            workspaceId: actor.workspaceId,
            revision: d.revision,
          },
          data: { ...data, revision: { increment: 1 } },
        });
        if (!r.count) throw conflict();
        id = previous.id;
      } else
        id = (
          await tx.careerEvent.create({
            data: { ...data, workspaceId: actor.workspaceId },
          })
        ).id;
    }
    return id;
  });
}

export async function saveResume(
  db: PrismaClient,
  actor: CareerActor,
  input: unknown,
) {
  const d = resumeSchema.parse(input);
  return db.$transaction(async (tx) => {
    const old = d.id
      ? await tx.resumeProfile.findFirst({
          where: { id: d.id, workspaceId: actor.workspaceId },
        })
      : null;
    if (d.id && !old) throw missing();
    if (old && old.revision !== d.revision) throw conflict();
    const base = await tx.professionalProfile.findUnique({
      where: { workspaceId: actor.workspaceId },
    });
    const known =
      profileContentSchema.safeParse(base?.content).data ?? emptyProfile;
    if (
      d.content.baseEntryIds.some(
        (id) => !known.entries.some((e) => e.id === id),
      )
    )
      throw new CareerError(
        "Uma seção do perfil base foi removida. Revise as seções selecionadas.",
      );
    const { id: _id, revision: _rev, ...fields } = d;
    void _id;
    void _rev;
    const data = { ...fields, content: json(d.content) };
    const id =
      old?.id ??
      (
        await tx.resumeProfile.create({
          data: { ...data, workspaceId: actor.workspaceId },
        })
      ).id;
    if (old) {
      const r = await tx.resumeProfile.updateMany({
        where: { id, workspaceId: actor.workspaceId, revision: d.revision },
        data: { ...data, revision: { increment: 1 } },
      });
      if (!r.count) throw conflict();
    }
    const version = await tx.resumeVersion.create({
      data: {
        workspaceId: actor.workspaceId,
        resumeId: id,
        number: (old?.revision ?? 0) + 1,
        title: d.title,
        content: json(resolveResume(d.content, base?.content ?? {})),
        settings: {
          language: d.language,
          template: d.template,
          spacing: d.spacing,
        },
      },
    });
    return { id, versionId: version.id };
  });
}

export async function saveProfile(
  db: PrismaClient,
  actor: CareerActor,
  input: unknown,
) {
  const d = z
    .object({
      revision: z.number().int().min(0),
      content: profileContentSchema,
    })
    .parse(input);
  if (d.revision === 0) {
    try {
      return await db.professionalProfile.create({
        data: { workspaceId: actor.workspaceId, content: json(d.content) },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      )
        throw conflict();
      throw e;
    }
  }
  const result = await db.professionalProfile.updateMany({
    where: { workspaceId: actor.workspaceId, revision: d.revision },
    data: { content: json(d.content), revision: { increment: 1 } },
  });
  if (!result.count) throw conflict();
}

export async function savePreparation(
  db: PrismaClient,
  actor: CareerActor,
  kind: "answer" | "story",
  input: unknown,
) {
  return db.$transaction(async (tx) => {
    if (kind === "answer") {
      const d = answerSchema.parse(input);
      if (d.id && !d.revision) throw conflict();
      if (
        d.storyId &&
        !(await tx.interviewStory.findFirst({
          where: { id: d.storyId, workspaceId: actor.workspaceId },
        }))
      )
        throw missing();
      const { id, revision, ...fields } = d;
      const data = {
        ...fields,
        storyId: clean(d.storyId),
        content: json(d.content),
      };
      if (id) {
        const r = await tx.interviewAnswer.updateMany({
          where: { id, workspaceId: actor.workspaceId, revision },
          data: { ...data, revision: { increment: 1 } },
        });
        if (!r.count) throw conflict();
        return id;
      }
      return (
        await tx.interviewAnswer.create({
          data: { ...data, workspaceId: actor.workspaceId },
        })
      ).id;
    }
    const d = storySchema.parse(input),
      { id, revision, ...fields } = d,
      data = { ...fields, content: json(d.content) };
    if (id && !revision) throw conflict();
    if (id) {
      const r = await tx.interviewStory.updateMany({
        where: { id, workspaceId: actor.workspaceId, revision },
        data: { ...data, revision: { increment: 1 } },
      });
      if (!r.count) throw conflict();
      return id;
    }
    return (
      await tx.interviewStory.create({
        data: { ...data, workspaceId: actor.workspaceId },
      })
    ).id;
  });
}
export async function seedQuestions(db: PrismaClient, actor: CareerActor) {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${actor.workspaceId + ":career-questions"},0))`;
    const existing = await tx.interviewAnswer.findMany({
      where: { workspaceId: actor.workspaceId },
      select: { question: true },
    });
    const questions = Object.entries(questionTemplates).flatMap(
      ([category, items]) =>
        items
          .filter((question) => !existing.some((e) => e.question === question))
          .map((question) => ({
            workspaceId: actor.workspaceId,
            question,
            category,
            content: json(answerContentSchema.parse({})),
          })),
    );
    return tx.interviewAnswer.createMany({ data: questions });
  });
}

export async function saveGoal(
  db: PrismaClient,
  actor: CareerActor,
  input: unknown,
) {
  const { id, revision, ...d } = goalSchema.parse(input);
  if (!id)
    return db.careerGoal.create({
      data: { ...d, workspaceId: actor.workspaceId },
    });
  if (!revision) throw conflict();
  const r = await db.careerGoal.updateMany({
    where: { id, workspaceId: actor.workspaceId, revision },
    data: { ...d, revision: { increment: 1 } },
  });
  if (!r.count) throw conflict();
}
export async function saveLink(
  db: PrismaClient,
  actor: CareerActor,
  input: unknown,
) {
  const { id, revision, ...d } = usefulLinkSchema.parse(input);
  if (!id)
    return db.careerLink.create({
      data: { ...d, workspaceId: actor.workspaceId },
    });
  if (!revision) throw conflict();
  const r = await db.careerLink.updateMany({
    where: { id, workspaceId: actor.workspaceId, revision },
    data: { ...d, revision: { increment: 1 } },
  });
  if (!r.count) throw conflict();
}

const practiceInput = z.object({
  id: z.string().optional(),
  revision: z.number().int().positive().optional(),
  action: z.enum(["START", "RESUME", "PAUSE", "QUESTION", "ANSWER", "FINISH"]),
  targetMinutes: z.number().int().min(5).max(180).default(45),
  questionId: z.string().default(""),
  notes: z.string().max(20000).default(""),
  confidence: z.number().int().min(1).max(5).default(1),
});
export const practiceAnswersSchema = z.array(
  z.object({
    id: z.string(),
    seconds: z.number().int().min(0),
    answered: z.boolean(),
    confidence: z.number().int().min(1).max(5),
  }),
);
export async function practice(
  db: PrismaClient,
  actor: CareerActor,
  input: unknown,
  now = new Date(),
) {
  const d = practiceInput.parse(input);
  return db.$transaction(async (tx) => {
    if (
      d.questionId &&
      !(await tx.interviewAnswer.findFirst({
        where: { id: d.questionId, workspaceId: actor.workspaceId },
      }))
    )
      throw missing();
    if (d.action === "START") {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${actor.workspaceId + ":" + actor.userId + ":career-practice"},0))`;
      if (
        await tx.practiceSession.findFirst({
          where: {
            workspaceId: actor.workspaceId,
            userId: actor.userId,
            finishedAt: null,
          },
        })
      )
        throw new CareerError(
          "Continue ou encerre seu treino em andamento antes de iniciar outro.",
        );
      return tx.practiceSession.create({
        data: {
          workspaceId: actor.workspaceId,
          userId: actor.userId,
          targetMinutes: d.targetMinutes,
          status: "RUNNING",
          activeSince: now,
          startedAt: now,
          answers: [],
        },
      });
    }
    const old = await tx.practiceSession.findFirst({
      where: { id: d.id, workspaceId: actor.workspaceId, userId: actor.userId },
    });
    if (!old) throw missing();
    if (old.revision !== d.revision) throw conflict();
    if (old.finishedAt)
      throw new CareerError(
        "Esta sessão já foi encerrada. Inicie um novo treino.",
      );
    const seconds =
      old.status === "RUNNING" && old.activeSince
        ? Math.max(
            0,
            Math.min(
              28800,
              Math.floor((now.getTime() - old.activeSince.getTime()) / 1000),
            ),
          )
        : 0;
    const answers = practiceAnswersSchema.parse(old.answers);
    const answer = (id: string) => {
      let found = answers.find((a) => a.id === id);
      if (!found) {
        found = { id, seconds: 0, answered: false, confidence: 1 };
        answers.push(found);
      }
      return found;
    };
    if (old.activeQuestionId) answer(old.activeQuestionId).seconds += seconds;
    if (d.action === "ANSWER") {
      if (!d.questionId)
        throw new CareerError("Selecione a pergunta treinada.");
      answer(d.questionId).answered = true;
      answer(d.questionId).confidence = d.confidence;
    }
    const totalSeconds = old.totalSeconds + seconds;
    const finished = d.action === "FINISH",
      running =
        !finished &&
        d.action !== "PAUSE" &&
        (old.status === "RUNNING" || d.action === "RESUME");
    const status = finished
      ? totalSeconds >= old.targetMinutes * 60 &&
        answers.some((a) => a.answered)
        ? "COMPLETED"
        : "REVIEW"
      : running
        ? "RUNNING"
        : "PAUSED";
    const r = await tx.practiceSession.updateMany({
      where: {
        id: old.id,
        workspaceId: actor.workspaceId,
        userId: actor.userId,
        revision: d.revision,
      },
      data: {
        totalSeconds,
        answers: json(answers),
        notes: d.notes,
        status,
        finishedAt: finished ? now : null,
        activeSince: running ? now : null,
        activeQuestionId:
          d.action === "QUESTION" ? clean(d.questionId) : old.activeQuestionId,
        revision: { increment: 1 },
      },
    });
    if (!r.count) throw conflict();
    return tx.practiceSession.findUniqueOrThrow({ where: { id: old.id } });
  });
}
