// Pure helpers for media device handling — kept hook-free so they can be
// unit-tested in a node environment.

export type MediaErrorCode =
  | "permission_denied"
  | "no_camera"
  | "no_microphone"
  | "device_in_use"
  | "overconstrained"
  | "unsupported"
  | null;

export type MediaDevice = { deviceId: string; label: string };

/** Maps getUserMedia DOMException names to app-level error codes. */
export function mapGetUserMediaError(err: unknown, kind: "video" | "audio" | "both" = "both"): Exclude<MediaErrorCode, null> {
  const name = (err as { name?: string } | null)?.name ?? "";
  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
    case "SecurityError":
      return "permission_denied";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return kind === "audio" ? "no_microphone" : "no_camera";
    case "NotReadableError":
    case "TrackStartError":
      return "device_in_use";
    case "OverconstrainedError":
    case "ConstraintNotSatisfiedError":
      return "overconstrained";
    case "TypeError":
      return "unsupported";
    default:
      return "permission_denied";
  }
}

/** True when the browser exposes the full mediaDevices API we need. */
export function supportsUserMedia(nav: Navigator | undefined = typeof navigator !== "undefined" ? navigator : undefined): boolean {
  return (
    !!nav &&
    !!nav.mediaDevices &&
    typeof nav.mediaDevices.getUserMedia === "function" &&
    typeof nav.mediaDevices.enumerateDevices === "function"
  );
}

/** Groups enumerateDevices() results with stable fallback labels. */
export function groupDevices(
  devices: Pick<MediaDeviceInfo, "kind" | "deviceId" | "label">[],
  fallbackLabels: { audioinput: string; videoinput: string; audiooutput: string }
): { audioInputs: MediaDevice[]; videoInputs: MediaDevice[]; audioOutputs: MediaDevice[] } {
  const toDevice = (d: Pick<MediaDeviceInfo, "kind" | "deviceId" | "label">): MediaDevice => ({
    deviceId: d.deviceId,
    label:
      d.label ||
      `${fallbackLabels[d.kind as keyof typeof fallbackLabels] ?? d.kind} ${d.deviceId.slice(0, 4)}`,
  });
  return {
    audioInputs: devices.filter((d) => d.kind === "audioinput").map(toDevice),
    videoInputs: devices.filter((d) => d.kind === "videoinput").map(toDevice),
    audioOutputs: devices.filter((d) => d.kind === "audiooutput").map(toDevice),
  };
}
