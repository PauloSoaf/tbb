import type {
  LiveTranscriptionProvider,
  LiveTranscriptionSegment,
  TranscriptionConnectionStatus,
  TranscriptionProviderConfig,
  TranscriptionProviderName,
} from "./transcription-provider.interface";

type SegmentCallback = (segment: LiveTranscriptionSegment) => void;
type StatusCallback = (status: TranscriptionConnectionStatus) => void;
type ErrorCallback = (error: Error) => void;

export abstract class StubTranscriptionProvider
  implements LiveTranscriptionProvider
{
  private status: TranscriptionConnectionStatus = "idle";
  private readonly statusCallbacks = new Set<StatusCallback>();
  private readonly errorCallbacks = new Set<ErrorCallback>();

  protected constructor(
    private readonly providerName: TranscriptionProviderName,
    private readonly setupHint: string,
  ) {}

  async connect(config: TranscriptionProviderConfig): Promise<void> {
    this.transition("connecting");
    const mismatch = config.provider !== this.providerName
      ? ` Received provider "${config.provider}".`
      : "";
    const error = new Error(
      `${this.providerName} realtime adapter is not enabled yet.${mismatch} ${this.setupHint}`,
    );
    this.transition("offline");
    this.emitError(error);
    throw error;
  }

  async disconnect(): Promise<void> {
    this.transition("stopped");
  }

  async sendAudioChunk(chunk: ArrayBuffer | Blob): Promise<void> {
    void chunk;
    throw new Error(
      `${this.providerName} cannot accept audio until its wire protocol is enabled. ${this.setupHint}`,
    );
  }

  onPartialTranscript(callback: SegmentCallback): void {
    void callback;
    // Kept for interface compatibility while this provider is a transport stub.
  }

  onFinalTranscript(callback: SegmentCallback): void {
    void callback;
    // Kept for interface compatibility while this provider is a transport stub.
  }

  onStatusChange(callback: StatusCallback): void {
    this.statusCallbacks.add(callback);
    callback(this.status);
  }

  onError(callback: ErrorCallback): void {
    this.errorCallbacks.add(callback);
  }

  getStatus(): TranscriptionConnectionStatus {
    return this.status;
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

  private emitError(error: Error): void {
    for (const callback of this.errorCallbacks) {
      callback(error);
    }
  }
}
