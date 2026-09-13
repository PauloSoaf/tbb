"use client";
import { useEffect, useState } from "react";
import { Monitor } from "lucide-react";
import { NativeConnectionStatus } from "./NativeConnectionStatus";
import { NativeVolumeControl } from "./NativeVolumeControl";
import { useI18n } from "@/lib/i18n/I18nContext";
import type { RTCState } from "./useNativeWebRTC";

interface Props {
  rtcState: RTCState;
  label: string;
  isSharing: boolean;
  remoteVolume: number;
  isRemoteMuted: boolean;
  onVolumeChange: (v: number) => void;
  onToggleRemoteMute: () => void;
}

function useCallTimer(active: boolean): string {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!active) {
      const reset = setTimeout(() => setSeconds(0), 0);
      return () => clearTimeout(reset);
    }
    const startedAt = Date.now();
    const update = () => setSeconds(Math.floor((Date.now() - startedAt) / 1000));
    const kick = setTimeout(update, 0);
    const id = setInterval(update, 1000);
    return () => { clearTimeout(kick); clearInterval(id); };
  }, [active]);

  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function NativeCallStatusBar({ rtcState, label, isSharing, remoteVolume, isRemoteMuted, onVolumeChange, onToggleRemoteMute }: Props) {
  const { t } = useI18n();
  const timer = useCallTimer(rtcState === "connected");

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-900/90 backdrop-blur-sm shrink-0 gap-2">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xs text-white/60 truncate">{label}</span>
        {isSharing && (
          <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-600/80 rounded text-white text-[10px] font-medium shrink-0">
            <Monitor className="w-3 h-3" />
            {t("care_sessions.native.screen_share.badge")}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {rtcState === "connected" && (
          <NativeVolumeControl
            volume={remoteVolume}
            isMuted={isRemoteMuted}
            onChange={onVolumeChange}
            onToggleMute={onToggleRemoteMute}
          />
        )}
        {rtcState === "connected" && (
          <span className="text-xs font-mono text-white/50">{timer}</span>
        )}
        <NativeConnectionStatus state={rtcState} />
      </div>
    </div>
  );
}
