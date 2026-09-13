"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomUUID, createHash } from "node:crypto";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, SESSION_MAX_AGE } from "@/lib/auth/session";
import { COOKIE_NAME, createSessionCookie, createLogoutCookie, hashSessionToken } from "@/lib/auth/cookies";
import { sessionService } from "@/services/session.service";

export type AuthState = { error?: string } | null;
const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido.").max(254),
  password: z.string().min(1, "Informe sua senha.").max(72),
});
const registerSchema = credentialsSchema.extend({
  name: z.string().trim().min(2, "Informe seu nome.").max(100),
  password: z.string().min(10, "Use uma senha com pelo menos 10 caracteres.")
    .refine((value) => Buffer.byteLength(value, "utf8") <= 72, "A senha deve ter no máximo 72 bytes."),
});

async function allowAttempt(scope: string, identifier: string, limit: number) {
  const windowStart = new Date(Math.floor(Date.now() / 900000) * 900000);
  const key = createHash("sha256").update(`${scope}:${identifier}:${windowStart.toISOString()}`).digest("hex");
  const attempt = await prisma.authAttempt.upsert({ where: { key },
    create: { key, attempts: 1, windowStart }, update: { attempts: { increment: 1 } } });
  await prisma.authAttempt.deleteMany({ where: { windowStart: { lt: new Date(Date.now() - 86400000) } } });
  return attempt.attempts <= limit;
}
async function issueSession(tx: Prisma.TransactionClient, userId: string, workspaceId: string, userAgent: string | null) {
  const id = randomUUID();
  const token = await createSession({ userId, workspaceId, sessionId: id });
  await tx.userSession.create({ data: { id, userId, workspaceId,
    sessionTokenHash: hashSessionToken(token), userAgent: userAgent?.slice(0, 500),
    expiresAt: new Date(Date.now() + SESSION_MAX_AGE * 1000) } });
  return token;
}
export async function loginAction(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentialsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  let token: string;
  try {
    if (!await allowAttempt("login", parsed.data.email, 10)) return { error: "Muitas tentativas. Aguarde 15 minutos e tente novamente." };
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email }, include: {
      memberships: { where: { isActive: true, workspace: { isActive: true } }, orderBy: { createdAt: "asc" }, take: 1 },
    } });
    if (!user?.isActive || !user.memberships[0] || !await verifyPassword(parsed.data.password, user.passwordHash)) {
      return { error: "E-mail ou senha inválidos." };
    }
    token = await prisma.$transaction(async (tx) => {
      const workspaceId = user.memberships[0].workspaceId;
      const session = await issueSession(tx, user.id, workspaceId, (await headers()).get("user-agent"));
      await tx.activityEvent.create({ data: { workspaceId, actorUserId: user.id,
        type: "session.login", entityType: "user", entityId: user.id, source: "SYSTEM" } });
      return session;
    });
  } catch {
    return { error: "Não foi possível entrar agora. Tente novamente em instantes." };
  }
  (await cookies()).set(createSessionCookie(token));
  redirect("/today");
}
export async function registerAction(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  let token: string;
  try {
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    if (!await allowAttempt("register", ip, 20)) return { error: "Muitas tentativas. Aguarde 15 minutos e tente novamente." };
    const passwordHash = await hashPassword(parsed.data.password);
    token = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { name: parsed.data.name, email: parsed.data.email, passwordHash } });
      const workspace = await tx.workspace.create({ data: {
        name: `Espaço de ${parsed.data.name.split(" ")[0]}`,
        slug: `pessoal-${randomUUID()}`,
        memberships: { create: { userId: user.id, role: "OWNER" } },
      } });
      await tx.activityEvent.create({ data: { workspaceId: workspace.id, actorUserId: user.id,
        type: "workspace.created", entityType: "workspace", entityId: workspace.id, source: "SYSTEM" } });
      return issueSession(tx, user.id, workspace.id, headersList.get("user-agent"));
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "Não foi possível criar a conta com este e-mail. Se já tem uma conta, entre." };
    }
    return { error: "Não foi possível criar sua conta agora. Tente novamente em instantes." };
  }
  (await cookies()).set(createSessionCookie(token));
  redirect("/today");
}
export async function logoutAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) await prisma.userSession.updateMany({
    where: { sessionTokenHash: hashSessionToken(token), status: "ACTIVE" },
    data: { status: "REVOKED", revokedAt: new Date() },
  });
  cookieStore.set(createLogoutCookie());
  redirect("/login");
}
export async function revokeSessionAction(formData: FormData) {
  const id = z.string().min(1).parse(formData.get("sessionId"));
  await sessionService.revokeSession(id);
  revalidatePath("/settings");
}
