"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/workspace";
import {
  saveOpportunity,
  patchOpportunities,
  saveCareerEvent,
  saveResume,
  saveProfile,
  savePreparation,
  saveGoal,
  saveLink,
  practice,
  seedQuestions,
  CareerError,
  json,
} from "./service";
import { careerFiltersSchema } from "./queries";
import { link, line, prose } from "./schemas";
type Result = {
  success?: string;
  error?: string;
  id?: string;
  versionId?: string;
};
type PracticeResult = Result & {
  session?: {
    id: string;
    revision: number;
    status: string;
    activeSince: string | null;
    activeQuestionId: string | null;
    totalSeconds: number;
    targetMinutes: number;
    answers: unknown;
    notes: string;
    finishedAt: string | null;
    startedAt: string;
  };
};
async function actor() {
  const c = await requirePermission("WRITE");
  return {
    workspaceId: c.workspaceId,
    userId: c.userId,
    timezone: c.workspace.timezone,
  };
}
const refresh = () => {
  revalidatePath("/career", "layout");
  revalidatePath("/today");
  revalidatePath("/calendar");
};
function error(e: unknown) {
  return {
    error:
      e instanceof z.ZodError
        ? (e.issues[0]?.message ?? "Revise os campos.")
        : e instanceof CareerError
          ? e.message
          : "Não foi possível salvar. Seus campos foram mantidos; tente novamente.",
  };
}
export async function saveOpportunityAction(input: unknown): Promise<Result> {
  try {
    const a = await actor(),
      id = await saveOpportunity(prisma, a, input);
    refresh();
    return { success: "Candidatura salva.", id };
  } catch (e) {
    return error(e);
  }
}
export async function patchOpportunityAction(input: unknown): Promise<Result> {
  try {
    await patchOpportunities(prisma, await actor(), input);
    refresh();
    return { success: "Candidatura atualizada." };
  } catch (e) {
    return error(e);
  }
}
export async function saveEventAction(input: unknown): Promise<Result> {
  try {
    const id = await saveCareerEvent(prisma, await actor(), input);
    refresh();
    return { success: "Evento salvo.", id };
  } catch (e) {
    return error(e);
  }
}
export async function saveResumeAction(input: unknown): Promise<Result> {
  try {
    const result = await saveResume(prisma, await actor(), input);
    refresh();
    return { success: "Versão do currículo salva.", ...result };
  } catch (e) {
    return error(e);
  }
}
export async function saveProfileAction(input: unknown): Promise<Result> {
  try {
    await saveProfile(prisma, await actor(), input);
    refresh();
    return { success: "Perfil profissional salvo." };
  } catch (e) {
    return error(e);
  }
}
export async function savePreparationAction(
  kind: "answer" | "story",
  input: unknown,
): Promise<Result> {
  try {
    const id = await savePreparation(prisma, await actor(), kind, input);
    refresh();
    return { success: "Preparação salva.", id };
  } catch (e) {
    return error(e);
  }
}
export async function seedQuestionsAction(): Promise<Result> {
  try {
    await seedQuestions(prisma, await actor());
    refresh();
    return { success: "Perguntas adicionadas sem inventar respostas." };
  } catch (e) {
    return error(e);
  }
}
export async function saveGoalAction(input: unknown): Promise<Result> {
  try {
    await saveGoal(prisma, await actor(), input);
    refresh();
    return { success: "Meta salva." };
  } catch (e) {
    return error(e);
  }
}
export async function saveLinkAction(input: unknown): Promise<Result> {
  try {
    await saveLink(prisma, await actor(), input);
    refresh();
    return { success: "Link salvo." };
  } catch (e) {
    return error(e);
  }
}
export async function removeLinkAction(id: string): Promise<Result> {
  try {
    const a = await actor();
    await prisma.careerLink.deleteMany({
      where: { id, workspaceId: a.workspaceId },
    });
    refresh();
    return { success: "Link removido." };
  } catch (e) {
    return error(e);
  }
}
export async function addSuggestedLinksAction(): Promise<Result> {
  try {
    const a = await actor();
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${a.workspaceId + ":career-links"},0))`;
      for (const [title, url] of [
        ["LinkedIn Jobs", "https://www.linkedin.com/jobs/"],
        ["Gupy", "https://portal.gupy.io/"],
        ["Indeed", "https://br.indeed.com/"],
        ["Revelo", "https://www.revelo.com.br/"],
        ["GeekHunter", "https://www.geekhunter.com.br/"],
        ["Programathor", "https://programathor.com.br/"],
      ]) {
        if (
          !(await tx.careerLink.findFirst({
            where: { workspaceId: a.workspaceId, url },
          }))
        )
          await tx.careerLink.create({
            data: { workspaceId: a.workspaceId, title, url },
          });
      }
    });
    refresh();
    return { success: "Sites sugeridos adicionados." };
  } catch (e) {
    return error(e);
  }
}
export async function practiceAction(input: unknown): Promise<PracticeResult> {
  try {
    const record = await practice(prisma, await actor(), input);
    refresh();
    return {
      success: "Treino atualizado.",
      session: JSON.parse(JSON.stringify(record)) as {
        id: string;
        revision: number;
        status: string;
        activeSince: string | null;
        activeQuestionId: string | null;
        totalSeconds: number;
        targetMinutes: number;
        answers: unknown;
        notes: string;
        finishedAt: string | null;
        startedAt: string;
      },
    };
  } catch (e) {
    return error(e);
  }
}
export async function saveViewAction(input: unknown): Promise<Result> {
  try {
    const a = await actor(),
      d = z
        .object({
          title: z.string().trim().min(1).max(80),
          settings: careerFiltersSchema.extend({
            columns: z.array(z.string().max(80)).max(30).optional(),
            widths: z
              .record(z.string(), z.number().min(80).max(600))
              .optional(),
          }),
        })
        .parse(input);
    await prisma.careerView.upsert({
      where: {
        workspaceId_userId_title: {
          workspaceId: a.workspaceId,
          userId: a.userId,
          title: d.title,
        },
      },
      create: {
        workspaceId: a.workspaceId,
        userId: a.userId,
        title: d.title,
        settings: json(d.settings),
      },
      update: { settings: json(d.settings) },
    });
    refresh();
    return { success: "Visualização salva." };
  } catch (e) {
    return error(e);
  }
}
export async function saveCompanyDetailsAction(
  input: unknown,
): Promise<Result> {
  try {
    const a = await actor(),
      d = z
        .object({
          id: z.string(),
          name: line.min(1),
          website: link,
          careersUrl: link,
          industry: line,
          notes: prose,
          priority: z.number().int().min(1).max(3),
          trackingStatus: z.enum([
            "WATCHING",
            "APPLIED",
            "INTERVIEW",
            "NOT_INTERESTED",
          ]),
          isFavorite: z.boolean(),
        })
        .parse(input);
    const { id, ...fields } = d;
    const r = await prisma.company.updateMany({
      where: { id, workspaceId: a.workspaceId },
      data: fields,
    });
    if (!r.count) throw new CareerError("Empresa não encontrada.");
    refresh();
    return { success: "Empresa atualizada." };
  } catch (e) {
    return error(e);
  }
}
