"use client";
import { Loader2, VideoOff, PhoneOff, Clock } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";

export type EmptyStateKind = "waiting" | "camera_off" | "connecting" | "reconnecting" | "ended";

interface Props {
  kind: EmptyStateKind;
  name?: string;
  onCopyLink?: () => void;
  onWhatsApp?: () => void;
}

export function NativeCallEmptyState({ kind, name = "", onCopyLink, onWhatsApp }: Props) {
  const { t } = useI18n();

  const configs: Record<EmptyStateKind, { icon: React.ReactNode; title: string; subtitle?: string; showActions?: boolean }> = {
    waiting: {
      icon: <Clock className="w-10 h-10 text-white/40" />,
      title: t("care_sessions.native.empty.waiting_patient_title", { name }),
      subtitle: t("care_sessions.native.empty.waiting_patient_subtitle"),
      showActions: true,
    },
    camera_off: {
      icon: <VideoOff className="w-10 h-10 text-white/40" />,
      title: t("care_sessions.native.empty.camera_off_title", { name }),
    },
    connecting: {
      icon: <Loader2 className="w-10 h-10 text-white/40 animate-spin" />,
      title: t("care_sessions.native.empty.connecting_title"),
    },
    reconnecting: {
      icon: <Loader2 className="w-10 h-10 text-amber-400 animate-spin" />,
      title: t("care_sessions.native.empty.reconnecting_title"),
    },
    ended: {
      icon: <PhoneOff className="w-10 h-10 text-red-400" />,
      title: t("care_sessions.native.empty.ended_title"),
      subtitle: t("care_sessions.native.empty.ended_subtitle"),
    },
  };

  const { icon, title, subtitle, showActions } = configs[kind];

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
      {icon}
      <div>
        <p className="text-white/80 font-medium text-sm">{title}</p>
        {subtitle && <p className="text-white/40 text-xs mt-1 max-w-xs">{subtitle}</p>}
      </div>
      {showActions && (onCopyLink || onWhatsApp) && (
        <div className="flex gap-2 mt-2">
          {onCopyLink && (
            <button
              onClick={onCopyLink}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg transition-colors"
            >
              {t("care_sessions.native.empty.copy_link")}
            </button>
          )}
          {onWhatsApp && (
            <button
              onClick={onWhatsApp}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg transition-colors"
            >
              {t("care_sessions.native.empty.open_whatsapp")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
