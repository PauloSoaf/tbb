"use client";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { useMediaDevices } from "./useMediaDevices";
import { useNativeWebRTC } from "./useNativeWebRTC";
import { useScreenShare } from "./useScreenShare";
import { usePictureInPicture, clampVolume } from "./usePictureInPicture";
import { useNativeCallFullscreen } from "./useNativeCallFullscreen";
import { useNativeCallShortcuts } from "./useNativeCallShortcuts";
import { useNativeCallEvents } from "./useNativeCallEvents";

import { NativeVideoParticipant, type NativeVideoParticipantHandle } from "./NativeVideoParticipant";
import { NativeVideoControls } from "./NativeVideoControls";
import { NativeCallStatusBar } from "./NativeCallStatusBar";
import { NativeCallEmptyState } from "./NativeCallEmptyState";
import { NativeParticipantsStatus } from "./NativeParticipantsStatus";
import { CallFloatingMiniWindow } from "./CallFloatingMiniWindow";
import { NativeDeviceSelector } from "./NativeDeviceSelector";

import { useI18n } from "@/lib/i18n/I18nContext";

interface Props {
  careSessionId: string;
  tenantSlug: string;
  role: "NUTRITIONIST" | "PATIENT";
  patientName: string;
  patientLink?: string;
  patientJoinToken?: string | null;
  onEnd?: () => void;
}

export function NativeVideoRoom({
  careSessionId,
  tenantSlug,
  role,
  patientName,
  patientLink,
  patientJoinToken,
  onEnd,
}: Props) {
  const { t } = useI18n();
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [started, setStarted] = useState(false);
  const [remoteConnected, setRemoteConnected] = useState(false);
  const [remoteVolume, setRemoteVolume] = useState(1);
  const [isRemoteMuted, setIsRemoteMuted] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  const remoteVideoRef = useRef<NativeVideoParticipantHandle>(null);
  const audioOutputWarnedRef = useRef(false);

  const events = useNativeCallEvents();
  const fullscreen = useNativeCallFullscreen();
  const media = useMediaDevices();

  const remoteName = role === "NUTRITIONIST" ? patientName : t("care_session.role_nutritionist");

  const handleRemoteConnected = useCallback(() => {
    setRemoteConnected(true);
    toast.success(
      role === "NUTRITIONIST"
        ? t("care_sessions.native.status.patient_joined", { name: patientName })
        : t("care_sessions.native.status.nutritionist_joined")
    );
    events.emit("REMOTE_CONNECTED");
  }, [t, role, patientName, events]);

  const handleRemoteDisconnected = useCallback(() => {
    setRemoteConnected(false);
    toast.error(
      role === "NUTRITIONIST"
        ? t("care_sessions.native.status.patient_left", { name: patientName })
        : t("care_sessions.native.status.nutritionist_left")
    );
    events.emit("REMOTE_DISCONNECTED");
  }, [t, role, patientName, events]);

  const rtc = useNativeWebRTC({
    careSessionId,
    tenantSlug,
    role,
    patientJoinToken,
    localStream: media.stream,
    onRemoteStream: setRemoteStream,
    onRemoteConnected: handleRemoteConnected,
    onRemoteDisconnected: handleRemoteDisconnected,
  });

  const {
    rtcState,
    signalingStatus,
    remoteMediaState,
    startCall,
    endCall,
    replaceVideoTrack,
    replaceAudioTrack,
    sendMediaState,
    notifyScreenShare,
  } = rtc;

  // ── screen share ─────────────────────────────────────────────────────────

  const getCameraTrack = useCallback(
    () => media.stream?.getVideoTracks()[0] ?? null,
    [media.stream]
  );

  const screenShare = useScreenShare({
    replaceVideoTrack,
    getCameraTrack,
    onStarted: () => {
      events.emit("SCREEN_SHARE_STARTED");
      notifyScreenShare(true);
      sendMediaState({ cameraOn: media.cameraOn, micOn: media.micOn, screenSharing: true });
    },
    onStopped: () => {
      events.emit("SCREEN_SHARE_STOPPED");
      notifyScreenShare(false);
      sendMediaState({ cameraOn: media.cameraOn, micOn: media.micOn, screenSharing: false });
    },
    onError: (err) => {
      toast.error(t(`care_sessions.native.errors.${err}`));
    },
  });

  // Never rely on React state right after an await: use the RETURN VALUE of
  // startScreenShare/stopScreenShare instead of screenShare.isSharing.
  const handleToggleScreenShare = useCallback(async () => {
    if (screenShare.isSharing) {
      await screenShare.stopScreenShare();
    } else {
      await screenShare.startScreenShare();
      // onStarted/onError already handled events + signaling.
    }
  }, [screenShare]);

  // ── pip ──────────────────────────────────────────────────────────────────

  // Stable adapter: resolves the remote <video> element lazily (outside render).
  const remoteVideoElRef = useMemo(() => ({
    get current() {
      return remoteVideoRef.current?.videoElement ?? null;
    },
  }) as React.RefObject<HTMLVideoElement | null>, []);

  const pip = usePictureInPicture({
    remoteVideoRef: remoteVideoElRef,
    patientName,
    onRestore: () => {},
  });

  // ── media toggles (always broadcast media-state) ─────────────────────────

  const broadcastMediaState = useCallback(
    (overrides?: Partial<{ cameraOn: boolean; micOn: boolean; screenSharing: boolean }>) => {
      sendMediaState({
        cameraOn: overrides?.cameraOn ?? media.cameraOn,
        micOn: overrides?.micOn ?? media.micOn,
        screenSharing: overrides?.screenSharing ?? screenShare.isSharing,
      });
    },
    [sendMediaState, media.cameraOn, media.micOn, screenShare.isSharing]
  );

  const handleToggleCamera = useCallback(() => {
    const next = !media.cameraOn;
    media.toggleCamera();
    events.emit(next ? "CAMERA_ENABLED" : "CAMERA_DISABLED");
    broadcastMediaState({ cameraOn: next });
  }, [media, events, broadcastMediaState]);

  const handleToggleMic = useCallback(() => {
    const next = !media.micOn;
    media.toggleMic();
    events.emit(next ? "MIC_UNMUTED" : "MIC_MUTED");
    broadcastMediaState({ micOn: next });
  }, [media, events, broadcastMediaState]);

  // ── device switching (replaceTrack FIRST, stop old track AFTER) ──────────

  const handleSwitchVideoInput = useCallback(async (deviceId: string) => {
    const ok = await media.switchDevice("video", deviceId, replaceVideoTrack);
    if (ok) broadcastMediaState();
  }, [media, replaceVideoTrack, broadcastMediaState]);

  const handleSwitchAudioInput = useCallback(async (deviceId: string) => {
    await media.switchDevice("audio", deviceId, replaceAudioTrack);
  }, [media, replaceAudioTrack]);

  const handleSwitchAudioOutput = useCallback((deviceId: string) => {
    media.setAudioOutput(deviceId);
  }, [media]);

  const handleAudioOutputUnsupported = useCallback(() => {
    if (audioOutputWarnedRef.current) return;
    audioOutputWarnedRef.current = true;
    toast(t("care_sessions.native.errors.audio_output_not_supported"));
  }, [t]);

  // ── start / end ──────────────────────────────────────────────────────────

  const handleStart = useCallback(async () => {
    const stream = await media.start();
    if (!stream) return; // media.error is set, UI shows error state
    setStarted(true);
    await startCall(stream);
    // Announce initial media state.
    sendMediaState({ cameraOn: true, micOn: true, screenSharing: false });
  }, [media, startCall, sendMediaState]);

  // Full teardown. Even if a step fails, cleanup continues.
  const handleEnd = useCallback(async () => {
    try {
      if (screenShare.isSharing) await screenShare.stopScreenShare();
    } catch { /* continue cleanup */ }
    try {
      await endCall(); // sends hangup + presence left, closes peer + signaling
    } catch { /* continue cleanup */ }
    try {
      media.stop(); // stops camera/mic tracks
    } catch { /* continue cleanup */ }
    setRemoteStream(null);
    setRemoteConnected(false);
    events.emit("CALL_ENDED");
    onEnd?.();
  }, [screenShare, endCall, media, events, onEnd]);

  const handleCopyLink = useCallback(() => {
    if (patientLink) {
      navigator.clipboard.writeText(patientLink).then(() => {
        toast.success(t("care_sessions.native.empty.copy_link"));
      });
    }
  }, [patientLink, t]);

  useNativeCallShortcuts({
    enabled: started,
    onToggleMic: handleToggleMic,
    onToggleCamera: handleToggleCamera,
    onToggleScreenShare: handleToggleScreenShare,
    onToggleChat: () => setShowChat((v) => !v),
    onToggleNotes: () => setShowNotes((v) => !v),
    onToggleFullscreen: fullscreen.toggle,
  });

  // Event-driven toast subscriptions
  useEffect(() => {
    return events.subscribe((e) => {
      if (e === "MIC_MUTED") toast(t("care_sessions.native.status.mic_off"));
      if (e === "CAMERA_DISABLED") toast(t("care_sessions.native.status.camera_off"));
      if (e === "SCREEN_SHARE_STARTED") toast(t("care_sessions.native.status.screen_sharing"));
    });
  }, [events, t]);

  // ── Error state ──────────────────────────────────────────────────────────
  if (media.error) {
    const errorKey =
      media.error === "permission_denied" ? "camera_denied"
      : media.error === "no_camera" ? "camera_denied"
      : media.error === "no_microphone" ? "mic_denied"
      : media.error === "device_in_use" ? "device_in_use"
      : media.error === "overconstrained" ? "overconstrained"
      : "unsupported_browser";
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-white p-8">
        <AlertTriangle className="w-10 h-10 text-amber-400" />
        <p className="text-sm text-white/70 text-center">
          {t(`care_sessions.native.errors.${errorKey}`)}
        </p>
        <button
          onClick={handleStart}
          className="px-4 py-2 bg-brand-blue hover:bg-brand-blue-hover rounded-lg text-sm font-medium"
        >
          {t("care_sessions.native.errors.try_again")}
        </button>
      </div>
    );
  }

  // ── Pre-start screen ─────────────────────────────────────────────────────
  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-white p-8">
        <div className="w-16 h-16 rounded-full bg-brand-blue/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-brand-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-sm text-white/60">{t("native_room.label")}</p>
        <button
          onClick={handleStart}
          disabled={media.loading}
          className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60"
        >
          {media.loading
            ? t("native_room.waiting_permission")
            : role === "NUTRITIONIST"
            ? t("native_room.start")
            : t("native_room.enter")}
        </button>
      </div>
    );
  }

  // ── Fullscreen CSS overlay wrapper ───────────────────────────────────────
  const roomClass = fullscreen.isFullscreen
    ? "fixed inset-0 z-[9999] flex flex-col bg-gray-950"
    : "flex flex-col h-full bg-gray-950";

  // Resolve empty-state kind for remote area.
  const remoteEmpty = !remoteConnected
    ? rtcState === "connecting"
      ? "connecting"
      : rtcState === "waiting"
      ? role === "NUTRITIONIST"
        ? "waiting"
        : "connecting"
      : rtcState === "disconnected"
      ? "reconnecting"
      : "waiting"
    : null;

  const statusBarLabel = role === "NUTRITIONIST"
    ? patientName
    : t("native_room.session_label");

  return (
    <>
      <div className={roomClass}>
        {/* Status bar */}
        <NativeCallStatusBar
          rtcState={rtcState}
          label={statusBarLabel}
          isSharing={screenShare.isSharing}
          remoteVolume={remoteVolume}
          isRemoteMuted={isRemoteMuted}
          onVolumeChange={(v) => setRemoteVolume(clampVolume(v))}
          onToggleRemoteMute={() => setIsRemoteMuted((m) => !m)}
        />

        {/* Signaling degradation hint */}
        {(signalingStatus === "reconnecting" || signalingStatus === "error") && (
          <div className="bg-amber-500/15 text-amber-300 text-xs text-center py-1 shrink-0">
            {signalingStatus === "reconnecting"
              ? t("care_sessions.native.status.signaling_reconnecting")
              : t("care_sessions.native.status.signaling_error")}
          </div>
        )}

        {/* Main content: video + optional side panels */}
        <div className="flex-1 flex min-h-0">
          {/* Video area */}
          <div className="flex-1 relative min-h-0">
            {remoteEmpty ? (
              <NativeCallEmptyState
                kind={remoteEmpty}
                name={remoteName}
                onCopyLink={role === "NUTRITIONIST" ? handleCopyLink : undefined}
              />
            ) : (
              <NativeVideoParticipant
                ref={remoteVideoRef}
                stream={remoteStream}
                label={remoteName}
                remoteCameraOn={remoteMediaState.cameraOn || remoteMediaState.screenSharing}
                remoteMicOn={remoteMediaState.micOn}
                remoteVolume={remoteVolume}
                isRemoteMuted={isRemoteMuted}
                audioOutputId={media.selectedAudioOutput || undefined}
                onAudioOutputUnsupported={handleAudioOutputUnsupported}
              />
            )}

            {/* Remote screen-share badge */}
            {remoteMediaState.screenSharing && !remoteEmpty && (
              <div className="absolute top-3 left-3 px-2 py-1 bg-brand-blue/80 rounded text-white text-xs">
                {t("care_sessions.native.screen_share.patient_sharing", { name: remoteName })}
              </div>
            )}

            {/* Local pip-in-corner */}
            {media.stream && !pip.isInPip && (
              <div className="absolute bottom-4 right-4 w-32 h-24 rounded-lg overflow-hidden shadow-xl border border-white/10">
                <NativeVideoParticipant
                  stream={media.stream}
                  isLocal
                  cameraOn={media.cameraOn}
                  micOn={media.micOn}
                />
              </div>
            )}
          </div>

          {/* Participants side panel */}
          {showParticipants && (
            <div className="w-52 bg-gray-900/90 border-l border-white/10 shrink-0 overflow-y-auto">
              <NativeParticipantsStatus
                participants={[
                  {
                    name: role === "NUTRITIONIST" ? t("care_sessions.native.participants.you") : t("care_session.role_nutritionist"),
                    isLocal: true,
                    cameraOn: media.cameraOn,
                    micOn: media.micOn,
                  },
                  {
                    name: role === "NUTRITIONIST" ? patientName : t("care_sessions.native.participants.you"),
                    rtcState,
                    isLocal: role === "PATIENT",
                    cameraOn: remoteMediaState.cameraOn,
                    micOn: remoteMediaState.micOn,
                  },
                ]}
              />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="bg-gray-900/80 backdrop-blur-sm px-4 shrink-0">
          <div className="flex items-center justify-center gap-2">
            <NativeVideoControls
              cameraOn={media.cameraOn}
              micOn={media.micOn}
              onToggleCamera={handleToggleCamera}
              onToggleMic={handleToggleMic}
              onEnd={handleEnd}
              role={role}

              isSharing={screenShare.isSharing}
              supportsScreenShare={screenShare.supportsScreenShare}
              onToggleScreenShare={handleToggleScreenShare}

              isInPip={pip.isInPip}
              onTogglePip={pip.isInPip ? pip.exitPip : pip.enterPip}

              isFullscreen={fullscreen.isFullscreen}
              onToggleFullscreen={fullscreen.toggle}

              showParticipants={showParticipants}
              onToggleParticipants={() => setShowParticipants((v) => !v)}

              showChat={showChat}
              onToggleChat={() => setShowChat((v) => !v)}

              showNotes={showNotes}
              onToggleNotes={() => setShowNotes((v) => !v)}
            />

            {/* Device selection (camera / mic / speaker) */}
            <NativeDeviceSelector
              audioInputs={media.audioInputs}
              videoInputs={media.videoInputs}
              audioOutputs={media.audioOutputs}
              selectedAudioInput={media.selectedAudioInput}
              selectedVideoInput={media.selectedVideoInput}
              selectedAudioOutput={media.selectedAudioOutput}
              onSwitchAudioInput={handleSwitchAudioInput}
              onSwitchVideoInput={handleSwitchVideoInput}
              onSwitchAudioOutput={handleSwitchAudioOutput}
            />
          </div>
        </div>
      </div>

      {/* Internal PiP floating window */}
      {pip.isInPip && pip.pipMode === "internal" && (
        <CallFloatingMiniWindow onRestore={pip.exitPip}>
          <NativeVideoParticipant
            stream={remoteStream}
            label={remoteName}
            remoteCameraOn={remoteMediaState.cameraOn || remoteMediaState.screenSharing}
            remoteMicOn={remoteMediaState.micOn}
            remoteVolume={remoteVolume}
            isRemoteMuted={isRemoteMuted}
          />
        </CallFloatingMiniWindow>
      )}
    </>
  );
}
