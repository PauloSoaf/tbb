import type {
  LiveTranscriptionProvider,
  LiveTranscriptionSegment,
  TranscriptionConnectionStatus,
  TranscriptionProviderConfig,
} from "./transcription-provider.interface";

type SegmentCallback = (segment: LiveTranscriptionSegment) => void;
type StatusCallback = (status: TranscriptionConnectionStatus) => void;
type ErrorCallback = (error: Error) => void;

export interface MockTranscriptionProviderOptions {
  connectDelayMs?: number;
  scriptedSegments?: Array<{
    kind: "partial" | "final";
    text: string;
    confidence?: number;
  }>;
  now?: () => Date;
  idFactory?: () => string;
}

export class MockTranscriptionProvider implements LiveTranscriptionProvider {
  private readonly options: MockTranscriptionProviderOptions;
  private config: TranscriptionProviderConfig | null = null;
  private status: TranscriptionConnectionStatus = "idle";
  private scriptIndex = 0;
  private readonly partialCallbacks = new Set<SegmentCallback>();
  private readonly finalCallbacks = new Set<SegmentCallback>();
  private readonly statusCallbacks = new Set<StatusCallback>();
  private readonly errorCallbacks = new Set<ErrorCallback>();

  constructor(options: MockTranscriptionProviderOptions = {}) {
    this.options = options;
  }

  async connect(config: TranscriptionProviderConfig): Promise<void> {
    if (config.provider !== "mock") {
      throw new Error(
        `MockTranscriptionProvider received provider "${config.provider}".`,
      );
    }
    this.config = { ...config };
    this.scriptIndex = 0;
    this.transition("connecting");
    if (this.options.connectDelayMs) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, this.options.connectDelayMs);
      });
    }
    this.transition("connected");
  }

  async disconnect(): Promise<void> {
    this.config = null;
    this.transition("stopped");
  }

  async sendAudioChunk(chunk: ArrayBuffer | Blob): Promise<void> {
    if (!this.config || (this.status !== "connected" && this.status !== "streaming")) {
      throw new Error("Mock transcription provider is not connected.");
    }
    const byteLength = chunk instanceof Blob ? chunk.size : chunk.byteLength;
    if (byteLength === 0) {
      return;
    }
    this.transition("streaming");
    const scripted = this.options.scriptedSegments?.[this.scriptIndex];
    if (scripted) {
      this.scriptIndex += 1;
      this.emitSegment(scripted.kind, scripted.text, {
        confidence: scripted.confidence,
      });
    }
  }

  onPartialTranscript(callback: SegmentCallback): void {
    this.partialCallbacks.add(callback);
  }

  onFinalTranscript(callback: SegmentCallback): void {
    this.finalCallbacks.add(callback);
  }

  onStatusChange(callback: StatusCallback): void {
    this.statusCallbacks.add(callback);
    callback(this.status);
  }

  onError(callback: ErrorCallback): void {
    this.errorCallbacks.add(callback);
  }

  emitPartial(
    text: string,
    overrides: Partial<LiveTranscriptionSegment> = {},
  ): void {
    this.emitSegment("partial", text, overrides);
  }

  emitFinal(
    text: string,
    overrides: Partial<LiveTranscriptionSegment> = {},
  ): void {
    this.emitSegment("final", text, overrides);
  }

  fail(error: Error): void {
    this.transition("error");
    for (const callback of this.errorCallbacks) {
      callback(error);
    }
  }

  getStatus(): TranscriptionConnectionStatus {
    return this.status;
  }

  private emitSegment(
    kind: "partial" | "final",
    text: string,
    overrides: Partial<LiveTranscriptionSegment>,
  ): void {
    const config = this.config;
    if (!config) {
      throw new Error("Mock transcription provider is not connected.");
    }
    const now = this.options.now?.() ?? new Date();
    const id =
      this.options.idFactory?.() ??
      (typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `mock-${Date.now()}-${this.scriptIndex}`);
    const segment: LiveTranscriptionSegment = {
      id,
      tenantId: config.tenantId,
      appointmentId: config.appointmentId,
      participantId: config.participantId,
      speakerNameSnapshot: config.speakerName,
      speakerRoleSnapshot: config.speakerRole,
      kind,
      text: text.trim(),
      clientTimestamp: now.toISOString(),
      ...overrides,
    };
    const callbacks = kind === "partial"
      ? this.partialCallbacks
      : this.finalCallbacks;
    for (const callback of callbacks) {
      callback(segment);
    }
  }

  private transition(status: TranscriptionConnectionStatus): void {
    if (this.status === status) {
      return;
    }
    this.status = status;
    for (const callback of this.statusCallbacks) {
      callback(status);
    }
  }
}
