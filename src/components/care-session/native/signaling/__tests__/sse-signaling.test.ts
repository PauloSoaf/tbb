import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSseSignalingChannel } from "../useSseSignaling";
import type { CareSessionSignal, SignalingStatus } from "../types";

type Listener = (event: MessageEvent) => void;

class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  closed = false;
  listeners = new Map<string, Listener[]>();

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(type: string, cb: Listener) {
    const list = this.listeners.get(type) ?? [];
    list.push(cb);
    this.listeners.set(type, list);
  }

  emit(type: string, data?: unknown) {
    for (const cb of this.listeners.get(type) ?? []) {
      cb({ data: data === undefined ? undefined : JSON.stringify(data) } as MessageEvent);
    }
  }

  close() {
    this.closed = true;
  }
}

const g = globalThis as unknown as Record<string, unknown>;

beforeEach(() => {
  MockEventSource.instances = [];
  g.window = { EventSource: MockEventSource };
  g.EventSource = MockEventSource;
});

afterEach(() => {
  delete g.window;
  delete g.EventSource;
  vi.useRealTimers();
});

function makeChannel(overrides?: { onFatal?: () => void }) {
  const signals: CareSessionSignal[] = [];
  const statuses: SignalingStatus[] = [];
  const channel = createSseSignalingChannel({
    sessionId: "cs1",
    role: "NUTRITIONIST",
    onSignal: (s) => signals.push(s),
    onStatusChange: (s) => statuses.push(s),
    onFatalError: overrides?.onFatal,
    maxConsecutiveFailures: 2,
  });
  return { channel, signals, statuses };
}

describe("createSseSignalingChannel", () => {
  it("opens an EventSource on the stream endpoint and reports connected", () => {
    const { channel, statuses } = makeChannel();
    channel.start();
    const es = MockEventSource.instances[0];
    expect(es.url).toContain("/api/care-session/cs1/signal/stream");
    expect(es.url).toContain("role=NUTRITIONIST");
    es.emit("open");
    expect(statuses).toContain("connected");
    channel.stop();
    expect(es.closed).toBe(true);
    expect(statuses[statuses.length - 1]).toBe("disconnected");
  });

  it("parses signal events and forwards them", () => {
    const { channel, signals } = makeChannel();
    channel.start();
    const es = MockEventSource.instances[0];
    es.emit("open");
    es.emit("signal", {
      id: "s1",
      sessionId: "cs1",
      type: "media-state",
      senderRole: "PATIENT",
      payload: { cameraOn: false, micOn: true, screenSharing: false },
      createdAt: "2026-07-03T12:00:00.000Z",
    });
    expect(signals).toHaveLength(1);
    expect(signals[0].type).toBe("media-state");
    channel.stop();
  });

  it("ignores malformed signal events without breaking the stream", () => {
    const { channel, signals } = makeChannel();
    channel.start();
    const es = MockEventSource.instances[0];
    es.emit("open");
    for (const cb of es.listeners.get("signal") ?? []) {
      cb({ data: "{not json" } as MessageEvent);
    }
    es.emit("signal", { id: "ok", sessionId: "cs1", type: "hangup", senderRole: "PATIENT", payload: {}, createdAt: "2026-07-03T12:00:00.000Z" });
    expect(signals).toHaveLength(1);
    channel.stop();
  });

  it("resumes from the last received signal cursor on reconnect", () => {
    vi.useFakeTimers();
    const { channel } = makeChannel();
    channel.start();
    const first = MockEventSource.instances[0];
    first.emit("open");
    first.emit("signal", { id: "s9", sessionId: "cs1", type: "heartbeat", senderRole: "PATIENT", payload: {}, createdAt: "2026-07-03T12:34:56.000Z" });
    first.emit("error");
    vi.advanceTimersByTime(1100);
    const second = MockEventSource.instances[1];
    expect(second).toBeDefined();
    expect(second.url).toContain("after=");
    expect(second.url).toContain("afterId=s9");
    channel.stop();
  });

  it("calls onFatalError after consecutive failures (fallback to polling)", () => {
    vi.useFakeTimers();
    const onFatal = vi.fn();
    const { channel, statuses } = makeChannel({ onFatal });
    channel.start();
    MockEventSource.instances[0].emit("error");
    vi.advanceTimersByTime(1100);
    MockEventSource.instances[1].emit("error");
    expect(onFatal).toHaveBeenCalledTimes(1);
    expect(statuses).toContain("error");
    channel.stop();
  });

  it("fails fatally right away when EventSource is unsupported", () => {
    delete g.window;
    const onFatal = vi.fn();
    const { channel, statuses } = makeChannel({ onFatal });
    channel.start();
    expect(onFatal).toHaveBeenCalled();
    expect(statuses).toContain("error");
  });
});
