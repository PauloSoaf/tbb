"use client";
import { MicOff, VideoOff } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import type { RTCState } from "./useNativeWebRTC";

export interface ParticipantInfo {
  name: string;
  isLocal?: boolean;
  rtcState?: RTCState;
  cameraOn?: boolean;
  micOn?: boolean;
}

interface Props {
  participants: ParticipantInfo[];
}

function stateLabel(state: RTCState | undefined, t: (k: string) => string): string {
  if (!state || state === "idle") return t("care_sessions.native.participants.waiting");
  if (state === "connecting" || state === "waiting") return t("care_sessions.native.participants.waiting");
  if (state === "connected") return t("care_sessions.native.participants.connected");
  if (state === "disconnected" || state === "error") return t("care_sessions.native.participants.reconnecting");
  return "";
}

function stateColor(state: RTCState | undefined): string {
  if (state === "connected") return "text-green-400";
  if (state === "disconnected" || state === "error") return "text-red-400";
  return "text-white/40";
}

export function NativeParticipantsStatus({ participants }: Props) {
  const { t } = useI18n();

  return (
    <div className="p-3 min-w-[200px]">
      <p className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">
        {t("care_sessions.native.participants.title")}
      </p>
      <ul className="flex flex-col gap-2">
        {participants.map((p, i) => (
          <li key={i} className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-semibold text-white/80 shrink-0">
              {p.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-xs text-white truncate">
                  {p.name}
                  {p.isLocal && <span className="text-white/30 ml-1">({t("care_sessions.native.participants.you")})</span>}
                </span>
                {p.micOn === false && <MicOff className="w-3 h-3 text-red-400 shrink-0" />}
                {p.cameraOn === false && <VideoOff className="w-3 h-3 text-red-400 shrink-0" />}
              </div>
              {!p.isLocal && (
                <span className={`text-[10px] ${stateColor(p.rtcState)}`}>
                  {stateLabel(p.rtcState, t)}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
