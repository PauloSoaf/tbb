"use client";
import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { VideoOff, MicOff } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";

interface Props {
  stream: MediaStream | null;
  label?: string;
  initials?: string;
  isLocal?: boolean;
  cameraOn?: boolean;
  micOn?: boolean;
  /**
   * Remote camera/mic state received via `media-state` signaling.
   * Reliable source of truth — `track.muted` alone is NOT trustworthy
   * (it also fires on network hiccups).
   */
  remoteCameraOn?: boolean;
  remoteMicOn?: boolean;
  remoteVolume?: number;
  isRemoteMuted?: boolean;
  /** Speaker deviceId (setSinkId). Ignored when unsupported. */
  audioOutputId?: string;
  onAudioOutputUnsupported?: () => void;
}

export interface NativeVideoParticipantHandle {
  videoElement: HTMLVideoElement | null;
}

export function getInitials(label: string): string {
  return label
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export const NativeVideoParticipant = forwardRef<NativeVideoParticipantHandle, Props>(
  function NativeVideoParticipant(
    {
      stream,
      label,
      initials,
      isLocal,
      cameraOn = true,
      micOn = true,
      remoteCameraOn,
      remoteMicOn,
      remoteVolume = 1,
      isRemoteMuted = false,
      audioOutputId,
      onAudioOutputUnsupported,
    },
    ref
  ) {
    const { t } = useI18n();
    const videoRef = useRef<HTMLVideoElement>(null);

    useImperativeHandle(ref, () => ({
      get videoElement() {
        return videoRef.current;
      },
    }));

    useEffect(() => {
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
      }
    }, [stream]);

    useEffect(() => {
      if (videoRef.current && !isLocal) {
        videoRef.current.volume = isRemoteMuted ? 0 : remoteVolume;
      }
    }, [remoteVolume, isRemoteMuted, isLocal]);

    // Speaker selection with feature detection — setSinkId is not universal.
    useEffect(() => {
      const video = videoRef.current;
      if (!video || isLocal || !audioOutputId) return;
      const canSetSinkId = typeof (video as HTMLVideoElement & { setSinkId?: unknown }).setSinkId === "function";
      if (!canSetSinkId) {
        onAudioOutputUnsupported?.();
        return;
      }
      (video as HTMLVideoElement & { setSinkId: (id: string) => Promise<void> })
        .setSinkId(audioOutputId)
        .catch(() => onAudioOutputUnsupported?.());
    }, [audioOutputId, isLocal, onAudioOutputUnsupported]);

    // Cleanup on unmount: pause and detach the stream.
    useEffect(() => {
      const video = videoRef.current;
      return () => {
        if (video) {
          video.pause();
          video.srcObject = null;
        }
      };
    }, []);

    // Does the stream actually carry a live video track?
    const hasLiveVideo = !!stream && stream.getVideoTracks().some((tr) => tr.readyState === "live");

    // Effective states: local uses its own flags; remote prefers the explicit
    // media-state signal, falling back to actual track presence.
    const effectiveCameraOn = isLocal ? cameraOn : (remoteCameraOn ?? hasLiveVideo);
    const effectiveMicOn = isLocal ? micOn : (remoteMicOn ?? micOn);

    const showVideo = !!stream && hasLiveVideo && effectiveCameraOn;
    // `initials` prop is ALREADY the final initials — never re-derive it.
    const displayInitials = initials ?? (label ? getInitials(label) : "?");

    return (
      <div className="relative w-full h-full bg-gray-900 rounded-xl overflow-hidden flex items-center justify-center">
        {/* Keep the <video> mounted so audio keeps playing when the remote
            camera is off — only visually hidden. */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={showVideo ? "w-full h-full object-cover" : "hidden"}
        />
        {!showVideo && (
          <div className="flex flex-col items-center gap-3 text-white/60">
            <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center text-2xl font-semibold text-white/80">
              {displayInitials}
            </div>
            {!effectiveCameraOn && label && (
              <div className="flex items-center gap-1.5 text-xs text-white/40">
                <VideoOff className="w-3.5 h-3.5" />
                {label}
              </div>
            )}
          </div>
        )}

        {label && showVideo && (
          <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/50 backdrop-blur-sm rounded text-white text-xs">
            {label}
          </div>
        )}

        {isLocal && (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/50 backdrop-blur-sm rounded text-white text-[10px]">
            {t("care_sessions.native.participants.you")}
          </div>
        )}

        {!effectiveMicOn && !isLocal && (
          <div className="absolute top-2 left-2 p-1 bg-red-600/80 rounded-full">
            <MicOff className="w-3 h-3 text-white" />
          </div>
        )}
      </div>
    );
  }
);
