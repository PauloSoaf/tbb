import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildSpeachesRealtimeUrl,
  SpeachesTranscriptionProvider,
} from "./speaches-transcription.provider";
import type {
  LiveTranscriptionSegment,
  TranscriptionConnectionStatus,
  TranscriptionProviderConfig,
} from "./transcription-provider.interface";

class FakeWebSocket {
  readyState = 0;
  binaryType: BinaryType = "blob";
  readonly sent: string[] = [];
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  constructor(readonly url: string) {}

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
    if (this.readyState !== 1) {
      throw new Error("Socket is not open.");
    }
    if (typeof data !== "string") {
      throw new Error("Expected a JSON WebSocket frame.");
    }
    this.sent.push(data);
  }

  close(code = 1000, reason = ""): void {
    this.readyState = 3;
    this.onclose?.({ code, reason } as CloseEvent);
  }

  open(): void {
    this.readyState = 1;
    this.onopen?.({} as Event);
  }

  serverMessage(payload: unknown): void {
    const data = typeof payload === "string" ? payload : JSON.stringify(payload);
    this.onmessage?.({ data } as MessageEvent);
  }

  serverClose(code = 1006, reason = "connection lost"): void {
    this.readyState = 3;
    this.onclose?.({ code, reason } as CloseEvent);
  }
}

function config(
  overrides: Partial<TranscriptionProviderConfig> = {},
): TranscriptionProviderConfig {
  return {
    provider: "speaches",
    websocketUrl: "http://localhost:8000",
    apiKey: "scoped-test-key",
    model: "deepdml/faster-whisper-large-v3-turbo-ct2",
    language: "pt",
    sampleRate: 16_000,
    chunkMs: 250,
    appointmentId: "appointment-1",
    tenantId: "tenant-1",
    participantId: "participant-1",
    speakerName: "Nutricionista",
    speakerRole: "NUTRITIONIST",
    ...overrides,
  };
}

function setupProvider(
  options: ConstructorParameters<typeof SpeachesTranscriptionProvider>[0] = {},
) {
  const sockets: FakeWebSocket[] = [];
  const protocols: Array<string | string[] | undefined> = [];
  let id = 0;
  const provider = new SpeachesTranscriptionProvider({
    reconnectBaseDelayMs: 500,
    reconnectMaxDelayMs: 2_000,
    random: () => 0.5,
    idFactory: () => `event-${++id}`,
    websocketFactory: (url, socketProtocols) => {
      const socket = new FakeWebSocket(url);
      sockets.push(socket);
      protocols.push(socketProtocols);
      return socket as unknown as WebSocket;
    },
    ...options,
  });
  return { provider, sockets, protocols };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("buildSpeachesRealtimeUrl", () => {
  it("normalizes the endpoint for transcription-only mode", () => {
    const url = new URL(buildSpeachesRealtimeUrl(config()));

    expect(url.protocol).toBe("ws:");
    expect(url.pathname).toBe("/v1/realtime");
    expect(url.searchParams.get("intent")).toBe("transcription");
    expect(url.searchParams.get("model")).toContain("large-v3-turbo");
    expect(url.searchParams.get("language")).toBe("pt");
    expect(url.searchParams.get("api_key")).toBe("scoped-test-key");
  });

  it("never places a gateway session token in the URL", () => {
    const url = new URL(
      buildSpeachesRealtimeUrl(
        config({
          sessionToken: "ephemeral-token",
        }),
      ),
    );

    expect(url.toString()).not.toContain("ephemeral-token");
    expect(url.searchParams.has("api_key")).toBe(false);
  });
});

describe("SpeachesTranscriptionProvider", () => {
  it("configures the realtime session and sends PCM16 audio", async () => {
    const { provider, sockets } = setupProvider();
    const statuses: TranscriptionConnectionStatus[] = [];
    provider.onStatusChange((status) => statuses.push(status));

    const connected = provider.connect(config());
    expect(sockets).toHaveLength(1);
    sockets[0].open();
    await connected;

    const sessionUpdate = JSON.parse(sockets[0].sent[0]);
    expect(sessionUpdate).toMatchObject({
      type: "session.update",
      session: {
        input_audio_transcription: {
          language: "pt",
        },
        turn_detection: {
          type: "server_vad",
          create_response: false,
        },
      },
    });

    await provider.sendAudioChunk(new Uint8Array([0, 1, 2]).buffer);
    const audioEvent = JSON.parse(sockets[0].sent[1]);
    expect(audioEvent).toMatchObject({
      type: "input_audio_buffer.append",
      audio: "AAEC",
    });
    expect(statuses).toContain("connected");
    expect(statuses.at(-1)).toBe("streaming");

    await provider.disconnect();
  });

  it("authenticates gateway sessions through WebSocket subprotocols", async () => {
    const { provider, sockets, protocols } = setupProvider();
    const connected = provider.connect(
      config({
        apiKey: "must-not-leak",
        sessionToken: "temporary-signature",
      }),
    );

    expect(new URL(sockets[0].url).searchParams.has("api_key")).toBe(false);
    expect(sockets[0].url).not.toContain("temporary-signature");
    expect(protocols[0]).toEqual([
      "nutriopus",
      "hmac.temporary-signature",
    ]);

    sockets[0].open();
    await connected;
    await provider.disconnect();
  });

  it("refreshes the one-time gateway token before reconnecting", async () => {
    vi.useFakeTimers();
    const refreshSession = vi.fn().mockResolvedValue({
      sessionToken: "refreshed-signature",
      websocketUrl: "ws://localhost:8001/v1/realtime",
    });
    const { provider, sockets, protocols } = setupProvider();
    const connected = provider.connect(
      config({
        sessionToken: "initial-signature",
        refreshSession,
      }),
    );
    sockets[0].open();
    await connected;

    sockets[0].serverClose();
    await vi.advanceTimersByTimeAsync(500);

    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(sockets).toHaveLength(2);
    expect(protocols[1]).toEqual([
      "nutriopus",
      "hmac.refreshed-signature",
    ]);
    sockets[1].open();
    await provider.disconnect();
  });

  it("parses deltas, final segments and malformed events defensively", async () => {
    const { provider, sockets } = setupProvider({
      now: () => new Date("2026-07-26T12:00:00.000Z"),
    });
    const partials: LiveTranscriptionSegment[] = [];
    const finals: LiveTranscriptionSegment[] = [];
    const errors: Error[] = [];
    provider.onPartialTranscript((segment) => partials.push(segment));
    provider.onFinalTranscript((segment) => finals.push(segment));
    provider.onError((error) => errors.push(error));

    const connected = provider.connect(config());
    sockets[0].open();
    await connected;

    sockets[0].serverMessage({
      type: "conversation.item.input_audio_transcription.delta",
      event_id: "partial-1",
      item_id: "item-1",
      delta: "bom",
    });
    sockets[0].serverMessage({
      type: "conversation.item.input_audio_transcription.delta",
      event_id: "partial-2",
      item_id: "item-1",
      delta: " dia",
    });
    sockets[0].serverMessage("{not-json");
    sockets[0].serverMessage({
      type: "conversation.item.input_audio_transcription.completed",
      event_id: "final-1",
      item_id: "item-1",
      transcript: "bom dia",
      confidence: 92,
      audio_start_ms: 120,
      audio_end_ms: 930,
      timestamp: 1_774_182_400,
    });
    sockets[0].serverMessage({
      type: "conversation.item.input_audio_transcription.completed",
      event_id: "final-1",
      item_id: "item-1",
      transcript: "bom dia",
    });
    await Promise.resolve();

    expect(partials.map((segment) => segment.text)).toEqual([
      "bom",
      "bom dia",
    ]);
    expect(finals).toHaveLength(1);
    expect(finals[0]).toMatchObject({
      id: "item-1",
      tenantId: "tenant-1",
      appointmentId: "appointment-1",
      participantId: "participant-1",
      speakerRoleSnapshot: "NUTRITIONIST",
      kind: "final",
      text: "bom dia",
      confidence: 0.92,
      startedAtMs: 120,
      endedAtMs: 930,
      clientTimestamp: "2026-07-26T12:00:00.000Z",
    });
    expect(finals[0].providerTimestamp).toBe(
      new Date(1_774_182_400_000).toISOString(),
    );
    expect(errors.some((error) => error.message.includes("malformed"))).toBe(
      true,
    );

    await provider.disconnect();
  });

  it("buffers audio during reconnect and flushes it in order", async () => {
    vi.useFakeTimers();
    const { provider, sockets } = setupProvider();
    const statuses: TranscriptionConnectionStatus[] = [];
    provider.onStatusChange((status) => statuses.push(status));

    const connected = provider.connect(config());
    sockets[0].open();
    await connected;
    sockets[0].serverClose();

    await provider.sendAudioChunk(new Uint8Array([7, 8]).buffer);
    expect(provider.getBufferedByteLength()).toBe(2);
    expect(statuses.at(-1)).toBe("reconnecting");

    await vi.advanceTimersByTimeAsync(500);
    expect(sockets).toHaveLength(2);
    sockets[1].open();

    const flushed = sockets[1].sent.map((event) => JSON.parse(event));
    expect(flushed[0].type).toBe("session.update");
    expect(flushed[1]).toMatchObject({
      type: "input_audio_buffer.append",
      audio: "Bwg=",
    });
    expect(provider.getBufferedByteLength()).toBe(0);
    expect(statuses.at(-1)).toBe("streaming");

    await provider.disconnect();
  });

  it("becomes offline after the configured reconnect budget", async () => {
    vi.useFakeTimers();
    const { provider, sockets } = setupProvider({
      maxReconnectAttempts: 2,
      reconnectBaseDelayMs: 100,
      reconnectMaxDelayMs: 200,
    });
    const statuses: TranscriptionConnectionStatus[] = [];
    provider.onStatusChange((status) => statuses.push(status));

    const connected = provider.connect(config());
    const rejection = expect(connected).rejects.toThrow(
      "offline after 2 reconnect attempts",
    );
    sockets[0].serverClose();
    await vi.advanceTimersByTimeAsync(100);
    sockets[1].serverClose();
    await vi.advanceTimersByTimeAsync(200);
    sockets[2].serverClose();

    await rejection;
    expect(statuses.at(-1)).toBe("offline");
  });

  it("caps the reconnect buffer and drops the oldest audio", async () => {
    const { provider, sockets } = setupProvider({
      maxBufferedBytes: 3,
    });
    const errors: Error[] = [];
    provider.onError((error) => errors.push(error));

    const connected = provider.connect(config());
    await provider.sendAudioChunk(new Uint8Array([1, 2]).buffer);
    await provider.sendAudioChunk(new Uint8Array([3, 4]).buffer);
    expect(provider.getBufferedByteLength()).toBe(2);
    expect(errors.some((error) => error.message.includes("oldest"))).toBe(true);

    sockets[0].open();
    await connected;
    const flushed = sockets[0].sent.map((event) => JSON.parse(event));
    expect(flushed.at(-1)).toMatchObject({
      type: "input_audio_buffer.append",
      audio: "AwQ=",
    });

    await provider.disconnect();
  });
});
