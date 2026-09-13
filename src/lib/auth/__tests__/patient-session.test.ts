import { describe, expect, it } from "vitest";
import { createPatientSession, verifyPatientSession } from "../patient-session";
import { createPatientSessionCookie, createPatientLogoutCookie } from "../patient-cookies";

const SAMPLE_PAYLOAD = {
  patientAccountId: "acc-123",
  patientId: "pat-456",
  nutritionistId: "nutri-789",
  nutritionistSlug: "dra-carla",
};

describe("createPatientSession + verifyPatientSession", () => {
  it("round-trips: sign then verify returns original payload", async () => {
    const token = await createPatientSession(SAMPLE_PAYLOAD);
    const result = await verifyPatientSession(token);

    expect(result).not.toBeNull();
    expect(result?.patientAccountId).toBe("acc-123");
    expect(result?.patientId).toBe("pat-456");
    expect(result?.nutritionistId).toBe("nutri-789");
    expect(result?.nutritionistSlug).toBe("dra-carla");
  });

  it("returns a non-empty JWT string", async () => {
    const token = await createPatientSession(SAMPLE_PAYLOAD);
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3); // header.payload.signature
  });

  it("verifyPatientSession returns null for invalid token", async () => {
    const result = await verifyPatientSession("not.a.valid.jwt");
    expect(result).toBeNull();
  });

  it("verifyPatientSession returns null for empty string", async () => {
    const result = await verifyPatientSession("");
    expect(result).toBeNull();
  });

  it("verifyPatientSession returns null for tampered token", async () => {
    const token = await createPatientSession(SAMPLE_PAYLOAD);
    const tampered = token.slice(0, -5) + "XXXXX";
    const result = await verifyPatientSession(tampered);
    expect(result).toBeNull();
  });
});

describe("createPatientSessionCookie", () => {
  it("returns correct cookie name and value", () => {
    const cookie = createPatientSessionCookie("my-token");
    expect(cookie.name).toBe("nutriopus-patient-session");
    expect(cookie.value).toBe("my-token");
  });

  it("sets httpOnly and sameSite=lax", () => {
    const cookie = createPatientSessionCookie("tok");
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.sameSite).toBe("lax");
  });

  it("sets maxAge to 7 days in seconds", () => {
    const cookie = createPatientSessionCookie("tok");
    expect(cookie.maxAge).toBe(60 * 60 * 24 * 7);
  });

  it("sets path to /", () => {
    const cookie = createPatientSessionCookie("tok");
    expect(cookie.path).toBe("/");
  });
});

describe("createPatientLogoutCookie", () => {
  it("returns correct cookie name with empty value", () => {
    const cookie = createPatientLogoutCookie();
    expect(cookie.name).toBe("nutriopus-patient-session");
    expect(cookie.value).toBe("");
  });

  it("sets maxAge to 0 to expire immediately", () => {
    const cookie = createPatientLogoutCookie();
    expect(cookie.maxAge).toBe(0);
  });

  it("sets httpOnly and sameSite=lax", () => {
    const cookie = createPatientLogoutCookie();
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.sameSite).toBe("lax");
  });
});
