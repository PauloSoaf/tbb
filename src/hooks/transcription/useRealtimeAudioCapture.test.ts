import { describe, expect, it, vi } from "vitest";
import {
  buildRealtimeAudioConstraints,
  classifyRealtimeAudioCaptureError,
  selectMediaRecorderMimeType,
} from "./useRealtimeAudioCapture";

describe("realtime audio capture helpers", () => {
  it.each([
    ["NotAllowedError", "permission_denied"],
    ["SecurityError", "permission_denied"],
    ["NotFoundError", "device_not_found"],
    ["OverconstrainedError", "device_not_found"],
    ["NotSupportedError", "unsupported"],
    ["AbortError", "error"],
  ])("maps %s to %s", (name, expected) => {
    expect(classifyRealtimeAudioCaptureError({ name })).toBe(expected);
  });

  it("selects the first MediaRecorder encoding supported by the browser", () => {
    const isSupported = vi.fn(
      (mimeType: string) => mimeType === "audio/ogg;codecs=opus",
    );

    expect(selectMediaRecorderMimeType(isSupported)).toBe(
      "audio/ogg;codecs=opus",
    );
    expect(isSupported).toHaveBeenCalledWith("audio/webm;codecs=opus");
  });

  it("builds production microphone constraints and pins the selected device", () => {
    expect(
      buildRealtimeAudioConstraints("microphone-2", 16_000, {
        noiseSuppression: false,
        channelCount: { ideal: 1 },
        deviceId: "ignored-by-explicit-selection",
      }),
    ).toEqual({
      echoCancellation: true,
      noiseSuppression: false,
      autoGainControl: true,
      channelCount: { ideal: 1 },
      sampleRate: { ideal: 16_000 },
      deviceId: { exact: "microphone-2" },
    });
  });
});
