import { describe, it, expect } from "vitest";
import {
  applicationSchema,
  emptyProfile,
  emptyResume,
  eventSchema,
  profileContentSchema,
} from "../schemas";
import { resolveResume, resumeMarkdown } from "../resume";
import { calendarProjection } from "../calendar";
import { careerCsv, parseCareerCsv } from "../transfer";
import { applicationWhere, careerFiltersSchema } from "../queries";
import { careerFunnel } from "../domain";
import { buildResumePdf } from "../resume-pdf";
import { extractText, getDocumentProxy } from "unpdf";

describe("career validation and dates", () => {
  it("rejects unsafe links, invalid dates and inverted salary ranges", () => {
    const job = {
      companyName: "Synthetic Company",
      jobTitle: "Synthetic Engineer",
    };
    expect(
      applicationSchema.safeParse({ ...job, url: "javascript:alert(1)" })
        .success,
    ).toBe(false);
    expect(
      applicationSchema.safeParse({ ...job, deadline: "2026-02-30" }).success,
    ).toBe(false);
    expect(
      applicationSchema.safeParse({
        ...job,
        salaryMinCents: 20000,
        salaryMaxCents: 10000,
      }).success,
    ).toBe(false);
    expect(applicationSchema.safeParse(job).success).toBe(true);
  });
  it("requires an opportunity for an interview but allows an independent reminder", () => {
    const input = {
      title: "Synthetic event",
      localTime: "2026-11-03T09:00",
      durationMinutes: 30,
    };
    expect(eventSchema.safeParse({ ...input, type: "INTERVIEW" }).success).toBe(
      false,
    );
    expect(eventSchema.safeParse({ ...input, type: "REMINDER" }).success).toBe(
      true,
    );
  });
  it("does not count saved, archived or wanted opportunities as applications", () => {
    expect(
      careerFunnel(
        ["SAVED", "WANT_TO_APPLY", "ARCHIVED", "WITHDRAWN"].map((status) => ({
          id: status,
          status,
          appliedAt: null,
        })),
      ).applied,
    ).toBe(0);
  });
  it("ignores non-status history values and counts an explicit positive return", () => {
    expect(
      careerFunnel(
        [{ id: "saved", status: "SAVED", appliedAt: null }],
        [{ entityId: "saved", metadata: { to: "Updated notes" } }],
      ).applied,
    ).toBe(0);
    expect(
      careerFunnel([
        {
          id: "applied",
          status: "APPLIED",
          appliedAt: new Date(),
          response: "POSITIVE",
        },
      ]).responseRate,
    ).toBe(100);
  });
  it("keeps tenant scope in combined and empty filters", () => {
    for (const filters of [
      {},
      { q: "Other workspace", status: "OFFER", attention: "due" },
    ])
      expect(
        applicationWhere(
          "synthetic-workspace",
          careerFiltersSchema.parse(filters),
          "2026-11-02",
        ),
      ).toMatchObject({ workspaceId: "synthetic-workspace" });
  });
  it("keeps inbound responses separate from the return rate of sent applications", () => {
    expect(
      careerFunnel([
        { id: "sent", status: "APPLIED", appliedAt: new Date() },
        {
          id: "inbound",
          status: "SAVED",
          appliedAt: null,
          response: "POSITIVE",
        },
      ]),
    ).toMatchObject({ applied: 1, responses: 1, responseRate: 0 });
  });
});
describe("resume reuse and real PDF", () => {
  const profile = profileContentSchema.parse({
    ...emptyProfile,
    name: "Synthetic Candidate",
    website: "https://example.invalid",
    entries: [
      {
        id: "one",
        type: "EXPERIENCE",
        title: "Synthetic Engineer",
        organization: "Synthetic Co",
        description: "Built a synthetic project.",
        period: "2025",
        url: "https://example.invalid/project",
      },
    ],
  });
  it("selects reusable sections without copying unrelated entries", () => {
    const content = {
      ...emptyResume,
      useBaseContact: true,
      baseEntryIds: ["one"],
    };
    const resolved = resolveResume(content, profile);
    expect(resolved.name).toBe(profile.name);
    expect(resolved.entries).toHaveLength(1);
    expect(content.entries).toHaveLength(0);
    expect(resumeMarkdown(resolved)).toContain("Synthetic Engineer");
  });
  it("exports selectable text, clickable links and multiple pages without rasterizing", async () => {
    const { pdf, pages } = buildResumePdf(
      { ...profile, summary: "Synthetic content ".repeat(1400) },
      { language: "en", template: "EDITORIAL", spacing: "NORMAL" },
    );
    expect(pages).toBeGreaterThan(1);
    const bytes = new Uint8Array(pdf.output("arraybuffer")),
      doc = await getDocumentProxy(bytes),
      text = await extractText(doc, { mergePages: true });
    expect(text.text).toContain("Synthetic Candidate");
    expect(text.text).toContain("Synthetic Engineer");
    expect(
      (await (await doc.getPage(1)).getAnnotations()).some(
        (a) => a.url === "https://example.invalid/",
      ),
    ).toBe(true);
    expect(Buffer.from(bytes).toString("latin1")).not.toContain(
      "/Subtype /Image",
    );
  });
});
describe("CSV transfer", () => {
  it("round trips quotes, commas and multiline notes", () => {
    const exported = careerCsv([
      {
        id: "one",
        companyName: 'Synthetic, "Company"',
        jobTitle: "Engineer",
        notes: "line one\nline two",
      },
    ]);
    expect(parseCareerCsv(exported)[0]).toMatchObject({
      companyName: 'Synthetic, "Company"',
      notes: "line one\nline two",
    });
  });
  it("guards spreadsheet formula injection and rejects malformed or oversized files", () => {
    expect(
      careerCsv([{ companyName: "=HYPERLINK(bad)", jobTitle: "Engineer" }]),
    ).toContain("'=HYPERLINK");
    expect(() =>
      parseCareerCsv('companyName,jobTitle\n"unclosed,Engineer'),
    ).toThrow();
    expect(() => parseCareerCsv("x".repeat(2000001))).toThrow();
  });
});
describe("unified calendar", () => {
  it("projects an interview once in the workspace zone, including its cancelled status", () => {
    const projection = calendarProjection({
      timeZone: "America/Manaus",
      interviews: [
        {
          id: "one",
          title: "Synthetic",
          scheduledAt: "2026-11-03T02:00:00Z",
          applicationId: "job",
          durationMinutes: 60,
          status: "CANCELLED",
          meetingUrl: null,
        },
      ],
      events: [],
      all: [],
      goals: [],
    } as unknown as Parameters<typeof calendarProjection>[0]);
    expect(projection).toHaveLength(1);
    expect(projection[0]).toMatchObject({
      day: "2026-11-02",
      time: "22:00",
      status: "CANCELLED",
      kind: "interview",
    });
  });
});
