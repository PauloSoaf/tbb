import type { VideoProvider, CreateCareRoomInput, CareRoomResult } from "./video-provider.types";

export const nativeWebRTCProvider: VideoProvider = {
  async createRoom(input: CreateCareRoomInput): Promise<CareRoomResult> {
    const nativeRoomName = `nutriopus-native-${input.careSessionId}`;
    const nativeSignalChannel = `signal-${input.careSessionId}`;
    return {
      provider: "NATIVE_WEBRTC",
      nativeRoomName,
      nativeSignalChannel,
    };
  },
};
