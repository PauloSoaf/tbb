import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { addHours } from "date-fns";

export async function generatePatientJoinToken(sessionId: string, nutritionistId: string) {
  // Validate session belongs to nutritionist
  const session = await prisma.careSession.findFirst({
    where: { id: sessionId, nutritionistId },
  });

  if (!session) throw new Error("Sessão não encontrada.");

  const token = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  
  // Expira em 24h
  const expiresAt = addHours(new Date(), 24);

  await prisma.careSession.update({
    where: { id: sessionId },
    data: {
      patientJoinTokenHash: hash,
      patientJoinTokenExpiresAt: expiresAt,
      patientJoinTokenUsedAt: null,
    },
  });

  return token;
}

export async function invalidatePatientJoinToken(sessionId: string, nutritionistId: string) {
  const session = await prisma.careSession.findFirst({
    where: { id: sessionId, nutritionistId },
  });

  if (!session) throw new Error("Sessão não encontrada.");

  await prisma.careSession.update({
    where: { id: sessionId },
    data: {
      patientJoinTokenHash: null,
      patientJoinTokenExpiresAt: null,
    },
  });
}

export async function validatePatientJoinToken(sessionId: string, token: string) {
  const session = await prisma.careSession.findUnique({
    where: { id: sessionId },
    include: { patient: true },
  });

  if (!session || !session.patientJoinTokenHash || !session.patientJoinTokenExpiresAt) {
    return { valid: false, error: "Link inválido ou não gerado." };
  }

  if (new Date() > session.patientJoinTokenExpiresAt) {
    return { valid: false, error: "Link expirado." };
  }

  const hash = crypto.createHash("sha256").update(token).digest("hex");
  if (hash !== session.patientJoinTokenHash) {
    return { valid: false, error: "Link incorreto." };
  }

  // Update usedAt
  await prisma.careSession.update({
    where: { id: sessionId },
    data: { patientJoinTokenUsedAt: new Date() },
  });

  return { valid: true, session };
}
