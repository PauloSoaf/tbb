import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import {
  saveOpportunity,
  patchOpportunities,
  saveCareerEvent,
  saveProfile,
  saveResume,
  practice,
  seedQuestions,
  saveGoal,
  saveLink,
} from "../service";
import { emptyProfile, emptyResume } from "../schemas";
import { loadCareer } from "../queries";

const url = process.env.CAREER_TEST_DB_URL;
if (url && !new URL(url).pathname.endsWith("_qa"))
  throw Error("Career integration tests require a separate QA database");
const db = new PrismaClient({
  datasourceUrl: url ?? "postgresql://test:test@localhost:1/unused_qa",
});
describe.skipIf(!url)("career workspace persistence", () => {
  const actor = { workspaceId: "", userId: "", timezone: "America/Manaus" },
    other = { ...actor };
  let jobId = "",
    versionId = "",
    questionId = "";
  beforeAll(async () => {
    for (const a of [actor, other]) {
      const key = randomUUID();
      const user = await db.user.create({
        data: {
          name: "Synthetic Career Owner",
          email: key + "@example.invalid",
          passwordHash: "synthetic",
        },
      });
      const workspace = await db.workspace.create({
        data: {
          name: "Synthetic Career QA",
          slug: key,
          memberships: { create: { userId: user.id, role: "OWNER" } },
        },
      });
      a.workspaceId = workspace.id;
      a.userId = user.id;
    }
  });
  afterAll(async () => {
    for (const a of [actor, other]) {
      if (a.workspaceId)
        await db.workspace.delete({ where: { id: a.workspaceId } });
      if (a.userId) await db.user.delete({ where: { id: a.userId } });
    }
    await db.$disconnect();
  });
  it("creates profile and an immutable resume version referenced by an application", async () => {
    await saveProfile(db, actor, {
      revision: 0,
      content: {
        ...emptyProfile,
        name: "Synthetic Candidate",
        entries: [
          {
            id: "entry",
            type: "PROJECT",
            title: "Synthetic project",
            organization: "",
            period: "",
            description: "A confirmed synthetic description",
            url: "",
          },
        ],
      },
    });
    const saved = await saveResume(db, actor, {
      title: "React synthetic",
      content: {
        ...emptyResume,
        useBaseContact: true,
        baseEntryIds: ["entry"],
      },
    });
    versionId = saved.versionId;
    jobId = await saveOpportunity(db, actor, {
      companyName: "Synthetic Company",
      jobTitle: "Synthetic Engineer",
      status: "APPLIED",
      resumeVersionId: versionId,
      nextActionDate: "2026-01-01",
    });
    expect(
      await db.application.findUnique({ where: { id: jobId } }),
    ).toMatchObject({
      workspaceId: actor.workspaceId,
      resumeVersionId: versionId,
      revision: 1,
    });
    await saveProfile(db, actor, {
      revision: 1,
      content: { ...emptyProfile, name: "Changed base" },
    });
    const original = await db.resumeVersion.findUniqueOrThrow({
      where: { id: versionId },
    });
    expect(original.content).toMatchObject({ name: "Synthetic Candidate" });
  });
  it("rejects stale edits without overwriting notes", async () => {
    await patchOpportunities(db, actor, {
      records: [{ id: jobId, revision: 1 }],
      field: "notes",
      value: "Original note",
    });
    await expect(
      patchOpportunities(db, actor, {
        records: [{ id: jobId, revision: 1 }],
        field: "notes",
        value: "Stale tab",
      }),
    ).rejects.toThrow("outra tela");
    expect(
      await db.application.findUnique({ where: { id: jobId } }),
    ).toMatchObject({ notes: "Original note" });
  });
  it("rolls back the entire bulk update when a foreign workspace record is selected", async () => {
    const foreign = await saveOpportunity(db, other, {
      companyName: "Other Company",
      jobTitle: "Other Engineer",
    });
    await expect(
      patchOpportunities(db, actor, {
        records: [
          { id: jobId, revision: 2 },
          { id: foreign, revision: 1 },
        ],
        field: "status",
        value: "OFFER",
      }),
    ).rejects.toThrow("não encontrado");
    expect(
      await db.application.findUnique({ where: { id: jobId } }),
    ).toMatchObject({ status: "APPLIED", revision: 2 });
  });
  it("blocks foreign resume versions and company relations", async () => {
    await expect(
      saveOpportunity(db, other, {
        companyName: "X",
        jobTitle: "Y",
        resumeVersionId: versionId,
      }),
    ).rejects.toThrow("não encontrado");
    const companyId = (
      await db.application.findUniqueOrThrow({ where: { id: jobId } })
    ).companyId;
    await expect(
      saveOpportunity(db, other, { companyId, jobTitle: "Y" }),
    ).rejects.toThrow("não encontrado");
  });
  it("saves interview dates in UTC and updates the same event when rescheduled", async () => {
    const id = await saveCareerEvent(db, actor, {
      title: "Synthetic interview",
      applicationId: jobId,
      type: "INTERVIEW",
      localTime: "2026-11-03T09:00",
      durationMinutes: 60,
    });
    expect(await db.interview.findUnique({ where: { id } })).toMatchObject({
      scheduledAt: new Date("2026-11-03T13:00:00Z"),
    });
    await saveCareerEvent(db, actor, {
      id,
      revision: 1,
      title: "Synthetic interview",
      applicationId: jobId,
      type: "INTERVIEW",
      localTime: "2026-11-04T09:00",
      durationMinutes: 45,
      status: "RESCHEDULED",
    });
    expect(
      await db.interview.count({ where: { workspaceId: actor.workspaceId } }),
    ).toBe(1);
    expect(
      await db.careerEvent.count({ where: { workspaceId: actor.workspaceId } }),
    ).toBe(0);
    await expect(
      saveCareerEvent(db, other, {
        title: "Intrusion",
        applicationId: jobId,
        type: "INTERVIEW",
        localTime: "2026-11-03T09:00",
        durationMinutes: 60,
      }),
    ).rejects.toThrow();
  });
  it("creates question templates only once, with empty answers", async () => {
    await seedQuestions(db, actor);
    const count = await db.interviewAnswer.count({
      where: { workspaceId: actor.workspaceId },
    });
    await seedQuestions(db, actor);
    expect(
      await db.interviewAnswer.count({
        where: { workspaceId: actor.workspaceId },
      }),
    ).toBe(count);
    const answer = await db.interviewAnswer.findFirstOrThrow({
      where: { workspaceId: actor.workspaceId },
    });
    questionId = answer.id;
    expect(answer.content).toMatchObject({ main: "" });
  });
  it("persists practice pauses and per-answer time using server time, without counting a paused interval", async () => {
    const start = new Date("2026-11-02T12:00:00Z");
    let s = await practice(
      db,
      actor,
      { action: "START", targetMinutes: 45 },
      start,
    );
    s = await practice(
      db,
      actor,
      { id: s.id, revision: s.revision, action: "QUESTION", questionId },
      new Date(start.getTime() + 10000),
    );
    s = await practice(
      db,
      actor,
      {
        id: s.id,
        revision: s.revision,
        action: "PAUSE",
        notes: "Improve the example",
      },
      new Date(start.getTime() + 70000),
    );
    expect(s.totalSeconds).toBe(70);
    s = await practice(
      db,
      actor,
      { id: s.id, revision: s.revision, action: "RESUME" },
      new Date(start.getTime() + 3600000),
    );
    s = await practice(
      db,
      actor,
      {
        id: s.id,
        revision: s.revision,
        action: "ANSWER",
        questionId,
        confidence: 4,
      },
      new Date(start.getTime() + 3630000),
    );
    expect(s.totalSeconds).toBe(100);
    expect(s.answers).toEqual([
      { id: questionId, seconds: 90, answered: true, confidence: 4 },
    ]);
    s = await practice(
      db,
      actor,
      {
        id: s.id,
        revision: s.revision,
        action: "FINISH",
        notes: "Needs another practice",
      },
      new Date(start.getTime() + 3630000),
    );
    expect(s.status).toBe("REVIEW");
  });
  it("does not mark a long session complete without explicitly reviewed answers", async () => {
    const now = new Date("2026-11-02T15:00:00Z");
    let s = await practice(
      db,
      actor,
      { action: "START", targetMinutes: 45 },
      now,
    );
    s = await practice(
      db,
      actor,
      { id: s.id, revision: s.revision, action: "FINISH" },
      new Date(now.getTime() + 46 * 60000),
    );
    expect(s.status).toBe("REVIEW");
  });
  it("rejects a second active session, foreign sessions, and stale practice commands", async () => {
    let s = await practice(db, actor, { action: "START" });
    await expect(practice(db, actor, { action: "START" })).rejects.toThrow(
      "em andamento",
    );
    await expect(
      practice(db, other, { action: "PAUSE", id: s.id, revision: 1 }),
    ).rejects.toThrow("não encontrado");
    s = await practice(db, actor, { action: "PAUSE", id: s.id, revision: 1 });
    await expect(
      practice(db, actor, { action: "RESUME", id: s.id, revision: 1 }),
    ).rejects.toThrow("outra tela");
    await practice(db, actor, {
      action: "FINISH",
      id: s.id,
      revision: s.revision,
    });
  });
  it("calculates real metrics and automatic goal progress; filters do not change overall metrics", async () => {
    await saveGoal(db, actor, {
      title: "Applications",
      metric: "APPLICATIONS",
      target: 2,
      startsOn: "2020-01-01",
      endsOn: "2035-01-01",
    });
    const initial = await loadCareer(
        db,
        actor.workspaceId,
        actor.userId,
        actor.timezone,
      ),
      filtered = await loadCareer(
        db,
        actor.workspaceId,
        actor.userId,
        actor.timezone,
        { q: "no match" },
      );
    expect(initial.goals[0].progress).toBe(1);
    expect(filtered.stats.applied).toBe(initial.stats.applied);
    expect(filtered.count).toBe(0);
    expect(initial.attention.due.map((a) => a.id)).toContain(jobId);
  });
  it("requires revisions to edit goals and links", async () => {
    const link = await db.careerLink.create({
      data: {
        workspaceId: actor.workspaceId,
        title: "Synthetic",
        url: "https://example.invalid",
      },
    });
    await expect(
      saveLink(db, actor, {
        id: link.id,
        title: "Changed",
        url: link.url,
        type: "JOB_BOARD",
        priority: 2,
        isFavorite: false,
      }),
    ).rejects.toThrow("outra tela");
    const goal = await db.careerGoal.findFirstOrThrow({
      where: { workspaceId: actor.workspaceId },
    });
    await expect(
      saveGoal(db, actor, { ...goal, revision: undefined }),
    ).rejects.toThrow("outra tela");
  });
  it("shares aggregate practice goal progress without exposing another person's sessions", async () => {
    await db.membership.create({
      data: {
        workspaceId: actor.workspaceId,
        userId: other.userId,
        role: "MEMBER",
      },
    });
    const teammate = { ...actor, userId: other.userId };
    const now = new Date("2026-11-02T20:00:00Z");
    let s = await practice(
      db,
      teammate,
      { action: "START", targetMinutes: 5 },
      now,
    );
    s = await practice(
      db,
      teammate,
      { id: s.id, revision: s.revision, action: "QUESTION", questionId },
      now,
    );
    s = await practice(
      db,
      teammate,
      {
        id: s.id,
        revision: s.revision,
        action: "ANSWER",
        questionId,
        notes: "Private teammate notes",
      },
      new Date(now.getTime() + 6 * 60000),
    );
    await practice(
      db,
      teammate,
      {
        id: s.id,
        revision: s.revision,
        action: "FINISH",
        notes: "Private teammate notes",
      },
      new Date(now.getTime() + 6 * 60000),
    );
    await saveGoal(db, actor, {
      title: "Shared practice target",
      metric: "PRACTICE",
      target: 3,
      startsOn: "2026-01-01",
      endsOn: "2035-01-01",
    });
    const data = await loadCareer(
      db,
      actor.workspaceId,
      actor.userId,
      actor.timezone,
    );
    expect(
      data.goals.find((g) => g.title === "Shared practice target")?.progress,
    ).toBe(1);
    expect(data.sessions.some((row) => row.userId === other.userId)).toBe(
      false,
    );
  });
});
