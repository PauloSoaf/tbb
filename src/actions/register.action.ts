"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { createSessionCookie } from "@/lib/auth/cookies";

const registerSchema = z.object({
  name: z.string().min(3, "Nome deve ter ao menos 3 caracteres"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "Senha deve ter ao menos 8 caracteres"),
  crn: z.string().min(2, "CRN é obrigatório"),
  city: z.string().min(2, "Cidade é obrigatória"),
  state: z.string().length(2, "Use a sigla do estado (ex: SP)"),
});

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let counter = 1;
  while (await prisma.nutritionist.findUnique({ where: { slug } })) {
    slug = `${base}${counter}`;
    counter++;
  }
  return slug;
}

export type RegisterFormValues = {
  name?: string;
  email?: string;
  crn?: string;
  city?: string;
  state?: string;
};

export type RegisterFieldErrors = Partial<
  Record<"name" | "email" | "password" | "crn" | "city" | "state", string>
>;

export type RegisterState = {
  error?: string;
  fieldErrors?: RegisterFieldErrors;
  values?: RegisterFormValues;
};

function valuesFromFormData(formData: FormData): RegisterFormValues {
  return {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    crn: String(formData.get("crn") ?? ""),
    city: String(formData.get("city") ?? ""),
    state: String(formData.get("state") ?? ""),
  };
}

export async function registerAction(
  _prevState: RegisterState | null,
  formData: FormData
): Promise<RegisterState> {
  const raw = Object.fromEntries(formData.entries());
  const values = valuesFromFormData(formData);
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: RegisterFieldErrors = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof RegisterFieldErrors;
      if (!fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    return { fieldErrors, values };
  }

  const { name, email, password, crn, city, state } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return {
      fieldErrors: { email: "Este e-mail já está cadastrado." },
      values,
    };
  }

  const passwordHash = await hashPassword(password);
  const slug = await uniqueSlug(toSlug(name.split(" ")[0]));

  let nutritionistSlug: string;
  let userId: string;
  let nutritionistId: string;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const nutritionist = await tx.nutritionist.create({
        data: { name, crn, email, city, state, slug },
      });
      const user = await tx.user.create({
        data: { name, email, passwordHash, nutritionistId: nutritionist.id },
      });
      return { nutritionist, user };
    });
    nutritionistSlug = result.nutritionist.slug;
    userId = result.user.id;
    nutritionistId = result.nutritionist.id;
  } catch {
    return { error: "Erro ao criar conta. Tente novamente.", values };
  }

  const token = await createSession({
    userId,
    nutritionistId,
    nutritionistSlug,
    role: "NUTRITIONIST",
  });

  const cookieStore = await cookies();
  cookieStore.set(createSessionCookie(token));

  redirect(`/dashboard/${nutritionistSlug}`);
}
