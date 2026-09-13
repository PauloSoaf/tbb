export type CareSessionProviderEnum = "NATIVE_WEBRTC" | "GOOGLE_MEET" | "JITSI_LEGACY" | "EXTERNAL_LINK";

export type CreateCareRoomInput = {
  nutritionistId: string;
  patientId: string;
  careSessionId: string;
  title?: string;
  startsAt?: Date;
  externalUrl?: string;
};

export type CareRoomResult = {
  provider: CareSessionProviderEnum;
  roomId?: string;
  roomUrl?: string;
  externalMeetingUrl?: string;
  googleMeetSpaceName?: string;
  googleMeetUri?: string;
  googleMeetMeetingCode?: string;
  nativeRoomName?: string;
  nativeSignalChannel?: string;
};

export interface VideoProvider {
  createRoom(input: CreateCareRoomInput): Promise<CareRoomResult>;
  endRoom?(input: { careSessionId: string; nutritionistId: string }): Promise<void>;
}
