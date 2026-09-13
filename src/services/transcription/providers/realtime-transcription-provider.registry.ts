import { MockTranscriptionProvider } from "./mock-transcription.provider";
import { SpeachesTranscriptionProvider } from "./speaches-transcription.provider";
import type {
  LiveTranscriptionProvider,
  TranscriptionProviderName,
} from "./transcription-provider.interface";
import { VoskTranscriptionProvider } from "./vosk-transcription.provider";
import { WhisperCppTranscriptionProvider } from "./whisper-cpp-transcription.provider";
import { WhisperLiveTranscriptionProvider } from "./whisper-live-transcription.provider";

export type RealtimeTranscriptionProviderFactory =
  () => LiveTranscriptionProvider;

const defaultFactories: Record<
  TranscriptionProviderName,
  RealtimeTranscriptionProviderFactory
> = {
  speaches: () => new SpeachesTranscriptionProvider(),
  whisper_live: () => new WhisperLiveTranscriptionProvider(),
  whisper_cpp: () => new WhisperCppTranscriptionProvider(),
  vosk: () => new VoskTranscriptionProvider(),
  mock: () => new MockTranscriptionProvider(),
};

export class RealtimeTranscriptionProviderRegistry {
  private readonly factories: Map<
    TranscriptionProviderName,
    RealtimeTranscriptionProviderFactory
  >;

  constructor(
    factories: Partial<
      Record<TranscriptionProviderName, RealtimeTranscriptionProviderFactory>
    > = defaultFactories,
  ) {
    this.factories = new Map(
      Object.entries(factories) as Array<
        [TranscriptionProviderName, RealtimeTranscriptionProviderFactory]
      >,
    );
  }

  register(
    name: TranscriptionProviderName,
    factory: RealtimeTranscriptionProviderFactory,
    options: { replace?: boolean } = {},
  ): void {
    if (this.factories.has(name) && !options.replace) {
      throw new Error(
        `Realtime transcription provider "${name}" is already registered.`,
      );
    }
    this.factories.set(name, factory);
  }

  create(name: TranscriptionProviderName): LiveTranscriptionProvider {
    const factory = this.factories.get(name);
    if (!factory) {
      throw new Error(
        `Realtime transcription provider "${name}" is not registered.`,
      );
    }
    return factory();
  }

  has(name: TranscriptionProviderName): boolean {
    return this.factories.has(name);
  }

  list(): TranscriptionProviderName[] {
    return [...this.factories.keys()];
  }
}

export const realtimeTranscriptionProviderRegistry =
  new RealtimeTranscriptionProviderRegistry();

export function createRealtimeTranscriptionProvider(
  name: TranscriptionProviderName,
): LiveTranscriptionProvider {
  return realtimeTranscriptionProviderRegistry.create(name);
}
