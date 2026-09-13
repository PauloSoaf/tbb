"use client";

import { useState, useTransition } from "react";
import { Loader2, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  upsertTenantFeatureOverrideAdminAction,
  deleteTenantFeatureOverrideAdminAction,
} from "@/actions/admin-billing.action";

interface Props {
  tenantId: string;
  tenantName: string;
  currentLimitMb: number | null;
  hasOverride: boolean;
}

export function TenantStorageOverrideEditor({ tenantId, tenantName, currentLimitMb, hasOverride }: Props) {
  const [open, setOpen] = useState(false);
  const [limitMb, setLimitMb] = useState(currentLimitMb === null ? "" : String(currentLimitMb));
  const [reason, setReason] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-blue hover:underline"
      >
        <Pencil className="w-3 h-3" />
        {hasOverride ? "Editar exceção" : "Dar exceção"}
      </button>
    );
  }

  const save = () => {
    const parsed = limitMb.trim() === "" ? null : Number(limitMb);
    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0)) {
      toast.error("Informe um número válido de MB ou deixe vazio para ilimitado.");
      return;
    }
    startTransition(async () => {
      const res = await upsertTenantFeatureOverrideAdminAction(
        tenantId,
        "storage.maxMb",
        parsed,
        true,
        reason,
        expiresAt || null
      );
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Exceção de armazenamento salva para ${tenantName}.`);
        setOpen(false);
      }
    });
  };

  const remove = () => {
    startTransition(async () => {
      const res = await deleteTenantFeatureOverrideAdminAction(tenantId, "storage.maxMb");
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Exceção removida — ${tenantName} volta ao limite do plano.`);
        setOpen(false);
      }
    });
  };

  return (
    <div className="absolute z-20 mt-1 right-0 w-64 bg-card-bg border border-border-neutral rounded-xl shadow-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-text-primary">Exceção — {tenantName}</span>
        <button type="button" onClick={() => setOpen(false)} className="text-text-secondary hover:text-text-primary">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <label className="block text-[11px] text-text-secondary">
        Limite (MB, vazio = ilimitado)
        <input
          type="number"
          min={0}
          value={limitMb}
          onChange={(e) => setLimitMb(e.target.value)}
          className="w-full mt-0.5 text-xs bg-background border border-border-neutral rounded-lg px-2 py-1.5 text-text-primary"
        />
      </label>
      <label className="block text-[11px] text-text-secondary">
        Motivo
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex: promoção, negociação"
          className="w-full mt-0.5 text-xs bg-background border border-border-neutral rounded-lg px-2 py-1.5 text-text-primary"
        />
      </label>
      <label className="block text-[11px] text-text-secondary">
        Expira em (opcional)
        <input
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          className="w-full mt-0.5 text-xs bg-background border border-border-neutral rounded-lg px-2 py-1.5 text-text-primary"
        />
      </label>
      <div className="flex items-center justify-between gap-2 pt-1">
        {hasOverride ? (
          <button
            type="button"
            onClick={remove}
            disabled={isPending}
            className="flex items-center gap-1 text-[11px] font-semibold text-danger hover:underline disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />} Remover
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-blue text-white text-[11px] font-semibold rounded-lg hover:bg-brand-blue/90 disabled:opacity-50"
        >
          {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
          Salvar
        </button>
      </div>
    </div>
  );
}
