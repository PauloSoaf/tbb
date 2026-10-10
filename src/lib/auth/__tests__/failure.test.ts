import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { authFailureMessage, classifyAuthFailure } from "../failure";

describe("auth failure classification", () => {
  it("tells an unreachable database apart from a misconfigured server", () => {
    expect(classifyAuthFailure(new Prisma.PrismaClientInitializationError("Can't reach database server at localhost:5440", "6.19.3", "P1001"))).toBe("DATABASE_UNAVAILABLE");
    expect(classifyAuthFailure(new Prisma.PrismaClientKnownRequestError("Timed out fetching a new connection", { code: "P2024", clientVersion: "6.19.3" }))).toBe("DATABASE_UNAVAILABLE");
    expect(classifyAuthFailure(new Prisma.PrismaClientInitializationError("error: Environment variable not found: DATABASE_URL.", "6.19.3"))).toBe("MISCONFIGURED");
    expect(classifyAuthFailure(new Prisma.PrismaClientInitializationError("Authentication failed against database server", "6.19.3", "P1000"))).toBe("MISCONFIGURED");
    expect(classifyAuthFailure(new Error("JWT_SECRET deve conter pelo menos 32 caracteres."))).toBe("MISCONFIGURED");
    expect(classifyAuthFailure(new Error("boom"))).toBe("UNKNOWN");
  });

  it("logs the cause without the connection string and shows a specific message", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const message = authFailureMessage("login", new Error("failed for postgresql://app:fake-password@db.invalid:5432/app JWT_SECRET"), "fallback");
    expect(message).toContain("configuração incompleta");
    expect(log.mock.calls[0][0]).not.toContain("fake-password");
    expect(authFailureMessage("login", new Error("boom"), "fallback")).toBe("fallback");
    log.mockRestore();
  });
});
