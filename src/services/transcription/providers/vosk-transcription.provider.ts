import { StubTranscriptionProvider } from "./stub-transcription.provider";

export class VoskTranscriptionProvider extends StubTranscriptionProvider {
  constructor() {
    super(
      "vosk",
      "Configure the Vosk WebSocket framing and result adapter before selecting this provider.",
    );
  }
}
