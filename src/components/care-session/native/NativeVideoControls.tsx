"use client";
import {
  Mic, MicOff, Video, VideoOff, LogOut,
  Monitor, MonitorOff, PictureInPicture2, Maximize2, Minimize2,
  MessageSquare, FileText, Users, Loader2,
} from "lucide-react";
import { useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nContext";

interface Props {
  cameraOn: boolean;
  micOn: boolean;
  onToggleCamera: () => void;
  onToggleMic: () => void;
  onEnd: () => void;
  role: "NUTRITIONIST" | "PATIENT";
  disabled?: boolean;

  // Advanced
  isSharing?: boolean;
  supportsScreenShare?: boolean;
  onToggleScreenShare?: () => void | Promise<void>;

  isInPip?: boolean;
  onTogglePip?: () => void | Promise<void>;

  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;

  showChat?: boolean;
  onToggleChat?: () => void;

  showNotes?: boolean;
  onToggleNotes?: () => void;

  showParticipants?: boolean;
  onToggleParticipants?: () => void;
}

function ControlBtn({
  onClick,
  title,
  active = false,
  danger = false,
  disabled = false,
  busy = false,
  children,
}: {
  onClick?: () => void;
  title: string;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  busy?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      aria-label={title}
      title={title}
      className={[
        "w-11 h-11 rounded-full flex items-center justify-center transition-colors disabled:opacity-40",
        danger
          ? "bg-red-600 hover:bg-red-700 text-white"
          : active
          ? "bg-white/20 hover:bg-white/30 text-white"
          : "bg-white/10 hover:bg-white/20 text-white",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export function NativeVideoControls({
  cameraOn, micOn, onToggleCamera, onToggleMic, onEnd, disabled,
  isSharing, supportsScreenShare, onToggleScreenShare,
  isInPip, onTogglePip,
  isFullscreen, onToggleFullscreen,
  showChat, onToggleChat,
  showNotes, onToggleNotes,
  showParticipants, onToggleParticipants,
}: Props) {
  const { t } = useI18n();
  const [screenSharePending, setScreenSharePending] = useState(false);
  const [pipPending, setPipPending] = useState(false);
  const screenSharePendingRef = useRef(false);
  const pipPendingRef = useRef(false);

  const handleToggleScreenShare = async () => {
    if (!onToggleScreenShare || screenSharePendingRef.current) return;

    screenSharePendingRef.current = true;
    setScreenSharePending(true);
    try {
      await onToggleScreenShare();
    } finally {
      screenSharePendingRef.current = false;
      setScreenSharePending(false);
    }
  };

  const handleTogglePip = async () => {
    if (!onTogglePip || pipPendingRef.current) return;

    pipPendingRef.current = true;
    setPipPending(true);
    try {
      await onTogglePip();
    } finally {
      pipPendingRef.current = false;
      setPipPending(false);
    }
  };

  return (
    <div className="flex items-center justify-center gap-2 py-3 flex-wrap">
      {/* Mic */}
      <ControlBtn
        onClick={onToggleMic}
        disabled={disabled}
        title={micOn ? t("care_sessions.native.controls.mic_off") : t("care_sessions.native.controls.mic_on")}
        active={micOn}
        danger={!micOn}
      >
        {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
      </ControlBtn>

      {/* Camera */}
      <ControlBtn
        onClick={onToggleCamera}
        disabled={disabled}
        title={cameraOn ? t("care_sessions.native.controls.camera_off") : t("care_sessions.native.controls.camera_on")}
        active={cameraOn}
        danger={!cameraOn}
      >
        {cameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
      </ControlBtn>

      {/* Screen share */}
      {supportsScreenShare && onToggleScreenShare && (
        <ControlBtn
          onClick={() => void handleToggleScreenShare()}
          disabled={disabled}
          busy={screenSharePending}
          title={isSharing ? t("care_sessions.native.controls.stop_share_screen") : t("care_sessions.native.controls.share_screen")}
          active={isSharing}
        >
          {screenSharePending ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : isSharing ? (
            <MonitorOff className="w-5 h-5" />
          ) : (
            <Monitor className="w-5 h-5" />
          )}
        </ControlBtn>
      )}

      {/* PiP */}
      {onTogglePip && (
        <ControlBtn
          onClick={() => void handleTogglePip()}
          disabled={disabled}
          busy={pipPending}
          title={isInPip ? t("care_sessions.native.controls.exit_pip") : t("care_sessions.native.controls.picture_in_picture")}
          active={isInPip}
        >
          {pipPending ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            <PictureInPicture2 className="w-5 h-5" />
          )}
        </ControlBtn>
      )}

      {/* Chat */}
      {onToggleChat && (
        <ControlBtn
          onClick={onToggleChat}
          title={t("care_sessions.native.controls.chat")}
          active={showChat}
        >
          <MessageSquare className="w-5 h-5" />
        </ControlBtn>
      )}

      {/* Notes */}
      {onToggleNotes && (
        <ControlBtn
          onClick={onToggleNotes}
          title={t("care_sessions.native.controls.notes")}
          active={showNotes}
        >
          <FileText className="w-5 h-5" />
        </ControlBtn>
      )}

      {/* Participants */}
      {onToggleParticipants && (
        <ControlBtn
          onClick={onToggleParticipants}
          title={t("care_sessions.native.participants.title")}
          active={showParticipants}
        >
          <Users className="w-5 h-5" />
        </ControlBtn>
      )}

      {/* Fullscreen */}
      {onToggleFullscreen && (
        <ControlBtn
          onClick={onToggleFullscreen}
          title={isFullscreen ? t("care_sessions.native.controls.exit_fullscreen") : t("care_sessions.native.controls.fullscreen")}
          active={isFullscreen}
        >
          {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </ControlBtn>
      )}

      {/* Leave call — just exits video, does NOT end the session */}
      <ControlBtn
        onClick={onEnd}
        title={t("care_sessions.native.controls.end_call")}
        active
      >
        <LogOut className="w-5 h-5" />
      </ControlBtn>
    </div>
  );
}
