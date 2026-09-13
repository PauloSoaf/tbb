import { describe, it, expect } from "vitest";
import {
  createManualTranscriptionSchema,
  updateTranscriptionSchema,
  rejectTranscriptionSchema,
  setTranscriptionVisibilitySchema,
  transcriptionSegmentSchema,
  transcriptionProviderResultSchema,
  bulkFinalTranscriptSegmentsSchema,
  finalTranscriptSegmentSchema,
  startAutomaticTranscriptionSchema,
  updateTranscriptSegmentSpeakerSchema,
  updateTranscriptionSettingsSchema,
} from "./transcription.schema";

describe("createManualTranscriptionSchema", () => {
  it("accepts valid manual transcription", () => {
    const result = createManualTranscriptionSchema.safeParse({
      patientId: "pat_1",
      rawTranscript: "Olá, como você está?",
      language: "pt-BR",
      consentForRecording: false,
      consentForTranscription: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts transcription without text (manual entry later)", () => {
    const result = createManualTranscriptionSchema.safeParse({ patientId: "pat_1" });
    expect(result.success).toBe(true);
  });

  it("rejects missing patientId", () => {
    const result = createManualTranscriptionSchema.safeParse({ rawTranscript: "text" });
    expect(result.success).toBe(false);
  });
});

describe("updateTranscriptionSchema", () => {
  it("accepts partial update", () => {
    const result = updateTranscriptionSchema.safeParse({
      editedTranscript: "Revisado",
      clinicalSummary: "Resumo clínico.",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty object", () => {
    expect(updateTranscriptionSchema.safeParse({}).success).toBe(true);
  });
});

describe("transcriptionSegmentSchema", () => {
  it("accepts valid segment", () => {
    const result = transcriptionSegmentSchema.safeParse({
      text: "Bom dia.",
      startSeconds: 0,
      endSeconds: 2.4,
      confidence: 0.91,
      speakerLabel: "Nutricionista",
      position: 0,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty text", () => {
    const result = transcriptionSegmentSchema.safeParse({ text: "" });
    expect(result.success).toBe(false);
  });

  it("rejects confidence > 1", () => {
    const result = transcriptionSegmentSchema.safeParse({ text: "Ok", confidence: 1.5 });
    expect(result.success).toBe(false);
  });

  it("rejects confidence < 0", () => {
    const result = transcriptionSegmentSchema.safeParse({ text: "Ok", confidence: -0.1 });
    expect(result.success).toBe(false);
  });
});

describe("transcriptionProviderResultSchema", () => {
  it("accepts success response with segments", () => {
    const result = transcriptionProviderResultSchema.safeParse({
      status: "success",
      text: "Transcrição completa",
      language: "pt-BR",
      durationSeconds: 120,
      confidence: 0.89,
      segments: [
        { text: "Olá", startSeconds: 0, endSeconds: 1, confidence: 0.9, position: 0 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts error response", () => {
    const result = transcriptionProviderResultSchema.safeParse({
      status: "error",
      message: "Could not transcribe audio",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = transcriptionProviderResultSchema.safeParse({ status: "unknown" });
    expect(result.success).toBe(false);
  });
});

describe("setTranscriptionVisibilitySchema", () => {
  it("accepts PATIENT_VISIBLE", () => {
    const result = setTranscriptionVisibilitySchema.safeParse({
      transcriptionId: "tr_1",
      visibility: "PATIENT_VISIBLE",
    });
    expect(result.success).toBe(true);
  });

  it("accepts NUTRITIONIST_ONLY", () => {
    const result = setTranscriptionVisibilitySchema.safeParse({
      transcriptionId: "tr_1",
      visibility: "NUTRITIONIST_ONLY",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid visibility", () => {
    const result = setTranscriptionVisibilitySchema.safeParse({
      transcriptionId: "tr_1",
      visibility: "PUBLIC",
    });
    expect(result.success).toBe(false);
  });
});

describe("rejectTranscriptionSchema", () => {
  it("accepts reject with reason", () => {
    const result = rejectTranscriptionSchema.safeParse({
      transcriptionId: "tr_1",
      reason: "Texto impreciso.",
    });
    expect(result.success).toBe(true);
  });

  it("accepts reject without reason", () => {
    const result = rejectTranscriptionSchema.safeParse({ transcriptionId: "tr_1" });
    expect(result.success).toBe(true);
  });
});

describe("realtime transcription schemas", () => {
  const careSessionId = "cm12345678901234567890123";
  const transcriptId = "cm22345678901234567890123";

  it("requires an appointment or care session", () => {
    expect(
      startAutomaticTranscriptionSchema.safeParse({
        mode: "online",
        participantId: "nutritionist:1",
        speakerName: "Nutricionista",
        speakerRole: "NUTRITIONIST",
      }).success
    ).toBe(false);
  });

  it("accepts a tenant-safe automatic session request", () => {
    expect(
      startAutomaticTranscriptionSchema.safeParse({
        careSessionId,
        mode: "online",
        noticeConfirmed: true,
        participantId: "nutritionist:1",
        speakerName: "Nutricionista",
        speakerRole: "NUTRITIONIST",
      }).success
    ).toBe(true);
  });

  it("accepts final segments and rejects partial persistence", () => {
    const base = {
      id: "provider-segment-1",
      text: "Segmento final.",
      source: "NUTRITIONIST",
      clientTimestamp: new Date().toISOString(),
    };
    expect(finalTranscriptSegmentSchema.safeParse(base).success).toBe(true);
    expect(
      finalTranscriptSegmentSchema.safeParse({ ...base, kind: "partial" }).success
    ).toBe(false);
  });

  it("limits each persistence batch to 100 segments", () => {
    const segment = {
      id: "segment",
      text: "Texto",
      source: "NUTRITIONIST",
      clientTimestamp: new Date().toISOString(),
    };
    expect(
      bulkFinalTranscriptSegmentsSchema.safeParse({
        transcriptId,
        segments: Array.from({ length: 101 }, (_, index) => ({
          ...segment,
          id: `segment-${index}`,
        })),
      }).success
    ).toBe(false);
  });

  it("enforces the no-audio policy in settings", () => {
    const settings = {
      enabled: true,
      autoStartOnlineAppointments: true,
      autoStartInPersonAppointments: true,
      requirePatientNotice: true,
      requireInPersonConfirmation: true,
      saveTranscriptByDefault: true,
      attachToMedicalRecordByDefault: false,
      provider: "speaches",
      model: "deepdml/faster-whisper-large-v3-turbo-ct2",
      fallbackModel: "Systran/faster-whisper-small",
      language: "pt",
      sampleRate: 16000,
      chunkMs: 1000,
      maxSessionMinutes: 120,
    };
    expect(updateTranscriptionSettingsSchema.safeParse(settings).success).toBe(true);
    expect(
      updateTranscriptionSettingsSchema.safeParse({ ...settings, saveAudio: true }).success
    ).toBe(false);
  });

  it("validates speaker corrections without accepting transcript text", () => {
    expect(
      updateTranscriptSegmentSpeakerSchema.safeParse({
        transcriptId,
        segmentKey: "provider-segment-1",
        speakerNameSnapshot: "Paciente",
        source: "PATIENT",
      }).success
    ).toBe(true);
  });
});
