import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  CloudOff,
  Loader2,
  Pause,
  Radio,
  RotateCw,
  Save,
  Square,
  Wifi,
  WifiOff,
} from "lucide-react";
import type {
  RealtimeTranscriptionStatus,
  TranscriptionParticipantState,
  TranscriptionProviderHealth,
} from "./types";

export interface StatusVisual {
  Icon: LucideIcon;
  className: string;
  iconClassName?: string;
}

export const sessionStatusVisuals: Record<RealtimeTranscriptionStatus, StatusVisual> = {
  idle: {
    Icon: Circle,
    className: "border-border-neutral bg-warm-surface text-text-secondary",
  },
  auto_starting: {
    Icon: Loader2,
    className: "border-brand-blue/20 bg-brand-blue-soft text-brand-blue",
    iconClassName: "animate-spin",
  },
  connecting: {
    Icon: Loader2,
    className: "border-brand-blue/20 bg-brand-blue-soft text-brand-blue",
    iconClassName: "animate-spin",
  },
  active: {
    Icon: Radio,
    className: "border-success/25 bg-success/10 text-success",
    iconClassName: "animate-pulse",
  },
  paused: {
    Icon: Pause,
    className: "border-border-neutral bg-warm-surface text-text-secondary",
  },
  reconnecting: {
    Icon: RotateCw,
    className: "border-amber-300/40 bg-attention text-attention-text",
    iconClassName: "animate-spin",
  },
  stopping: {
    Icon: Loader2,
    className: "border-border-neutral bg-warm-surface text-text-secondary",
    iconClassName: "animate-spin",
  },
  stopped: {
    Icon: Square,
    className: "border-border-neutral bg-warm-surface text-text-secondary",
  },
  saved: {
    Icon: Save,
    className: "border-success/25 bg-success/10 text-success",
  },
  discarded: {
    Icon: CloudOff,
    className: "border-border-neutral bg-warm-surface text-text-secondary",
  },
  offline: {
    Icon: WifiOff,
    className: "border-danger/25 bg-danger/10 text-danger",
  },
  error: {
    Icon: AlertCircle,
    className: "border-danger/25 bg-danger/10 text-danger",
  },
};

export const providerStatusVisuals: Record<TranscriptionProviderHealth, StatusVisual> = {
  online: {
    Icon: Wifi,
    className: "border-success/25 bg-success/10 text-success",
  },
  offline: {
    Icon: WifiOff,
    className: "border-danger/25 bg-danger/10 text-danger",
  },
  checking: {
    Icon: Loader2,
    className: "border-brand-blue/20 bg-brand-blue-soft text-brand-blue",
    iconClassName: "animate-spin",
  },
  degraded: {
    Icon: AlertCircle,
    className: "border-amber-300/40 bg-attention text-attention-text",
  },
  reconnecting: {
    Icon: RotateCw,
    className: "border-amber-300/40 bg-attention text-attention-text",
    iconClassName: "animate-spin",
  },
};

export const participantStatusVisuals: Record<TranscriptionParticipantState, StatusVisual> = {
  transcribing: {
    Icon: Radio,
    className: "border-success/25 bg-success/10 text-success",
    iconClassName: "animate-pulse",
  },
  ready: {
    Icon: CheckCircle2,
    className: "border-success/25 bg-success/10 text-success",
  },
  muted: {
    Icon: Pause,
    className: "border-border-neutral bg-warm-surface text-text-secondary",
  },
  paused: {
    Icon: Pause,
    className: "border-border-neutral bg-warm-surface text-text-secondary",
  },
  permission_denied: {
    Icon: WifiOff,
    className: "border-danger/25 bg-danger/10 text-danger",
  },
  not_connected: {
    Icon: Circle,
    className: "border-border-neutral bg-warm-surface text-text-secondary",
  },
  unsupported: {
    Icon: AlertCircle,
    className: "border-amber-300/40 bg-attention text-attention-text",
  },
  error: {
    Icon: AlertCircle,
    className: "border-danger/25 bg-danger/10 text-danger",
  },
};

export function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
  }

  return [minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

export function normalizeAudioLevel(audioLevel?: number): number {
  if (audioLevel === undefined || Number.isNaN(audioLevel)) return 0;
  return Math.min(1, Math.max(0, audioLevel));
}

