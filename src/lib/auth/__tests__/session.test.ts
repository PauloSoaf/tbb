import { describe, expect, it } from "vitest";
import { createSession, verifySession } from "../session";
import { createSessionCookie, createLogoutCookie } from "../cookies";
import { createPatientSession } from "../patient-session";

const SAMPLE_PAYLOAD = {
  userId: "user-001",
  nutritionistId: "nutri-001",
  nutritionistSlug: "dra-ana",
  role: "OWNER",
};

describe("createSession + verifySession (nutritionist)", () => {
  it("round-trips: sign then verify returns original payload", async () => {
    const token = await createSession(SAMPLE_PAYLOAD);
    const result = await verifySession(token);

    expect(result).not.toBeNull();
    expect(result?.userId).toBe("user-001");
    expect(result?.nutritionistId).toBe("nutri-001");
    expect(result?.nutritionistSlug).toBe("dra-ana");
    expect(result?.role).toBe("OWNER");
  });

  it("returns a JWT string with 3 segments", async () => {
    const token = await createSession(SAMPLE_PAYLOAD);
    expect(token.split(".")).toHaveLength(3);
  });

  it("returns null for invalid token", async () => {
    expect(await verifySession("garbage")).toBeNull();
  });

  it("returns null for empty string", async () => {
    expect(await verifySession("")).toBeNull();
  });

  it("rejects a patient session token (different issuer/audience)", async () => {
    const patientToken = await createPatientSession({
      patientAccountId: "acc-1",
      patientId: "pat-1",
      nutritionistId: "nutri-001",
      nutritionistSlug: "dra-ana",
    });
    const result = await verifySession(patientToken);
    expect(result).toBeNull();
  });
});

describe("createSessionCookie (nutritionist)", () => {
  it("uses the correct cookie name", () => {
    const cookie = createSessionCookie("tok");
    expect(cookie.name).toBe("nutriopus-session");
  });

  it("stores the provided token as value", () => {
    const cookie = createSessionCookie("my-jwt-token");
    expect(cookie.value).toBe("my-jwt-token");
  });

  it("sets httpOnly, sameSite=lax, path=/, maxAge=7d", () => {
    const cookie = createSessionCookie("tok");
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.sameSite).toBe("lax");
    expect(cookie.path).toBe("/");
    expect(cookie.maxAge).toBe(60 * 60 * 24 * 7);
  });
});

describe("createLogoutCookie (nutritionist)", () => {
  it("returns empty value and maxAge=0", () => {
    const cookie = createLogoutCookie();
    expect(cookie.name).toBe("nutriopus-session");
    expect(cookie.value).toBe("");
    expect(cookie.maxAge).toBe(0);
  });

  it("nutritionist logout cookie name differs from patient logout cookie name", async () => {
    const { createPatientLogoutCookie } = await import("../patient-cookies");
    const nutri = createLogoutCookie();
    const patient = createPatientLogoutCookie();
    expect(nutri.name).not.toBe(patient.name);
  });
});
