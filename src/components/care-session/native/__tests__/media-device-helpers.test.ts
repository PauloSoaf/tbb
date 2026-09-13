import { describe, it, expect } from "vitest";
import {
  groupDevices,
  mapGetUserMediaError,
  supportsUserMedia,
} from "../media-device-helpers";

describe("mapGetUserMediaError", () => {
  it("maps NotAllowedError to permission_denied", () => {
    expect(mapGetUserMediaError({ name: "NotAllowedError" })).toBe("permission_denied");
  });

  it("maps PermissionDeniedError to permission_denied", () => {
    expect(mapGetUserMediaError({ name: "PermissionDeniedError" })).toBe("permission_denied");
  });

  it("maps SecurityError to permission_denied", () => {
    expect(mapGetUserMediaError({ name: "SecurityError" })).toBe("permission_denied");
  });

  it("maps NotFoundError to no_camera for video", () => {
    expect(mapGetUserMediaError({ name: "NotFoundError" }, "video")).toBe("no_camera");
  });

  it("maps NotFoundError to no_microphone for audio", () => {
    expect(mapGetUserMediaError({ name: "NotFoundError" }, "audio")).toBe("no_microphone");
  });

  it("maps NotReadableError to device_in_use", () => {
    expect(mapGetUserMediaError({ name: "NotReadableError" })).toBe("device_in_use");
  });

  it("maps OverconstrainedError to overconstrained", () => {
    expect(mapGetUserMediaError({ name: "OverconstrainedError" })).toBe("overconstrained");
  });

  it("maps TypeError to unsupported", () => {
    expect(mapGetUserMediaError({ name: "TypeError" })).toBe("unsupported");
  });

  it("falls back to permission_denied for unknown errors", () => {
    expect(mapGetUserMediaError({ name: "SomethingElse" })).toBe("permission_denied");
    expect(mapGetUserMediaError(null)).toBe("permission_denied");
  });
});

describe("supportsUserMedia", () => {
  it("returns true when the full mediaDevices API exists", () => {
    const nav = {
      mediaDevices: {
        getUserMedia: () => Promise.resolve(),
        enumerateDevices: () => Promise.resolve([]),
      },
    } as unknown as Navigator;
    expect(supportsUserMedia(nav)).toBe(true);
  });

  it("returns false when mediaDevices is missing", () => {
    expect(supportsUserMedia({} as Navigator)).toBe(false);
  });

  it("returns false when enumerateDevices is missing", () => {
    const nav = {
      mediaDevices: { getUserMedia: () => Promise.resolve() },
    } as unknown as Navigator;
    expect(supportsUserMedia(nav)).toBe(false);
  });

  it("returns false when navigator is undefined", () => {
    expect(supportsUserMedia(undefined)).toBe(false);
  });
});

describe("groupDevices", () => {
  const labels = { audioinput: "Microphone", videoinput: "Camera", audiooutput: "Speaker" };

  it("groups devices by kind", () => {
    const grouped = groupDevices(
      [
        { kind: "audioinput", deviceId: "a1", label: "Mic USB" },
        { kind: "videoinput", deviceId: "v1", label: "Webcam" },
        { kind: "audiooutput", deviceId: "o1", label: "Headphones" },
      ],
      labels
    );
    expect(grouped.audioInputs).toEqual([{ deviceId: "a1", label: "Mic USB" }]);
    expect(grouped.videoInputs).toEqual([{ deviceId: "v1", label: "Webcam" }]);
    expect(grouped.audioOutputs).toEqual([{ deviceId: "o1", label: "Headphones" }]);
  });

  it("generates fallback labels for unlabeled devices", () => {
    const grouped = groupDevices(
      [{ kind: "videoinput", deviceId: "abcd1234", label: "" }],
      labels
    );
    expect(grouped.videoInputs[0].label).toBe("Camera abcd");
  });
});
