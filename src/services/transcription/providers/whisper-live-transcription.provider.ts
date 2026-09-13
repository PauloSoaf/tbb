import { StubTranscriptionProvider } from "./stub-transcription.provider";

export class WhisperLiveTranscriptionProvider extends StubTranscriptionProvider {
  constructor() {
    super(
      "whisper_live",
      "Configure a dedicated WhisperLive WebSocket protocol adapter before selecting this provider.",
    );
  }
}
