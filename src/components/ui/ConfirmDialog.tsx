"use client";

import {
  AlertTriangle,
  Info,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/lib/i18n/I18nContext";

export type ConfirmDialogTone = "danger" | "warning" | "info";

export interface ConfirmDialogOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmDialogTone;
}

interface ToneConfig {
  Icon: LucideIcon;
  iconClassName: string;
  confirmClassName: string;
}

const toneConfig: Record<ConfirmDialogTone, ToneConfig> = {
  danger: {
    Icon: Trash2,
    iconClassName: "border-danger/20 bg-danger/10 text-danger",
    confirmClassName:
      "bg-danger text-white shadow-sm hover:bg-danger/90 focus:ring-danger/30",
  },
  warning: {
    Icon: AlertTriangle,
    iconClassName: "border-amber-200 bg-attention text-attention-text",
    confirmClassName:
      "border border-amber-200 bg-attention text-attention-text shadow-sm hover:brightness-95 focus:ring-amber-300/40",
  },
  info: {
    Icon: Info,
    iconClassName: "border-brand-blue/20 bg-brand-blue-soft text-brand-blue",
    confirmClassName:
      "bg-brand-blue text-white shadow-sm hover:bg-brand-blue-hover focus:ring-brand-blue/30",
  },
};

export function useConfirmDialog(): {
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
  confirmDialog: ReactNode;
} {
  const { t } = useI18n();
  const titleId = useId();
  const descriptionId = useId();
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);
  const [options, setOptions] = useState<ConfirmDialogOptions | null>(null);

  const close = useCallback((confirmed: boolean) => {
    resolverRef.current?.(confirmed);
    resolverRef.current = null;
    setOptions(null);
  }, []);

  const confirm = useCallback((nextOptions: ConfirmDialogOptions) => {
    resolverRef.current?.(false);

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setOptions(nextOptions);
    });
  }, []);

  useEffect(() => {
    return () => {
      resolverRef.current?.(false);
      resolverRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!options) return;

    const focusTimer = window.setTimeout(() => {
      cancelButtonRef.current?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [close, options]);

  if (!options || typeof document === "undefined") {
    return { confirm, confirmDialog: null };
  }

  const tone = options.tone ?? "danger";
  const config = toneConfig[tone];
  const Icon = config.Icon;
  const cancelLabel = options.cancelLabel ?? t("common.cancel");
  const confirmLabel = options.confirmLabel ?? t("common.confirm");

  const confirmDialog = createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label={t("confirm_dialog.close_overlay")}
        className="absolute inset-0 cursor-default bg-slate-950/45 backdrop-blur-[2px]"
        onClick={() => close(false)}
      />

      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={options.description ? descriptionId : undefined}
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border-neutral bg-card-bg text-text-primary shadow-[0_24px_80px_rgba(15,23,42,0.24)] outline-none animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-start gap-4 p-5">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${config.iconClassName}`}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>

          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-base font-bold leading-6">
              {options.title}
            </h2>
            {options.description && (
              <p
                id={descriptionId}
                className="mt-1.5 text-sm leading-6 text-text-secondary"
              >
                {options.description}
              </p>
            )}
          </div>

          <button
            type="button"
            aria-label={t("common.close")}
            onClick={() => close(false)}
            className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-warm-surface hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue/25"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border-neutral bg-warm-surface/45 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            ref={cancelButtonRef}
            onClick={() => close(false)}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border-neutral bg-card-bg px-4 py-2 text-sm font-semibold text-text-primary transition-all hover:border-brand-blue/30 hover:text-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/25"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => close(true)}
            className={`inline-flex min-h-10 items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-all focus:outline-none focus:ring-2 ${config.confirmClassName}`}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>,
    document.body
  );

  return { confirm, confirmDialog };
}
