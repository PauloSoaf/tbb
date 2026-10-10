import { Prisma } from "@prisma/client";

export type AuthFailure = "DATABASE_UNAVAILABLE" | "MISCONFIGURED" | "UNKNOWN";

// Prisma codes for "the database could not be reached or answered in time".
const UNREACHABLE = new Set(["P1001", "P1002", "P1008", "P1011", "P1017", "P2024"]);

/** Wrong credentials never reach here: they return "E-mail ou senha inválidos." without
 * revealing whether the account exists. This only separates infrastructure failures. */
export function classifyAuthFailure(error: unknown): AuthFailure {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return error.errorCode && UNREACHABLE.has(error.errorCode) ? "DATABASE_UNAVAILABLE" : "MISCONFIGURED";
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && UNREACHABLE.has(error.code)) return "DATABASE_UNAVAILABLE";
  if (error instanceof Prisma.PrismaClientRustPanicError) return "DATABASE_UNAVAILABLE";
  if (error instanceof Error && error.message.includes("JWT_SECRET")) return "MISCONFIGURED";
  return "UNKNOWN";
}

export function authFailureMessage(scope: "login" | "register", error: unknown, fallback: string) {
  const kind = classifyAuthFailure(error);
  const detail = error instanceof Error ? error.message : String(error);
  console.error(`[auth] ${scope} failed (${kind}): ${detail.replace(/postgres(?:ql)?:\/\/\S+/gi, "<database-url>")}`);
  if (kind === "DATABASE_UNAVAILABLE") return "Sem conexão com o banco de dados do TBB. Verifique se ele está no ar e tente novamente.";
  if (kind === "MISCONFIGURED") return "O servidor do TBB está com a configuração incompleta (banco de dados ou sessão). Nenhum dado da sua conta foi alterado.";
  return fallback;
}
