"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { activatePatientAccountAction } from "@/actions/patient-portal.action";

interface Props {
  token: string;
  tenantSlug: string;
}

export function ActivationForm({ token, tenantSlug }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("A senha deve ter ao menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    const result = await activatePatientAccountAction(token, password);
    setLoading(false);
    if (result.success) {
      toast.success("Conta ativada! Faça seu login.");
      router.push(`/portal/${tenantSlug}/login`);
    } else {
      toast.error(result.error || "Erro ao ativar conta.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">Nova senha</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full border border-border-neutral rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          placeholder="Mínimo 6 caracteres"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">Confirmar senha</label>
        <input
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          required
          className="w-full border border-border-neutral rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          placeholder="Repita a senha"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-brand-blue text-white rounded-xl py-2.5 font-medium text-sm hover:bg-brand-hover transition-colors disabled:opacity-60"
      >
        {loading ? "Ativando..." : "Ativar minha conta"}
      </button>
    </form>
  );
}
