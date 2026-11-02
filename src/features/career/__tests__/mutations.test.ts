import { beforeEach, describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  permission: vi.fn(),
  save: vi.fn(),
  patch: vi.fn(),
  event: vi.fn(),
  resume: vi.fn(),
  profile: vi.fn(),
  preparation: vi.fn(),
  goal: vi.fn(),
  link: vi.fn(),
  practice: vi.fn(),
  seed: vi.fn(),
}));
vi.mock("@/lib/workspace", () => ({ requirePermission: mocks.permission }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("../service", async (original) => ({
  ...(await original<typeof import("../service")>()),
  saveOpportunity: mocks.save,
  patchOpportunities: mocks.patch,
  saveCareerEvent: mocks.event,
  saveResume: mocks.resume,
  saveProfile: mocks.profile,
  savePreparation: mocks.preparation,
  saveGoal: mocks.goal,
  saveLink: mocks.link,
  practice: mocks.practice,
  seedQuestions: mocks.seed,
}));
import {
  saveOpportunityAction,
  patchOpportunityAction,
  saveEventAction,
  saveResumeAction,
  saveProfileAction,
  savePreparationAction,
  saveGoalAction,
  saveLinkAction,
  practiceAction,
  seedQuestionsAction,
} from "../mutations";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.permission.mockRejectedValue(new Error("WRITE denied"));
});
describe("career write permission", () => {
  it("rejects all write flows before invoking a service for a read-only user", async () => {
    const actions = [
      () => saveOpportunityAction({}),
      () => patchOpportunityAction({}),
      () => saveEventAction({}),
      () => saveResumeAction({}),
      () => saveProfileAction({}),
      () => savePreparationAction("answer", {}),
      () => saveGoalAction({}),
      () => saveLinkAction({}),
      () => practiceAction({}),
      () => seedQuestionsAction(),
    ];
    for (const action of actions)
      expect(await action()).toHaveProperty("error");
    for (const [name, mock] of Object.entries(mocks))
      if (name !== "permission") expect(mock).not.toHaveBeenCalled();
  });
});
