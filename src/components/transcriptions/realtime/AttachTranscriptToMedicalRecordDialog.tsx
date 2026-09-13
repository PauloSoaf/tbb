"use client";

import { FileText, Link2, Loader2, ShieldCheck, X } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/lib/i18n/I18nContext";
import { cn } from "@/lib/utils";

export interface AttachTranscriptToMedicalRecordDialogProps {
  open: boolean;
  initialText: string;
  onOpenChange: (open: boolean) => void;
  onAttach: (reviewedText: string) => void | Promise<void>;
  isSubmitting?: boolean;
  maxLength?: number;
  className?: string;
}

const subscribeToClient = () => () => {};

export function AttachTranscriptToMedicalRecordDialog({
  open,
  ...props
}: AttachTranscriptToMedicalRecordDialogProps) {
  const isClient = useSyncExternalStore(
    subscribeToClient,
    () => true,
    () => false,
  );

  if (!isClient || !open) return null;

  return createPortal(
    <AttachTranscriptToMedicalRecordDialogContent {...props} />,
    document.body,
  );
}

function AttachTranscriptToMedicalRecordDialogContent({
  initialText,
  onOpenChange,
  onAttach,
  isSubmitting = false,
  maxLength = 50_000,
  className,
}: Omit<AttachTranscriptToMedicalRecordDialogProps, "open">) {
  const { t } = useI18n();
  const titleId = useId();
  const descriptionId = useId();
  const textareaId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const [draft, setDraft] = useState(initialText);

  useEffect(() => {
    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => textareaRef.current?.focus(), 0);

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreFocusRef.current?.focus();
    };
  }, [isSubmitting, onOpenChange]);

  const handleFocusTrap = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab" || !dialogRef.current) return;

    const focusable = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ),
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const reviewedText = draft.trim();
    if (!reviewedText || isSubmitting) return;
    await onAttach(reviewedText);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onOpenChange(false);
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onKeyDown={handleFocusTrap}
        className={cn(
          "flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-lg border border-border-neutral bg-card-bg shadow-2xl sm:rounded-lg",
          className,
        )}
      >
        <header className="flex items-start gap-3 border-b border-border-neutral p-4 sm:p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-subtle text-brand-blue">
            <Link2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-base font-semibold text-text-primary">
              {t("transcription.attachDialog.title")}
            </h2>
            <p id={descriptionId} className="mt-1 text-sm text-text-secondary">
              {t("transcription.attachDialog.description")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-primary-subtle hover:text-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={t("common.close")}
            title={t("common.close")}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
            <label
              htmlFor={textareaId}
              className="flex items-center gap-2 text-sm font-semibold text-text-primary"
            >
              <FileText className="h-4 w-4 text-brand-blue" aria-hidden="true" />
              {t("transcription.attachDialog.reviewLabel")}
            </label>
            <p className="mt-1 text-xs text-text-secondary">
              {t("transcription.attachDialog.reviewHint")}
            </p>
            <textarea
              ref={textareaRef}
              id={textareaId}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={maxLength}
              disabled={isSubmitting}
              rows={16}
              className="mt-3 min-h-64 w-full resize-y rounded-lg border border-border-neutral bg-background p-3 text-sm leading-relaxed text-text-primary outline-none transition-colors placeholder:text-text-secondary focus:border-brand-blue focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            />
            <div className="mt-2 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2 text-xs leading-relaxed text-text-secondary">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{t("transcription.notice.noClinicalDataInLogs")}</span>
              </div>
              <span className="shrink-0 text-xs tabular-nums text-text-secondary">
                {draft.length}/{maxLength}
              </span>
            </div>
          </div>

          <footer className="flex flex-col-reverse gap-2 border-t border-border-neutral p-4 sm:flex-row sm:justify-end sm:p-5">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border-neutral bg-card-bg px-4 text-sm font-semibold text-text-primary transition-colors hover:border-brand-blue/40 hover:text-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={!draft.trim() || isSubmitting}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Link2 className="h-4 w-4" aria-hidden="true" />
              )}
              {t(
                isSubmitting
                  ? "transcription.attachDialog.attaching"
                  : "transcription.attachDialog.confirm",
              )}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
