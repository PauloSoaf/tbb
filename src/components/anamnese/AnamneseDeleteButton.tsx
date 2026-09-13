"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteInternalAnamneseAction } from "@/actions/submitInternalAnamnese.action";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useI18n } from "@/lib/i18n/I18nContext";

interface AnamneseDeleteButtonProps {
  tenant: string;
  responseId: string;
  redirectHref?: string;
  compact?: boolean;
}

export function AnamneseDeleteButton({
  tenant,
  responseId,
  redirectHref,
  compact = false,
}: AnamneseDeleteButtonProps) {
  const router = useRouter();
  const { t } = useI18n();
  const { confirm: requestConfirmation, confirmDialog } = useConfirmDialog();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    const confirmed = await requestConfirmation({
      title: t("confirmations.delete_anamnese.title", { defaultValue: "Excluir anamnese?" }),
      description: t("confirmations.delete_anamnese.description", {
        defaultValue: "Esta anamnese sera removida permanentemente. Esta acao nao pode ser desfeita.",
      }),
      confirmLabel: t("confirmations.delete_anamnese.confirm", { defaultValue: "Excluir" }),
      tone: "danger",
    });
    if (!confirmed) return;

    setDeleting(true);
    const result = await deleteInternalAnamneseAction(tenant, responseId);
    setDeleting(false);

    if (!result.success) {
      toast.error(result.error ?? t("anamnese.delete_error", { defaultValue: "Erro ao excluir anamnese." }));
      return;
    }

    toast.success(t("anamnese.deleted_success", { defaultValue: "Anamnese excluida." }));
    if (redirectHref) {
      router.push(redirectHref);
    } else {
      router.refresh();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className={
          compact
            ? "inline-flex items-center justify-center rounded-lg border border-border-neutral p-2 text-text-secondary transition-colors hover:border-danger/30 hover:bg-danger/10 hover:text-danger disabled:opacity-60"
            : "inline-flex items-center gap-1.5 rounded-full border border-border-neutral bg-card-bg px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-danger/30 hover:bg-danger/10 hover:text-danger disabled:opacity-60"
        }
      >
        {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        {!compact && t("anamnese.delete", { defaultValue: "Excluir" })}
      </button>
      {confirmDialog}
    </>
  );
}
