import type { VideoProvider, CreateCareRoomInput, CareRoomResult } from "./video-provider.types";

export const jitsiLegacyProvider: VideoProvider = {
  async createRoom(input: CreateCareRoomInput): Promise<CareRoomResult> {
    const roomId = `nutriopus-${input.careSessionId}`;
    const roomUrl = `https://meet.jit.si/${roomId}`;
    return { provider: "JITSI_LEGACY", roomId, roomUrl };
  },
};
