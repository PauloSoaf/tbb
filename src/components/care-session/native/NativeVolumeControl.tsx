"use client";
import { Volume2, VolumeX } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { clampVolume } from "./usePictureInPicture";

interface Props {
  volume: number;
  isMuted: boolean;
  onChange: (v: number) => void;
  onToggleMute: () => void;
}

export function NativeVolumeControl({ volume, isMuted, onChange, onToggleMute }: Props) {
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onToggleMute}
        title={isMuted ? t("care_sessions.native.controls.unmute_remote") : t("care_sessions.native.controls.mute_remote")}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
      >
        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={isMuted ? 0 : volume}
        onChange={(e) => onChange(clampVolume(Number(e.target.value)))}
        title={t("care_sessions.native.controls.volume")}
        className="w-20 accent-white h-1 cursor-pointer"
      />
    </div>
  );
}
