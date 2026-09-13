import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { createHash } from "crypto";

export async function authenticateUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { nutritionist: true },
  });

  if (!user) {
    return { success: false, error: "E-mail ou senha inválidos" };
  }

  const passwordValid = await verifyPassword(password, user.passwordHash);
  if (!passwordValid) {
    return { success: false, error: "E-mail ou senha inválidos" };
  }

  const token = await createSession({
    userId: user.id,
    nutritionistId: user.nutritionistId,
    nutritionistSlug: user.nutritionist.slug,
    role: user.role,
  });

  // Store hybrid session in DB
  try {
    const sessionTokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await prisma.userSession.create({
      data: {
        userId: user.id,
        tenantId: user.nutritionistId,
        sessionTokenHash,
        status: "ACTIVE",
        expiresAt,
      },
    });
  } catch (err) {
    console.error("[AUTH_SESSION_DB_ERROR] Could not record session in DB:", err);
  }

  return {
    success: true,
    token,
    nutritionistSlug: user.nutritionist.slug,
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      nutritionistId: user.nutritionistId,
    },
  };
}
