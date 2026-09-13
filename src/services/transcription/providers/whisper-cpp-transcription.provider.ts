import { StubTranscriptionProvider } from "./stub-transcription.provider";

export class WhisperCppTranscriptionProvider extends StubTranscriptionProvider {
  constructor() {
    super(
      "whisper_cpp",
      "whisper.cpp normally exposes HTTP inference; add a realtime gateway before selecting this provider.",
    );
  }
}
