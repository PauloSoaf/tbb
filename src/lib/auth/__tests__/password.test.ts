import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../password";

describe("hashPassword + verifyPassword", () => {
  it("returns a bcrypt hash string (starts with $2b$)", async () => {
    const hash = await hashPassword("senha123");
    expect(hash).toMatch(/^\$2[ab]\$/);
  });

  it("hash is not the original plain text", async () => {
    const hash = await hashPassword("senha123");
    expect(hash).not.toBe("senha123");
  });

  it("round-trip: verifyPassword returns true for correct password", async () => {
    const hash = await hashPassword("minhaSenha@2026");
    const ok = await verifyPassword("minhaSenha@2026", hash);
    expect(ok).toBe(true);
  });

  it("verifyPassword returns false for wrong password", async () => {
    const hash = await hashPassword("correta");
    const ok = await verifyPassword("errada", hash);
    expect(ok).toBe(false);
  });

  it("two hashes of the same password are different (salt randomness)", async () => {
    const h1 = await hashPassword("abc123");
    const h2 = await hashPassword("abc123");
    expect(h1).not.toBe(h2);
  });

  it("verifyPassword returns false for empty string against real hash", async () => {
    const hash = await hashPassword("qualquer");
    const ok = await verifyPassword("", hash);
    expect(ok).toBe(false);
  });
});
