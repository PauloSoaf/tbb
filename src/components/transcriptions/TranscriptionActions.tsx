"use client";

import { useState, useTransition } from "react";
import { CheckCircle, XCircle, Eye, EyeOff, Trash2, Play, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TranscriptionStatus, TranscriptionVisibility } from "@prisma/client";
import {
  approveTranscriptionAction,
  rejectTranscriptionAction,
  setTranscriptionVisibilityAction,
  deleteTranscriptionAction,
  startTranscriptionProcessingAction,
} from "@/actions/transcription.action";

interface Props {
  transcriptionId: string;
  tenantSlug: string;
  status: TranscriptionStatus;
  visibility: TranscriptionVisibility;
  editedTranscript: string | null;
  rawTranscript: string | null;
  hasAudio: boolean;
  onChanged?: () => void;
  onDeleted?: () => void;
}

export function TranscriptionActions({
  transcriptionId,
  tenantSlug,
  status,
  visibility,
  editedTranscript,
  rawTranscript,
  hasAudio,
  onChanged,
  onDeleted,
}: Props) {
  const { t } = useI18n();
  const { confirm: requestConfirmation, confirmDialog } = useConfirmDialog();
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<"process" | "approve" | "reject" | "visibility" | "delete" | null>(null);

  const canProcess = hasAudio && ["UPLOADED", "FAILED"].includes(status);
  const canApprove = ["COMPLETED", "REVIEWED", "NEEDS_REVIEW"].includes(status);
  const canReject = ["COMPLETED", "REVIEWED", "NEEDS_REVIEW", "APPROVED"].includes(status);
  const isPatientVisible = visibility === "PATIENT_VISIBLE";
  const textToCopy = editedTranscript ?? rawTranscript;

  function wrap(action: NonNullable<typeof pendingAction>, fn: () => Promise<void>) {
    setPendingAction(action);
    startTransition(async () => {
      try {
        await fn();
      } catch {
        toast.error("Ocorreu um erro. Tente novamente.");
      } finally {
        setPendingAction(null);
      }
    });
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
      {canProcess && (
        <ActionButton
          icon={pendingAction === "process" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          label={t("transcriptions.actions.start_processing")}
          disabled={isPending}
          onClick={() => wrap("process", async () => {
            const res = await startTranscriptionProcessingAction(tenantSlug, transcriptionId);
            if (res.success) { toast.success(t("transcriptions.toasts.processing_started")); onChanged?.(); }
            else toast.error(res.error);
          })}
          variant="primary"
        />
      )}

      {canApprove && (
        <ActionButton
          icon={pendingAction === "approve" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
          label={t("transcriptions.actions.approve")}
          disabled={isPending}
          onClick={() => wrap("approve", async () => {
            const res = await approveTranscriptionAction(tenantSlug, transcriptionId);
            if (res.success) { toast.success(t("transcriptions.toasts.approved")); onChanged?.(); }
            else toast.error(res.error);
          })}
          variant="success"
        />
      )}

      {canReject && (
        <ActionButton
          icon={pendingAction === "reject" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
          label={t("transcriptions.actions.reject")}
          disabled={isPending}
          onClick={() => wrap("reject", async () => {
            const res = await rejectTranscriptionAction(tenantSlug, transcriptionId);
            if (res.success) { toast.success(t("transcriptions.toasts.rejected")); onChanged?.(); }
            else toast.error(res.error);
          })}
          variant="danger"
        />
      )}

      <ActionButton
        icon={pendingAction === "visibility" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isPatientVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        label={isPatientVisible ? t("transcriptions.actions.keep_private") : t("transcriptions.actions.make_patient_visible")}
        disabled={isPending}
        onClick={() => wrap("visibility", async () => {
          const next = isPatientVisible ? "NUTRITIONIST_ONLY" : "PATIENT_VISIBLE";
          const res = await setTranscriptionVisibilityAction(tenantSlug, transcriptionId, next as TranscriptionVisibility);
          if (res.success) { onChanged?.(); }
          else toast.error(res.error);
        })}
        variant="ghost"
      />

      {textToCopy && (
        <ActionButton
          icon={<Copy className="h-3.5 w-3.5" />}
          label={t("transcriptions.actions.copy_text")}
          disabled={false}
          onClick={async () => {
            await navigator.clipboard.writeText(textToCopy);
            toast.success("Copiado para a área de transferência.");
          }}
          variant="ghost"
        />
      )}

      <ActionButton
        icon={pendingAction === "delete" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        label={t("transcriptions.actions.delete")}
        disabled={isPending}
        onClick={async () => {
          const confirmed = await requestConfirmation({
            title: t("confirmations.delete_transcription.title"),
            description: t("confirmations.delete_transcription.description"),
            confirmLabel: t("confirmations.delete_transcription.confirm"),
            tone: "danger",
          });
          if (!confirmed) return;
          wrap("delete", async () => {
            const res = await deleteTranscriptionAction(tenantSlug, transcriptionId);
            if (res.success) { toast.success(t("transcriptions.toasts.deleted")); onDeleted?.(); }
            else toast.error(res.error);
          });
        }}
        variant="danger-ghost"
      />

      </div>
      {confirmDialog}
    </>
  );
}

type ButtonVariant = "primary" | "success" | "danger" | "ghost" | "danger-ghost";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  success: "bg-green-600 text-white hover:bg-green-700",
  danger: "bg-red-600 text-white hover:bg-red-700",
  ghost: "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
  "danger-ghost": "bg-transparent text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20",
};

function ActionButton({ icon, label, disabled, onClick, variant }: {
  icon: React.ReactNode;
  label: string;
  disabled: boolean;
  onClick: () => void;
  variant: ButtonVariant;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]}`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
