import { describe, expect, it } from "vitest";
import { loginSchema } from "../auth.schema";

describe("loginSchema", () => {
  it("accepts valid email and password", () => {
    const result = loginSchema.safeParse({ email: "nutri@clinic.com", password: "senha123" });
    expect(result.success).toBe(true);
  });

  it("rejects empty email", () => {
    const result = loginSchema.safeParse({ email: "", password: "senha123" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email format", () => {
    const result = loginSchema.safeParse({ email: "nao-e-email", password: "senha123" });
    expect(result.success).toBe(false);
  });

  it("rejects password shorter than 6 characters", () => {
    const result = loginSchema.safeParse({ email: "nutri@clinic.com", password: "abc" });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = loginSchema.safeParse({ email: "nutri@clinic.com", password: "" });
    expect(result.success).toBe(false);
  });
});
