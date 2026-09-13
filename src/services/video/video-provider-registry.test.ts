import { describe, it, expect } from "vitest";
import { getVideoProvider } from "./video-provider-registry";

describe("getVideoProvider", () => {
  it("retorna provider para NATIVE_WEBRTC", () => {
    const p = getVideoProvider("NATIVE_WEBRTC");
    expect(p).toBeDefined();
    expect(typeof p.createRoom).toBe("function");
  });

  it("NATIVE_WEBRTC cria sala com nativeRoomName", async () => {
    const p = getVideoProvider("NATIVE_WEBRTC");
    const result = await p.createRoom({ nutritionistId: "n1", patientId: "p1", careSessionId: "cs1" });
    expect(result.provider).toBe("NATIVE_WEBRTC");
    expect(result.nativeRoomName).toContain("cs1");
  });

  it("JITSI_LEGACY cria sala jitsi", async () => {
    const p = getVideoProvider("JITSI_LEGACY");
    const result = await p.createRoom({ nutritionistId: "n1", patientId: "p1", careSessionId: "cs1" });
    expect(result.provider).toBe("JITSI_LEGACY");
    expect(result.roomUrl).toContain("jit.si");
  });

  it("EXTERNAL_LINK salva URL", async () => {
    const p = getVideoProvider("EXTERNAL_LINK");
    const result = await p.createRoom({ nutritionistId: "n1", patientId: "p1", careSessionId: "cs1", externalUrl: "https://zoom.us/j/123" });
    expect(result.externalMeetingUrl).toBe("https://zoom.us/j/123");
  });
});
