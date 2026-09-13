"use client";
import { Wifi, WifiOff, Loader2, Clock } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import type { RTCState } from "./useNativeWebRTC";

interface Props {
  state: RTCState;
}

export function NativeConnectionStatus({ state }: Props) {
  const { t } = useI18n();

  const config: Record<RTCState, { label: string; color: string; icon: React.ReactNode }> = {
    idle: {
      label: t("care_sessions.native.status.waiting_nutritionist"),
      color: "text-white/40",
      icon: <Clock className="w-3.5 h-3.5" />,
    },
    connecting: {
      label: t("care_sessions.native.status.connecting"),
      color: "text-amber-400",
      icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
    },
    waiting: {
      label: t("care_sessions.native.status.connecting"),
      color: "text-amber-400",
      icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
    },
    connected: {
      label: t("care_sessions.native.status.connected"),
      color: "text-green-400",
      icon: <Wifi className="w-3.5 h-3.5" />,
    },
    disconnected: {
      label: t("care_sessions.native.status.reconnecting"),
      color: "text-red-400",
      icon: <WifiOff className="w-3.5 h-3.5" />,
    },
    error: {
      label: t("care_sessions.native.status.reconnecting"),
      color: "text-red-400",
      icon: <WifiOff className="w-3.5 h-3.5" />,
    },
  };

  const { label, color, icon } = config[state];

  return (
    <div className={`flex items-center gap-1.5 text-xs font-medium ${color}`}>
      {icon}
      {label}
    </div>
  );
}
