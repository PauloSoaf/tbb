import type {
  LiveTranscriptionProvider,
  LiveTranscriptionSegment,
  TranscriptionConnectionStatus,
  TranscriptionProviderConfig,
} from "./transcription-provider.interface";

const SOCKET_CONNECTING = 0;
const SOCKET_OPEN = 1;
const DEFAULT_MAX_RECONNECT_ATTEMPTS = 5;
const DEFAULT_RECONNECT_BASE_DELAY_MS = 500;
const DEFAULT_RECONNECT_MAX_DELAY_MS = 8_000;
const DEFAULT_CONNECT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_BUFFERED_BYTES = 4 * 1024 * 1024;

type TimerHandle = ReturnType<typeof setTimeout>;
type TranscriptCallback = (segment: LiveTranscriptionSegment) => void;
type StatusCallback = (status: TranscriptionConnectionStatus) => void;
type ErrorCallback = (error: Error) => void;

export interface SpeachesTranscriptionProviderOptions {
  websocketFactory?: (
    url: string,
    protocols?: string | string[],
  ) => WebSocket;
  maxReconnectAttempts?: number;
  reconnectBaseDelayMs?: number;
  reconnectMaxDelayMs?: number;
  connectTimeoutMs?: number;
  maxBufferedBytes?: number;
  random?: () => number;
  now?: () => Date;
  idFactory?: () => string;
}

interface BufferedAudioChunk {
  bytes: Uint8Array;
  byteLength: number;
}

interface ParsedTranscriptEvent {
  kind: "partial" | "final";
  text: string;
  isDelta: boolean;
  eventId?: string;
  itemId?: string;
  confidence?: number;
  startedAtMs?: number;
  endedAtMs?: number;
  providerTimestamp?: string;
}

interface ParsedErrorEvent {
  error: Error;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(
  source: Record<string, unknown>,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return undefined;
}

function readNumber(
  source: Record<string, unknown>,
  ...keys: string[]
): number | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return undefined;
}

function normalizeConfidence(value: number | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const normalized = value > 1 && value <= 100 ? value / 100 : value;
  return Math.min(1, Math.max(0, normalized));
}

function normalizeTimestamp(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    const milliseconds = value < 10_000_000_000 ? value * 1_000 : value;
    const date = new Date(milliseconds);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }
  if (typeof value === "string" && value.trim()) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }
  return undefined;
}

function eventPayload(payload: unknown): Record<string, unknown> | null {
  if (!isRecord(payload)) {
    return null;
  }
  if (!readString(payload, "type", "event") && isRecord(payload.data)) {
    return payload.data;
  }
  return payload;
}

function eventText(
  payload: Record<string, unknown>,
  ...keys: string[]
): string | undefined {
  const direct = readString(payload, ...keys);
  if (direct) {
    return direct;
  }
  const candidates = [payload.segment, payload.result, payload.transcription];
  for (const candidate of candidates) {
    if (isRecord(candidate)) {
      const nested = readString(candidate, ...keys);
      if (nested) {
        return nested;
      }
    }
  }
  return undefined;
}

function eventNumber(
  payload: Record<string, unknown>,
  ...keys: string[]
): number | undefined {
  const direct = readNumber(payload, ...keys);
  if (direct !== undefined) {
    return direct;
  }
  const candidates = [payload.segment, payload.result, payload.transcription];
  for (const candidate of candidates) {
    if (isRecord(candidate)) {
      const nested = readNumber(candidate, ...keys);
      if (nested !== undefined) {
        return nested;
      }
    }
  }
  return undefined;
}

function parseProviderEvent(
  rawPayload: unknown,
): ParsedTranscriptEvent | ParsedErrorEvent | null {
  const payload = eventPayload(rawPayload);
  if (!payload) {
    return null;
  }

  const type = readString(payload, "type", "event")?.toLowerCase();
  const errorPayload = isRecord(payload.error) ? payload.error : undefined;
  if (type === "error" || type?.endsWith(".failed")) {
    const message =
      (errorPayload && readString(errorPayload, "message", "detail", "code")) ??
      readString(payload, "message", "detail") ??
      `Speaches realtime event failed${type ? ` (${type})` : ""}.`;
    return { error: new Error(message) };
  }

  const partialTypes = new Set([
    "conversation.item.input_audio_transcription.delta",
    "transcription.delta",
    "transcription.partial",
    "transcript.partial",
    "partial_transcript",
    "partial",
  ]);
  const finalTypes = new Set([
    "conversation.item.input_audio_transcription.completed",
    "transcription.completed",
    "transcription.final",
    "transcript.final",
    "final_transcript",
    "final",
  ]);

  const explicitFinal =
    payload.is_final === true ||
    payload.final === true ||
    payload.kind === "final";
  const explicitPartial =
    payload.is_final === false ||
    payload.partial === true ||
    payload.kind === "partial";
  const kind = type && partialTypes.has(type)
    ? "partial"
    : type && finalTypes.has(type)
      ? "final"
      : explicitFinal
        ? "final"
        : explicitPartial
          ? "partial"
          : null;

  if (!kind) {
    return null;
  }

  const isDelta = type?.endsWith(".delta") ?? false;
  const rawText = eventText(
    payload,
    ...(isDelta
      ? ["delta", "text", "transcript", "partial"]
      : ["transcript", "text", "delta", "partial"]),
  );
  if (!rawText?.trim()) {
    return null;
  }
  const text = isDelta ? rawText : rawText.trim();

  const rawConfidence = eventNumber(
    payload,
    "confidence",
    "probability",
    "score",
  );
  const logProbability = eventNumber(payload, "avg_logprob", "logprob");
  const confidence = normalizeConfidence(
    rawConfidence ?? (logProbability === undefined ? undefined : Math.exp(logProbability)),
  );
  const providerTimestamp = normalizeTimestamp(
    payload.provider_timestamp ??
      payload.providerTimestamp ??
      payload.timestamp ??
      payload.created_at,
  );

  return {
    kind,
    text,
    isDelta,
    eventId: readString(payload, "event_id", "eventId", "id"),
    itemId: readString(payload, "item_id", "itemId", "segment_id", "segmentId"),
    confidence,
    startedAtMs: eventNumber(
      payload,
      "audio_start_ms",
      "started_at_ms",
      "startedAtMs",
      "start_ms",
    ),
    endedAtMs: eventNumber(
      payload,
      "audio_end_ms",
      "ended_at_ms",
      "endedAtMs",
      "end_ms",
    ),
    providerTimestamp,
  };
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const stride = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += stride) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + stride));
  }
  return btoa(binary);
}

function defaultIdFactory(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `segment-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function validateConfig(config: TranscriptionProviderConfig): void {
  if (config.provider !== "speaches") {
    throw new Error(
      `SpeachesTranscriptionProvider received provider "${config.provider}".`,
    );
  }
  if (!config.websocketUrl.trim()) {
    throw new Error("Speaches websocketUrl is required.");
  }
  if (!config.model.trim()) {
    throw new Error("Speaches model is required.");
  }
  if (!config.tenantId || !config.appointmentId || !config.participantId) {
    throw new Error(
      "Speaches tenantId, appointmentId and participantId are required.",
    );
  }
  if (config.sampleRate !== 16_000) {
    throw new Error(
      "Speaches realtime currently requires 16000 Hz mono PCM16 audio.",
    );
  }
}

export function buildSpeachesRealtimeUrl(
  config: TranscriptionProviderConfig,
): string {
  const rawUrl = config.websocketUrl.trim();
  const withProtocol = /^[a-z]+:\/\//i.test(rawUrl)
    ? rawUrl
    : `ws://${rawUrl}`;
  const url = new URL(withProtocol);
  if (url.protocol === "http:") {
    url.protocol = "ws:";
  } else if (url.protocol === "https:") {
    url.protocol = "wss:";
  }
  if (url.protocol !== "ws:" && url.protocol !== "wss:") {
    throw new Error("Speaches websocketUrl must use ws, wss, http or https.");
  }
  if (url.pathname === "/" || !url.pathname) {
    url.pathname = "/v1/realtime";
  }
  url.searchParams.set("model", config.model);
  url.searchParams.set("intent", "transcription");
  if (config.language.trim()) {
    url.searchParams.set("language", config.language);
  }
  if (config.apiKey && !config.sessionToken) {
    url.searchParams.set("api_key", config.apiKey);
  }
  return url.toString();
}

export class SpeachesTranscriptionProvider
  implements LiveTranscriptionProvider
{
  private readonly websocketFactory: (
    url: string,
    protocols?: string | string[],
  ) => WebSocket;
  private readonly maxReconnectAttempts: number;
  private readonly reconnectBaseDelayMs: number;
  private readonly reconnectMaxDelayMs: number;
  private readonly connectTimeoutMs: number;
  private readonly maxBufferedBytes: number;
  private readonly random: () => number;
  private readonly now: () => Date;
  private readonly idFactory: () => string;

  private socket: WebSocket | null = null;
  private config: TranscriptionProviderConfig | null = null;
  private status: TranscriptionConnectionStatus = "idle";
  private reconnectAttempts = 0;
  private reconnectTimer: TimerHandle | null = null;
  private connectTimeoutTimer: TimerHandle | null = null;
  private intentionalDisconnect = false;
  private generation = 0;
  private bufferedAudio: BufferedAudioChunk[] = [];
  private bufferedBytes = 0;
  private sendSequence: Promise<void> = Promise.resolve();
  private connectPromise:
    | {
        resolve: () => void;
        reject: (error: Error) => void;
        settled: boolean;
      }
    | undefined;
  private partialTextByItem = new Map<string, string>();
  private deliveredFinals = new Set<string>();

  private readonly partialCallbacks = new Set<TranscriptCallback>();
  private readonly finalCallbacks = new Set<TranscriptCallback>();
  private readonly statusCallbacks = new Set<StatusCallback>();
  private readonly errorCallbacks = new Set<ErrorCallback>();

  constructor(options: SpeachesTranscriptionProviderOptions = {}) {
    this.websocketFactory =
      options.websocketFactory ??
      ((url, protocols) => {
        if (typeof WebSocket === "undefined") {
          throw new Error("WebSocket is unavailable in this environment.");
        }
        return protocols ? new WebSocket(url, protocols) : new WebSocket(url);
      });
    this.maxReconnectAttempts = Math.max(
      0,
      options.maxReconnectAttempts ?? DEFAULT_MAX_RECONNECT_ATTEMPTS,
    );
    this.reconnectBaseDelayMs = Math.max(
      0,
      options.reconnectBaseDelayMs ?? DEFAULT_RECONNECT_BASE_DELAY_MS,
    );
    this.reconnectMaxDelayMs = Math.max(
      this.reconnectBaseDelayMs,
      options.reconnectMaxDelayMs ?? DEFAULT_RECONNECT_MAX_DELAY_MS,
    );
    this.connectTimeoutMs = Math.max(
      1,
      options.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS,
    );
    this.maxBufferedBytes = Math.max(
      1,
      options.maxBufferedBytes ?? DEFAULT_MAX_BUFFERED_BYTES,
    );
    this.random = options.random ?? Math.random;
    this.now = options.now ?? (() => new Date());
    this.idFactory = options.idFactory ?? defaultIdFactory;
  }

  connect(config: TranscriptionProviderConfig): Promise<void> {
    validateConfig(config);
    this.resetTransport();
    this.config = { ...config };
    this.intentionalDisconnect = false;
    this.reconnectAttempts = 0;
    this.partialTextByItem.clear();
    this.deliveredFinals.clear();
    this.transition("connecting");

    const promise = new Promise<void>((resolve, reject) => {
      this.connectPromise = { resolve, reject, settled: false };
    });
    void this.openSocket(this.generation);
    return promise;
  }

  async disconnect(): Promise<void> {
    this.intentionalDisconnect = true;
    this.generation += 1;
    this.clearTimers();
    const socket = this.socket;
    this.socket = null;
    if (socket) {
      this.detachSocket(socket);
      if (socket.readyState === SOCKET_OPEN || socket.readyState === SOCKET_CONNECTING) {
        socket.close(1000, "Client disconnected");
      }
    }
    if (this.connectPromise && !this.connectPromise.settled) {
      this.connectPromise.settled = true;
      this.connectPromise.reject(
        new Error("Speaches connection was cancelled by the client."),
      );
    }
    this.connectPromise = undefined;
    this.config = null;
    this.bufferedAudio = [];
    this.bufferedBytes = 0;
    this.partialTextByItem.clear();
    this.transition("stopped");
  }

  sendAudioChunk(chunk: ArrayBuffer | Blob): Promise<void> {
    const operation = this.sendSequence.then(async () => {
      const arrayBuffer =
        chunk instanceof Blob ? await chunk.arrayBuffer() : chunk.slice(0);
      const bytes = new Uint8Array(arrayBuffer);
      if (bytes.byteLength === 0) {
        return;
      }
      this.deliverOrBufferAudio(bytes);
    });
    this.sendSequence = operation.catch(() => undefined);
    return operation;
  }

  onPartialTranscript(callback: TranscriptCallback): void {
    this.partialCallbacks.add(callback);
  }

  onFinalTranscript(callback: TranscriptCallback): void {
    this.finalCallbacks.add(callback);
  }

  onStatusChange(callback: StatusCallback): void {
    this.statusCallbacks.add(callback);
    this.invokeSafely(callback, this.status);
  }

  onError(callback: ErrorCallback): void {
    this.errorCallbacks.add(callback);
  }

  getStatus(): TranscriptionConnectionStatus {
    return this.status;
  }

  getBufferedByteLength(): number {
    return this.bufferedBytes;
  }

  private resetTransport(): void {
    this.intentionalDisconnect = true;
    this.generation += 1;
    this.clearTimers();
    const socket = this.socket;
    this.socket = null;
    if (socket) {
      this.detachSocket(socket);
      if (socket.readyState === SOCKET_OPEN || socket.readyState === SOCKET_CONNECTING) {
        socket.close(1000, "Connection replaced");
      }
    }
    if (this.connectPromise && !this.connectPromise.settled) {
      this.connectPromise.settled = true;
      this.connectPromise.reject(new Error("Speaches connection was replaced."));
    }
    this.connectPromise = undefined;
    this.bufferedAudio = [];
    this.bufferedBytes = 0;
  }

  private async openSocket(generation: number): Promise<void> {
    let config = this.config;
    if (!config || this.intentionalDisconnect || generation !== this.generation) {
      return;
    }

    let socket: WebSocket;
    try {
      if (this.reconnectAttempts > 0 && config.refreshSession) {
        const refreshed = await config.refreshSession();
        if (
          this.intentionalDisconnect ||
          generation !== this.generation ||
          this.config !== config
        ) {
          return;
        }
        config = {
          ...config,
          sessionToken: refreshed.sessionToken,
          websocketUrl: refreshed.websocketUrl ?? config.websocketUrl,
        };
        this.config = config;
      }
      const protocols = config.sessionToken
        ? ["nutriopus", `hmac.${config.sessionToken}`]
        : undefined;
      socket = this.websocketFactory(
        buildSpeachesRealtimeUrl(config),
        protocols,
      );
    } catch (cause) {
      this.handleConnectionLoss(
        generation,
        cause instanceof Error ? cause : new Error(String(cause)),
      );
      return;
    }

    this.socket = socket;
    socket.binaryType = "arraybuffer";
    socket.onopen = () => {
      if (this.socket !== socket || generation !== this.generation) {
        return;
      }
      this.clearConnectTimeout();
      try {
        this.sendSessionConfiguration(socket, config);
      } catch (cause) {
        const error =
          cause instanceof Error ? cause : new Error(String(cause));
        this.failActiveSocket(socket, error, "Session configuration failed");
        return;
      }

      this.reconnectAttempts = 0;
      this.transition("connected");
      if (this.connectPromise && !this.connectPromise.settled) {
        this.connectPromise.settled = true;
        this.connectPromise.resolve();
      }
      this.flushBufferedAudio();
    };
    socket.onmessage = (event) => {
      void this.handleIncomingMessage(event.data);
    };
    socket.onerror = () => {
      this.emitError(new Error("Speaches WebSocket transport error."));
    };
    socket.onclose = (event) => {
      if (this.socket !== socket || generation !== this.generation) {
        return;
      }
      this.socket = null;
      this.clearConnectTimeout();
      const reason = event.reason ? `: ${event.reason}` : "";
      this.handleConnectionLoss(
        generation,
        new Error(`Speaches WebSocket closed (${event.code})${reason}`),
      );
    };

    this.connectTimeoutTimer = setTimeout(() => {
      if (
        this.socket !== socket ||
        socket.readyState !== SOCKET_CONNECTING ||
        generation !== this.generation
      ) {
        return;
      }
      const error = new Error("Speaches WebSocket connection timed out.");
      this.failActiveSocket(socket, error, "Connection timeout");
    }, this.connectTimeoutMs);
  }

  private sendSessionConfiguration(
    socket: WebSocket,
    config: TranscriptionProviderConfig,
  ): void {
    socket.send(
      JSON.stringify({
        event_id: this.idFactory(),
        type: "session.update",
        session: {
          input_audio_transcription: {
            model: config.model,
            language: config.language,
          },
          turn_detection: {
            type: "server_vad",
            create_response: false,
            threshold: 0.5,
            silence_duration_ms: 500,
          },
        },
      }),
    );
  }

  private deliverOrBufferAudio(bytes: Uint8Array): void {
    if (!this.config) {
      throw new Error("Speaches is not connected.");
    }
    if (this.status === "offline" || this.status === "error" || this.status === "stopped") {
      throw new Error(`Speaches cannot accept audio while ${this.status}.`);
    }

    if (this.socket?.readyState === SOCKET_OPEN) {
      const socket = this.socket;
      try {
        this.sendAudioBytes(socket, bytes);
        this.transition("streaming");
      } catch (cause) {
        const error =
          cause instanceof Error ? cause : new Error(String(cause));
        this.bufferAudio(bytes);
        this.failActiveSocket(socket, error, "Audio send failed");
      }
      return;
    }

    this.bufferAudio(bytes);
  }

  private sendAudioBytes(socket: WebSocket, bytes: Uint8Array): void {
    socket.send(
      JSON.stringify({
        event_id: this.idFactory(),
        type: "input_audio_buffer.append",
        audio: bytesToBase64(bytes),
      }),
    );
  }

  private bufferAudio(bytes: Uint8Array): void {
    if (bytes.byteLength > this.maxBufferedBytes) {
      this.emitError(
        new Error(
          "Speaches audio chunk exceeds the reconnect buffer and was dropped.",
        ),
      );
      return;
    }

    let dropped = false;
    while (
      this.bufferedAudio.length > 0 &&
      this.bufferedBytes + bytes.byteLength > this.maxBufferedBytes
    ) {
      const oldest = this.bufferedAudio.shift();
      if (oldest) {
        this.bufferedBytes -= oldest.byteLength;
        dropped = true;
      }
    }
    if (dropped) {
      this.emitError(
        new Error(
          "Speaches reconnect buffer was full; the oldest audio chunk was dropped.",
        ),
      );
    }
    const copy = bytes.slice();
    this.bufferedAudio.push({ bytes: copy, byteLength: copy.byteLength });
    this.bufferedBytes += copy.byteLength;
  }

  private flushBufferedAudio(): void {
    const socket = this.socket;
    if (!socket || socket.readyState !== SOCKET_OPEN) {
      return;
    }

    let sentAudio = false;
    while (this.bufferedAudio.length > 0) {
      const chunk = this.bufferedAudio.shift();
      if (!chunk) {
        break;
      }
      try {
        this.sendAudioBytes(socket, chunk.bytes);
        this.bufferedBytes -= chunk.byteLength;
        sentAudio = true;
      } catch (cause) {
        this.bufferedAudio.unshift(chunk);
        const error =
          cause instanceof Error ? cause : new Error(String(cause));
        this.failActiveSocket(
          socket,
          error,
          "Buffered audio send failed",
        );
        return;
      }
    }
    if (sentAudio && this.bufferedBytes === 0) {
      this.transition("streaming");
    }
  }

  private handleConnectionLoss(generation: number, error: Error): void {
    if (this.intentionalDisconnect || generation !== this.generation) {
      return;
    }
    this.emitError(error);

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.transition("offline");
      if (this.connectPromise && !this.connectPromise.settled) {
        this.connectPromise.settled = true;
        this.connectPromise.reject(
          new Error(
            `Speaches is offline after ${this.maxReconnectAttempts} reconnect attempts.`,
          ),
        );
      }
      return;
    }

    const attempt = this.reconnectAttempts;
    this.reconnectAttempts += 1;
    this.transition("reconnecting");
    const exponentialDelay = Math.min(
      this.reconnectMaxDelayMs,
      this.reconnectBaseDelayMs * 2 ** attempt,
    );
    const jitter = 0.8 + this.random() * 0.4;
    const delay = Math.round(exponentialDelay * jitter);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.openSocket(generation);
    }, delay);
  }

  private failActiveSocket(
    socket: WebSocket,
    error: Error,
    reason: string,
  ): void {
    if (this.socket !== socket) {
      return;
    }
    this.detachSocket(socket);
    this.socket = null;
    this.clearConnectTimeout();
    if (socket.readyState === SOCKET_OPEN || socket.readyState === SOCKET_CONNECTING) {
      socket.close(1011, reason);
    }
    this.handleConnectionLoss(this.generation, error);
  }

  private async handleIncomingMessage(data: unknown): Promise<void> {
    let decoded: unknown = data;
    try {
      if (typeof data === "string") {
        decoded = JSON.parse(data);
      } else if (data instanceof Blob) {
        decoded = JSON.parse(await data.text());
      } else if (data instanceof ArrayBuffer) {
        decoded = JSON.parse(new TextDecoder().decode(data));
      }
    } catch {
      this.emitError(new Error("Speaches sent a malformed realtime event."));
      return;
    }

    const parsed = parseProviderEvent(decoded);
    if (!parsed) {
      return;
    }
    if ("error" in parsed) {
      this.emitError(parsed.error);
      return;
    }

    const config = this.config;
    if (!config) {
      return;
    }
    const itemKey = parsed.itemId ?? "current";
    let text = parsed.text;
    if (parsed.kind === "partial") {
      if (parsed.isDelta) {
        text = `${this.partialTextByItem.get(itemKey) ?? ""}${parsed.text}`;
      }
      this.partialTextByItem.set(itemKey, text);
    } else {
      this.partialTextByItem.delete(itemKey);
      const dedupeKey =
        parsed.eventId ?? `${parsed.itemId ?? "item"}:${parsed.text}`;
      if (this.deliveredFinals.has(dedupeKey)) {
        return;
      }
      this.deliveredFinals.add(dedupeKey);
      if (this.deliveredFinals.size > 500) {
        const oldest = this.deliveredFinals.values().next().value;
        if (typeof oldest === "string") {
          this.deliveredFinals.delete(oldest);
        }
      }
    }

    const segment: LiveTranscriptionSegment = {
      id: parsed.itemId ?? parsed.eventId ?? this.idFactory(),
      tenantId: config.tenantId,
      appointmentId: config.appointmentId,
      participantId: config.participantId,
      speakerNameSnapshot: config.speakerName,
      speakerRoleSnapshot: config.speakerRole,
      kind: parsed.kind,
      text: text.trim(),
      confidence: parsed.confidence,
      startedAtMs: parsed.startedAtMs,
      endedAtMs: parsed.endedAtMs,
      clientTimestamp: this.now().toISOString(),
      providerTimestamp: parsed.providerTimestamp,
    };
    const callbacks =
      parsed.kind === "partial" ? this.partialCallbacks : this.finalCallbacks;
    for (const callback of callbacks) {
      this.invokeSafely(callback, segment);
    }
  }

  private transition(status: TranscriptionConnectionStatus): void {
    if (this.status === status) {
      return;
    }
    this.status = status;
    for (const callback of this.statusCallbacks) {
      this.invokeSafely(callback, status);
    }
  }

  private emitError(error: Error): void {
    for (const callback of this.errorCallbacks) {
      this.invokeSafely(callback, error);
    }
  }

  private invokeSafely<T>(callback: (value: T) => void, value: T): void {
    try {
      callback(value);
    } catch {
      // Consumer callbacks must not break the audio transport.
    }
  }

  private detachSocket(socket: WebSocket): void {
    socket.onopen = null;
    socket.onmessage = null;
    socket.onerror = null;
    socket.onclose = null;
  }

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.clearConnectTimeout();
  }

  private clearConnectTimeout(): void {
    if (this.connectTimeoutTimer) {
      clearTimeout(this.connectTimeoutTimer);
      this.connectTimeoutTimer = null;
    }
  }
}
