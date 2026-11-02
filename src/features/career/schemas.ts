import { z } from "zod";
import { isDateKey } from "@/lib/dates";
import { stages } from "./domain";

export const line = z.string().trim().max(300);
export const required = line.min(1, "Preencha os campos obrigatórios.");
export const prose = z.string().trim().max(20000).default("");
export const link = z
  .string()
  .trim()
  .max(2000)
  .refine(
    (v) => !v || (/^https?:\/\//i.test(v) && URL.canParse(v)),
    "Use um endereço HTTP ou HTTPS válido.",
  )
  .default("");
export const dateKey = z
  .string()
  .refine((v) => !v || isDateKey(v), "Data inválida.")
  .default("");
const tags = z.array(line).max(50).default([]);
export const responses = [
  "NONE",
  "POSITIVE",
  "NEGATIVE",
  "WAITING",
  "FOLLOW_UP",
] as const;
export const responseLabels: Record<string, string> = {
  NONE: "Sem resposta",
  POSITIVE: "Positiva",
  NEGATIVE: "Negativa",
  WAITING: "Aguardando",
  FOLLOW_UP: "Follow-up enviado",
};
export const eventTypes = {
  INTERVIEW: "Entrevista",
  TECHNICAL_TEST: "Teste técnico",
  FOLLOW_UP: "Follow-up",
  APPLICATION: "Candidatura",
  RESUME: "Revisão de currículo",
  GOAL: "Meta",
  PREPARATION: "Preparação",
  REMINDER: "Lembrete",
};
export const eventStatuses = {
  PENDING: "Pendente",
  COMPLETED: "Concluído",
  RESCHEDULED: "Remarcado",
  CANCELLED: "Cancelado",
};
export const applicationSchema = z
  .object({
    id: line.optional(),
    revision: z.number().int().positive().optional(),
    companyId: line.default(""),
    companyName: line.default(""),
    careersUrl: link,
    jobTitle: required,
    url: link,
    source: line.default("Outro"),
    location: line.default(""),
    workMode: z.enum(["REMOTE", "HYBRID", "ONSITE"]).default("REMOTE"),
    technologies: tags,
    seniority: line.default(""),
    status: z.enum(stages).default("SAVED"),
    response: z.enum(responses).default("NONE"),
    appliedOn: dateKey,
    foundOn: dateKey,
    deadline: dateKey,
    lastContactOn: dateKey,
    nextActionDate: dateKey,
    nextAction: line.default(""),
    salaryMinCents: z
      .number()
      .int()
      .min(0)
      .max(2000000000)
      .nullable()
      .default(null),
    salaryMaxCents: z
      .number()
      .int()
      .min(0)
      .max(2000000000)
      .nullable()
      .default(null),
    notes: prose,
    requirements: prose,
    coverLetter: prose,
    tags,
    resumeVersionId: line.default(""),
  })
  .refine((d) => d.companyId || d.companyName, {
    message: "Informe a empresa.",
    path: ["companyName"],
  })
  .refine(
    (d) =>
      d.salaryMinCents === null ||
      d.salaryMaxCents === null ||
      d.salaryMinCents <= d.salaryMaxCents,
    { message: "A faixa salarial está invertida.", path: ["salaryMaxCents"] },
  );

export const resumeEntrySchema = z.object({
  id: required,
  type: z.enum(["EXPERIENCE", "EDUCATION", "PROJECT", "CERTIFICATION"]),
  title: required,
  organization: line.default(""),
  period: line.default(""),
  description: prose,
  url: link,
});
export const profileContentSchema = z.object({
  name: line.default(""),
  headline: line.default(""),
  email: z
    .string()
    .max(300)
    .refine((v) => !v || z.email().safeParse(v).success, "E-mail inválido.")
    .default(""),
  phone: line.default(""),
  location: line.default(""),
  website: link,
  summary: prose,
  skills: tags,
  entries: z.array(resumeEntrySchema).max(100).default([]),
});
export const resumeContentSchema = profileContentSchema.extend({
  baseEntryIds: z.array(line).max(100).default([]),
  useBaseContact: z.boolean().default(false),
  useBaseSkills: z.boolean().default(false),
});
export type ResumeContent = z.infer<typeof resumeContentSchema>;
export type ProfileContent = z.infer<typeof profileContentSchema>;
export const emptyProfile: ProfileContent = profileContentSchema.parse({});
export const emptyResume: ResumeContent = resumeContentSchema.parse({});
export const resumeSchema = z.object({
  id: line.optional(),
  revision: z.number().int().positive().optional(),
  title: required,
  stack: line.default(""),
  language: z.enum(["pt", "en", "es"]).default("pt"),
  status: z.enum(["DRAFT", "READY"]).default("DRAFT"),
  isFavorite: z.boolean().default(false),
  tags,
  notes: prose,
  template: z.enum(["CLASSIC", "EDITORIAL"]).default("CLASSIC"),
  spacing: z.enum(["COMPACT", "NORMAL", "AIRY"]).default("NORMAL"),
  content: resumeContentSchema,
});
export const eventSchema = z
  .object({
    id: line.optional(),
    revision: z.number().int().positive().optional(),
    type: z.enum(
      Object.keys(eventTypes) as [
        keyof typeof eventTypes,
        ...(keyof typeof eventTypes)[],
      ],
    ),
    applicationId: line.default(""),
    title: required,
    localTime: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Informe data e hora."),
    durationMinutes: z.number().int().min(5).max(1440),
    meetingUrl: link,
    notes: prose,
    preparation: prose,
    preparationDone: z.boolean().default(false),
    status: z
      .enum(["PENDING", "COMPLETED", "RESCHEDULED", "CANCELLED"])
      .default("PENDING"),
  })
  .refine((d) => d.type !== "INTERVIEW" || d.applicationId, {
    message: "Vincule a entrevista a uma vaga.",
    path: ["applicationId"],
  });
export const answerContentSchema = z.object({
  main: prose,
  short: prose,
  long: prose,
  english: prose,
  keyPoints: prose,
  evidence: prose,
  improve: prose,
  stack: line.default(""),
  tags,
});
export const storyContentSchema = z.object({
  situation: prose,
  challenge: prose,
  actions: prose,
  decisions: prose,
  result: prose,
  learning: prose,
  technologies: prose,
  evidence: prose,
  suitableFor: prose,
});
export const answerSchema = z.object({
  id: line.optional(),
  revision: z.number().int().positive().optional(),
  question: required,
  category: required,
  storyId: line.default(""),
  confidence: z.number().int().min(1).max(5),
  content: answerContentSchema,
});
export const storySchema = z.object({
  id: line.optional(),
  revision: z.number().int().positive().optional(),
  title: required,
  method: z.enum(["STAR", "CAR"]),
  content: storyContentSchema,
});
export const goalSchema = z
  .object({
    id: line.optional(),
    revision: z.number().int().positive().optional(),
    title: required,
    metric: z.enum([
      "APPLICATIONS",
      "INTERVIEWS",
      "FOLLOW_UPS",
      "RESUMES",
      "PRACTICE",
      "STUDY_MINUTES",
      "COMPANIES",
      "MANUAL",
    ]),
    target: z.number().int().min(1).max(100000),
    manualProgress: z.number().int().min(0).max(100000).default(0),
    startsOn: dateKey,
    endsOn: dateKey,
  })
  .refine((d) => d.startsOn && d.endsOn && d.startsOn <= d.endsOn, {
    message: "Informe um período válido.",
    path: ["endsOn"],
  });
export const usefulLinkSchema = z.object({
  id: line.optional(),
  revision: z.number().int().positive().optional(),
  title: required,
  url: link.refine(Boolean, "Informe o endereço."),
  type: z.enum(["JOB_BOARD", "COMPANY", "RESOURCE"]),
  stack: line.default(""),
  notes: prose,
  priority: z.number().int().min(1).max(3),
  isFavorite: z.boolean(),
});
export const questionTemplates: Record<string, string[]> = {
  Pitch: [
    "Apresentação de 30 segundos",
    "Apresentação de 2 minutos",
    "Apresentação de 5 minutos",
  ],
  "Sobre mim": [
    "Fale sobre você",
    "Me conte sua trajetória",
    "Por que devemos te contratar?",
    "O que busca na próxima oportunidade?",
  ],
  Experiência: [
    "Qual projeto mais te orgulha?",
    "Um problema difícil que resolveu",
    "Como toma decisões técnicas?",
    "Como lida com prazo e pressão?",
    "Como prioriza tarefas?",
  ],
  Comportamental: [
    "Um atrito no time que resolveu",
    "Um conflito com colega ou stakeholder",
    "Um erro que cometeu",
    "Como reage a feedback?",
    "Como lida com divergência técnica?",
  ],
  "Mudança de emprego": [
    "Por que está saindo do emprego atual?",
    "O que espera de uma nova empresa?",
    "O que faria aceitar uma proposta?",
    "O que faria recusar uma proposta?",
  ],
  Liderança: [
    "Como ajuda colegas?",
    "Como se comporta quando não sabe algo?",
    "Como se adapta a mudanças?",
    "Como garante qualidade?",
    "Como compartilha conhecimento?",
  ],
  "Materiais extras": [
    "Perguntas para o recrutador",
    "Perguntas para o gestor",
    "Pontos que quero destacar",
    "Empresas-alvo",
    "Red flags",
    "Critérios de aceitação de proposta",
  ],
};
