import type { VideoProvider, CreateCareRoomInput, CareRoomResult } from "./video-provider.types";

export const externalLinkProvider: VideoProvider = {
  async createRoom(input: CreateCareRoomInput): Promise<CareRoomResult> {
    return {
      provider: "EXTERNAL_LINK",
      externalMeetingUrl: input.externalUrl ?? "",
    };
  },
};
