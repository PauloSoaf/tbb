import type { VideoProvider, CreateCareRoomInput, CareRoomResult } from "./video-provider.types";

export const googleMeetProvider: VideoProvider = {
  async createRoom(input: CreateCareRoomInput): Promise<CareRoomResult> {
    // Se externalUrl foi passado (link manual), salva como googleMeetUri
    if (input.externalUrl) {
      return {
        provider: "GOOGLE_MEET",
        googleMeetUri: input.externalUrl,
        externalMeetingUrl: input.externalUrl,
      };
    }
    // OAuth automático não configurado nesta versão — retorna vazio para UI tratar
    return { provider: "GOOGLE_MEET" };
  },
};
