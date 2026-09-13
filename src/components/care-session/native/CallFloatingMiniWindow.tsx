"use client";
import { X, Maximize2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";

interface Props {
  children: React.ReactNode;
  onRestore: () => void;
  onClose?: () => void;
}

export function CallFloatingMiniWindow({ children, onRestore, onClose }: Props) {
  const { t } = useI18n();

  return (
    <div
      className="fixed bottom-6 right-6 z-[9998] w-64 rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-gray-900"
      style={{ aspectRatio: "16/9" }}
    >
      <div className="relative w-full h-full">
        {children}

        {/* Controls overlay */}
        <div className="absolute inset-0 flex items-start justify-end gap-1 p-1.5 opacity-0 hover:opacity-100 transition-opacity bg-black/30">
          <button
            onClick={onRestore}
            title={t("care_sessions.native.pip.restore")}
            className="w-7 h-7 rounded-lg bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
