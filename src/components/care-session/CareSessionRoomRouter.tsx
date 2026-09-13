"use client";
import { NativeVideoRoom } from "./native/NativeVideoRoom";
import { GoogleMeetRoom } from "./google/GoogleMeetRoom";
import { JitsiLegacyRoom } from "./jitsi/JitsiLegacyRoom";
import { ExternalMeetingRoom } from "./external/ExternalMeetingRoom";

export type ProviderType = "NATIVE_WEBRTC" | "GOOGLE_MEET" | "JITSI_LEGACY" | "EXTERNAL_LINK";

interface Props {
  provider: ProviderType;
  careSessionId: string;
  tenantSlug: string;
  role: "NUTRITIONIST" | "PATIENT";
  patientName: string;
  roomUrl?: string | null;
  externalMeetingUrl?: string | null;
  googleMeetUri?: string | null;
  nativeRoomName?: string | null;
  patientJoinToken?: string | null;
  onEnd?: () => void;
  onUpdateGoogleLink?: (url: string) => void;
}

export function CareSessionRoomRouter({
  provider,
  careSessionId,
  tenantSlug,
  role,
  patientName,
  roomUrl,
  externalMeetingUrl,
  googleMeetUri,
  patientJoinToken,
  onEnd,
  onUpdateGoogleLink,
}: Props) {
  switch (provider) {
    case "NATIVE_WEBRTC":
      return (
        <NativeVideoRoom
          careSessionId={careSessionId}
          tenantSlug={tenantSlug}
          role={role}
          patientName={patientName}
          patientJoinToken={patientJoinToken}
          onEnd={onEnd}
        />
      );
    case "GOOGLE_MEET":
      return (
        <GoogleMeetRoom
          googleMeetUri={googleMeetUri}
          externalMeetingUrl={externalMeetingUrl}
          role={role}
          tenantSlug={tenantSlug}
          careSessionId={careSessionId}
          onUpdateLink={onUpdateGoogleLink}
        />
      );
    case "JITSI_LEGACY":
      return (
        <JitsiLegacyRoom
          careSessionId={careSessionId}
          displayName={role === "NUTRITIONIST" ? "Nutricionista" : patientName}
        />
      );
    case "EXTERNAL_LINK":
      return (
        <ExternalMeetingRoom
          url={externalMeetingUrl ?? roomUrl ?? ""}
          role={role}
        />
      );
    default:
      return (
        <JitsiLegacyRoom
          careSessionId={careSessionId}
          displayName={role === "NUTRITIONIST" ? "Nutricionista" : patientName}
        />
      );
  }
}
