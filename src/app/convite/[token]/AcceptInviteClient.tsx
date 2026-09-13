"use client";

import { useTransition } from "react";
import { acceptInviteAction } from "@/actions/team.action";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { UserCheck } from "lucide-react";

interface Props {
  token: string;
}

export function AcceptInviteClient({ token }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleAction = (formData: FormData) => {
    const name = formData.get("name") as string;
    if (!name?.trim()) { toast.error("Informe seu nome."); return; }
    startTransition(async () => {
      const res = await acceptInviteAction(token, name.trim());
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Convite aceito com sucesso! Entre em contato com o nutricionista para acessar.");
        router.push("/");
      }
    });
  };

  return (
    <form action={handleAction} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">Seu Nome Completo</label>
        <input
          type="text"
          name="name"
          required
          className="w-full bg-surface-warm border border-border-neutral rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
          placeholder="Ex: Ana Silva"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-brand-blue text-white px-6 py-3 rounded-xl font-semibold hover:bg-brand-blue-hover transition-colors flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
      >
        {isPending ? "Registrando..." : "Aceitar Convite"}
        {!isPending && <UserCheck className="w-5 h-5" />}
      </button>
    </form>
  );
}
