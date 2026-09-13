"use client";

import { resendActivationLinkAction } from "@/actions/patient-portal.action";
import { useTransition, useState } from "react";
import { MailCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  tenantSlug: string;
  patientId: string;
  patientEmail: string;
}

export function ResendPortalLinkButton({ tenantSlug, patientId, patientEmail }: Props) {
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);

  const handleClick = () => {
    startTransition(async () => {
      const res = await resendActivationLinkAction(tenantSlug, patientId);
      if (res.success) {
        toast.success(`Link de acesso enviado para ${patientEmail}`);
        setSent(true);
      } else {
        toast.error(res.error ?? "Erro ao enviar link.");
      }
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={isPending || sent}
      className="flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-brand-blue transition-colors w-full p-2 rounded-xl hover:bg-brand-blue/5 disabled:opacity-50"
    >
      {isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <MailCheck className="w-4 h-4" />
      )}
      {sent ? "Link enviado!" : "Reenviar link do portal"}
    </button>
  );
}
