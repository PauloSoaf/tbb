"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { inviteTeamMemberAction } from "@/actions/team.action";
import { Send } from "lucide-react";

interface Props {
  tenantSlug: string;
}

export function InviteAssistantForm({ tenantSlug }: Props) {
  const [email, setEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    startTransition(async () => {
      const res = await inviteTeamMemberAction(tenantSlug, email, "VIEWER");
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Convite gerado! Compartilhe o link com a assistente.");
        setEmail("");
        setInviteUrl(res.inviteUrl ?? null);
      }
    });
  };

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-mail da assistente (ex: ana@clinica.com)"
          required
          className="flex-1 bg-surface-warm border border-border-neutral rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
        />
        <button
          type="submit"
          disabled={isPending || !email.trim()}
          className="bg-brand-blue text-white px-6 py-3 rounded-xl font-semibold hover:bg-brand-blue-hover transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isPending ? "Gerando..." : "Gerar Convite"}
          {!isPending && <Send className="w-4 h-4" />}
        </button>
      </form>
      {inviteUrl && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
          <p className="text-xs font-medium text-amber-900 mb-1">Link de convite:</p>
          <code className="text-xs text-amber-700 break-all select-all">{inviteUrl}</code>
        </div>
      )}
    </div>
  );
}
