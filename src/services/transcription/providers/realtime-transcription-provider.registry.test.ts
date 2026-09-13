import { describe, expect, it } from "vitest";
import { MockTranscriptionProvider } from "./mock-transcription.provider";
import {
  createRealtimeTranscriptionProvider,
  RealtimeTranscriptionProviderRegistry,
} from "./realtime-transcription-provider.registry";
import { SpeachesTranscriptionProvider } from "./speaches-transcription.provider";
import type { TranscriptionProviderConfig } from "./transcription-provider.interface";
import { VoskTranscriptionProvider } from "./vosk-transcription.provider";
import { WhisperCppTranscriptionProvider } from "./whisper-cpp-transcription.provider";
import { WhisperLiveTranscriptionProvider } from "./whisper-live-transcription.provider";

function mockConfig(): TranscriptionProviderConfig {
  return {
    provider: "mock",
    websocketUrl: "ws://localhost/mock",
    model: "mock",
    language: "pt",
    sampleRate: 16_000,
    chunkMs: 250,
    appointmentId: "appointment-1",
    tenantId: "tenant-1",
    participantId: "participant-1",
    speakerName: "Paciente",
    speakerRole: "PATIENT",
  };
}

describe("realtime transcription provider registry", () => {
  it("creates every built-in provider behind the common contract", () => {
    expect(createRealtimeTranscriptionProvider("speaches")).toBeInstanceOf(
      SpeachesTranscriptionProvider,
    );
    expect(createRealtimeTranscriptionProvider("mock")).toBeInstanceOf(
      MockTranscriptionProvider,
    );
    expect(createRealtimeTranscriptionProvider("whisper_live")).toBeInstanceOf(
      WhisperLiveTranscriptionProvider,
    );
    expect(createRealtimeTranscriptionProvider("whisper_cpp")).toBeInstanceOf(
      WhisperCppTranscriptionProvider,
    );
    expect(createRealtimeTranscriptionProvider("vosk")).toBeInstanceOf(
      VoskTranscriptionProvider,
    );
  });

  it("supports isolated custom registration without mutating defaults", () => {
    const registry = new RealtimeTranscriptionProviderRegistry({});
    registry.register("mock", () => new MockTranscriptionProvider());

    expect(registry.has("mock")).toBe(true);
    expect(registry.list()).toEqual(["mock"]);
    expect(registry.create("mock")).toBeInstanceOf(MockTranscriptionProvider);
    expect(() =>
      registry.register("mock", () => new MockTranscriptionProvider()),
    ).toThrow("already registered");
  });
});

describe("MockTranscriptionProvider", () => {
  it("emits scripted partial and final segments without retaining audio", async () => {
    const provider = new MockTranscriptionProvider({
      scriptedSegments: [
        { kind: "partial", text: "olá" },
        { kind: "final", text: "olá mundo", confidence: 0.99 },
      ],
      idFactory: () => "mock-segment",
      now: () => new Date("2026-07-26T12:00:00.000Z"),
    });
    const partials: string[] = [];
    const finals: string[] = [];
    provider.onPartialTranscript((segment) => partials.push(segment.text));
    provider.onFinalTranscript((segment) => finals.push(segment.text));

    await provider.connect(mockConfig());
    await provider.sendAudioChunk(new Uint8Array([1]).buffer);
    await provider.sendAudioChunk(new Uint8Array([2]).buffer);

    expect(partials).toEqual(["olá"]);
    expect(finals).toEqual(["olá mundo"]);
    expect(provider.getStatus()).toBe("streaming");
    await provider.disconnect();
  });

  it("makes alternative-provider stubs fail with an actionable status", async () => {
    const provider = new WhisperCppTranscriptionProvider();
    const statuses: string[] = [];
    const errors: Error[] = [];
    provider.onStatusChange((status) => statuses.push(status));
    provider.onError((error) => errors.push(error));

    await expect(
      provider.connect({
        ...mockConfig(),
        provider: "whisper_cpp",
      }),
    ).rejects.toThrow("realtime gateway");
    expect(statuses.at(-1)).toBe("offline");
    expect(errors).toHaveLength(1);
  });
});
