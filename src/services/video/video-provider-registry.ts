import { nativeWebRTCProvider } from "./native-webrtc.provider";
import { googleMeetProvider } from "./google-meet.provider";
import { jitsiLegacyProvider } from "./jitsi-legacy.provider";
import { externalLinkProvider } from "./external-link.provider";
import type { VideoProvider, CareSessionProviderEnum } from "./video-provider.types";

const registry: Record<CareSessionProviderEnum, VideoProvider> = {
  NATIVE_WEBRTC: nativeWebRTCProvider,
  GOOGLE_MEET: googleMeetProvider,
  JITSI_LEGACY: jitsiLegacyProvider,
  EXTERNAL_LINK: externalLinkProvider,
};

export function getVideoProvider(provider: CareSessionProviderEnum): VideoProvider {
  return registry[provider];
}
