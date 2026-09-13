import { describe, it, expect, afterEach } from "vitest";
import {
  compareSignals,
  isCareSessionSignalType,
  isMediaStatePayload,
  isPresencePayload,
  parseCareSessionSignal,
  resolveSignalingTransport,
  supportsSSE,
  supportsWebSocket,
} from "../types";

const g = globalThis as unknown as Record<string, unknown>;

afterEach(() => {
  delete g.window;
});

describe("supportsSSE", () => {
  it("detects EventSource on window", () => {
    g.window = { EventSource: function EventSource() {} };
    expect(supportsSSE()).toBe(true);
  });

  it("returns false without EventSource", () => {
    g.window = {};
    expect(supportsSSE()).toBe(false);
  });

  it("returns false without window (SSR)", () => {
    expect(supportsSSE()).toBe(false);
  });
});

describe("supportsWebSocket", () => {
  it("detects WebSocket on window", () => {
    g.window = { WebSocket: function WebSocket() {} };
    expect(supportsWebSocket()).toBe(true);
  });

  it("returns false without WebSocket", () => {
    g.window = {};
    expect(supportsWebSocket()).toBe(false);
  });
});

describe("isMediaStatePayload", () => {
  it("accepts a valid media-state payload", () => {
    expect(isMediaStatePayload({ cameraOn: true, micOn: false, screenSharing: false })).toBe(true);
  });

  it("rejects missing or non-boolean fields", () => {
    expect(isMediaStatePayload({ cameraOn: true, micOn: false })).toBe(false);
    expect(isMediaStatePayload({ cameraOn: "yes", micOn: true, screenSharing: false })).toBe(false);
    expect(isMediaStatePayload(null)).toBe(false);
    expect(isMediaStatePayload("x")).toBe(false);
  });
});

describe("isPresencePayload", () => {
  it("accepts joined/left/reconnecting/heartbeat", () => {
    for (const status of ["joined", "left", "reconnecting", "heartbeat"]) {
      expect(isPresencePayload({ status })).toBe(true);
    }
  });

  it("rejects unknown statuses", () => {
    expect(isPresencePayload({ status: "gone" })).toBe(false);
    expect(isPresencePayload({})).toBe(false);
    expect(isPresencePayload(null)).toBe(false);
  });
});

describe("isCareSessionSignalType", () => {
  it("accepts all known types and rejects unknown", () => {
    for (const t of ["presence","offer","answer","ice-candidate","media-state","screen-share-started","screen-share-stopped","hangup","heartbeat"]) {
      expect(isCareSessionSignalType(t)).toBe(true);
    }
    expect(isCareSessionSignalType("bogus")).toBe(false);
    expect(isCareSessionSignalType(42)).toBe(false);
  });
});

describe("parseCareSessionSignal", () => {
  it("parses a valid raw signal", () => {
    const parsed = parseCareSessionSignal({
      id: "s1",
      sessionId: "cs1",
      type: "offer",
      senderRole: "NUTRITIONIST",
      payload: { sdp: "x" },
      createdAt: "2026-07-03T12:00:00.000Z",
    });
    expect(parsed).not.toBeNull();
    expect(parsed!.type).toBe("offer");
    expect(parsed!.senderRole).toBe("NUTRITIONIST");
  });

  it("returns null for invalid type or role", () => {
    expect(parseCareSessionSignal({ id: "1", type: "nope", senderRole: "PATIENT" })).toBeNull();
    expect(parseCareSessionSignal({ id: "1", type: "offer", senderRole: "ADMIN" })).toBeNull();
    expect(parseCareSessionSignal(null)).toBeNull();
  });
});

describe("compareSignals", () => {
  it("orders by createdAt first", () => {
    const a = { createdAt: "2026-01-01T00:00:00.000Z", id: "z" };
    const b = { createdAt: "2026-01-02T00:00:00.000Z", id: "a" };
    expect(compareSignals(a, b)).toBeLessThan(0);
    expect(compareSignals(b, a)).toBeGreaterThan(0);
  });

  it("breaks same-timestamp ties by id (no signal lost)", () => {
    const a = { createdAt: "2026-01-01T00:00:00.000Z", id: "a" };
    const b = { createdAt: "2026-01-01T00:00:00.000Z", id: "b" };
    expect(compareSignals(a, b)).toBeLessThan(0);
    expect(compareSignals(a, a)).toBe(0);
  });
});

describe("resolveSignalingTransport", () => {
  it("defaults to polling (reliable on next dev / serverless)", () => {
    g.window = { EventSource: function EventSource() {} };
    expect(resolveSignalingTransport(undefined, {})).toBe("polling");
  });

  it("honors explicit sse when supported, degrades to polling otherwise", () => {
    g.window = { EventSource: function EventSource() {} };
    expect(resolveSignalingTransport("sse", {})).toBe("sse");
    g.window = {};
    expect(resolveSignalingTransport("sse", {})).toBe("polling");
  });

  it("uses websocket only with URL + support, else degrades to sse", () => {
    g.window = { WebSocket: function WebSocket() {}, EventSource: function EventSource() {} };
    expect(resolveSignalingTransport("websocket", { wsUrl: "ws://x" })).toBe("websocket");
    expect(resolveSignalingTransport("websocket", {})).toBe("sse");
  });

  it("honors explicit polling", () => {
    expect(resolveSignalingTransport("polling", {})).toBe("polling");
  });
});
