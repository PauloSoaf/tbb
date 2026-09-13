"use client";
import { useRef, useState } from "react";
import { Settings, X, Mic, Volume2, Camera, Loader2 } from "lucide-react";
import type { MediaDevice } from "./useMediaDevices";
import { useI18n } from "@/lib/i18n/I18nContext";

interface Props {
  audioInputs: MediaDevice[];
  videoInputs: MediaDevice[];
  audioOutputs: MediaDevice[];
  selectedAudioInput: string;
  selectedVideoInput: string;
  selectedAudioOutput: string;
  onSwitchAudioInput: (deviceId: string) => void | Promise<void>;
  onSwitchVideoInput: (deviceId: string) => void | Promise<void>;
  onSwitchAudioOutput: (deviceId: string) => void;
}

export function NativeDeviceSelector({
  audioInputs,
  videoInputs,
  audioOutputs,
  selectedAudioInput,
  selectedVideoInput,
  selectedAudioOutput,
  onSwitchAudioInput,
  onSwitchVideoInput,
  onSwitchAudioOutput,
}: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [audioInputPending, setAudioInputPending] = useState(false);
  const [videoInputPending, setVideoInputPending] = useState(false);
  const audioInputPendingRef = useRef(false);
  const videoInputPendingRef = useRef(false);

  const handleSwitchAudioInput = async (deviceId: string) => {
    if (audioInputPendingRef.current) return;

    audioInputPendingRef.current = true;
    setAudioInputPending(true);
    try {
      await onSwitchAudioInput(deviceId);
    } finally {
      audioInputPendingRef.current = false;
      setAudioInputPending(false);
    }
  };

  const handleSwitchVideoInput = async (deviceId: string) => {
    if (videoInputPendingRef.current) return;

    videoInputPendingRef.current = true;
    setVideoInputPending(true);
    try {
      await onSwitchVideoInput(deviceId);
    } finally {
      videoInputPendingRef.current = false;
      setVideoInputPending(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={t("care_sessions.native.devices.settings")}
        className={`p-2.5 rounded-full transition-colors ${
          open ? "bg-brand-blue text-white" : "bg-white/10 hover:bg-white/20 text-white"
        }`}
      >
        <Settings className="w-5 h-5" />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div className="absolute bottom-full mb-2 right-0 z-50 w-72 rounded-2xl bg-gray-900 border border-white/10 shadow-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">
                {t("care_sessions.native.devices.title")}
              </p>
              <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Microphone */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-medium text-white/60 uppercase tracking-wider">
                <Mic className="w-3.5 h-3.5" />
                {t("care_sessions.native.devices.microphone")}
                {audioInputPending && (
                  <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                )}
              </label>
              <select
                value={selectedAudioInput}
                onChange={(e) => void handleSwitchAudioInput(e.target.value)}
                disabled={audioInputPending}
                aria-busy={audioInputPending || undefined}
                className="w-full rounded-xl bg-white/10 border border-white/10 text-white text-sm px-3 py-2 outline-none focus:border-brand-blue disabled:cursor-wait disabled:opacity-60"
              >
                {audioInputs.length === 0 && (
                  <option value="">{t("care_sessions.native.devices.no_devices")}</option>
                )}
                {audioInputs.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Speaker / Audio output */}
            {audioOutputs.length > 0 && (
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-medium text-white/60 uppercase tracking-wider">
                  <Volume2 className="w-3.5 h-3.5" />
                  {t("care_sessions.native.devices.speaker")}
                </label>
                <select
                  value={selectedAudioOutput}
                  onChange={(e) => onSwitchAudioOutput(e.target.value)}
                  className="w-full rounded-xl bg-white/10 border border-white/10 text-white text-sm px-3 py-2 outline-none focus:border-brand-blue"
                >
                  {audioOutputs.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Camera */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-medium text-white/60 uppercase tracking-wider">
                <Camera className="w-3.5 h-3.5" />
                {t("care_sessions.native.devices.camera")}
                {videoInputPending && (
                  <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                )}
              </label>
              <select
                value={selectedVideoInput}
                onChange={(e) => void handleSwitchVideoInput(e.target.value)}
                disabled={videoInputPending}
                aria-busy={videoInputPending || undefined}
                className="w-full rounded-xl bg-white/10 border border-white/10 text-white text-sm px-3 py-2 outline-none focus:border-brand-blue disabled:cursor-wait disabled:opacity-60"
              >
                {videoInputs.length === 0 && (
                  <option value="">{t("care_sessions.native.devices.no_devices")}</option>
                )}
                {videoInputs.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
