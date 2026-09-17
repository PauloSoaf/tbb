"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Link2, LoaderCircle, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { PARTNER_SHAREABLE_MODULES, type PartnerModule } from "@/lib/tenancy/partnerModules";
import { createPartnerInvite, revokePartnerInvite, disconnectPartner, updatePartnerSharingPolicy } from "./actions";
import type { PartnerSettingsData } from "./queries";

const moduleLabels: Record<PartnerModule, string> = {
  today: "Hoje", habits: "Hábitos", finance: "Finanças", investments: "Investimentos", career: "Carreira",
  tasks: "Tarefas", projects: "Projetos", goals: "Metas", calendar: "Calendário", insights: "Insights",
};

export function PartnerSettingsPanel({ data }: { data: PartnerSettingsData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [invite, setInvite] = useState<{ token: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);

  function generate() {
    startTransition(async () => {
      const result = await createPartnerInvite();
      if ("error" in result) { toast.error(result.error); return; }
      setInvite({ token: result.token, expiresAt: result.expiresAt });
      router.refresh();
    });
  }
  function revoke() {
    startTransition(async () => {
      const result = await revokePartnerInvite();
      if ("error" in result) { toast.error(result.error); return; }
      setInvite(null);
      toast.success(result.success);
      router.refresh();
    });
  }
  function disconnect() {
    if (!confirm("Encerrar a conexão com seu parceiro? Nenhum dado será apagado — vocês podem se reconectar depois.")) return;
    startTransition(async () => {
      const result = await disconnectPartner();
      if ("error" in result) { toast.error(result.error); return; }
      toast.success(result.success);
      router.refresh();
    });
  }
  function toggleModule(module: PartnerModule, enabled: boolean) {
    startTransition(async () => {
      const result = await updatePartnerSharingPolicy(module, enabled);
      if ("error" in result) { toast.error(result.error); return; }
      router.refresh();
    });
  }

  const link = invite ? `${typeof window !== "undefined" ? window.location.origin : ""}/partner/accept/${invite.token}` : null;

  if (invite) {
    return <section className="panel stack">
      <div><h2>Convite gerado</h2><p className="muted">Guarde este link agora — por segurança, ele não pode ser exibido novamente depois de sair desta tela. Válido até {new Date(invite.expiresAt).toLocaleDateString("pt-BR")}.</p></div>
      <div className="list-item"><code style={{wordBreak:"break-all"}}>{link}</code>
        <button className="button-secondary" onClick={() => { navigator.clipboard.writeText(link!); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
          {copied ? <Check size={15}/> : <Copy size={15}/>} {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
      <button className="button-secondary" onClick={revoke} disabled={pending}><X size={15}/> Cancelar convite</button>
    </section>;
  }

  if (data.state === "none") {
    return <section className="panel stack">
      <div><h2>Partner</h2><p className="muted">Conecte-se a outra conta TBB para ver dados compartilhados em Eu/Parceiro/Juntos. Cada workspace continua dono dos próprios dados.</p></div>
      <button className="button" onClick={generate} disabled={pending}>{pending ? <LoaderCircle size={16} className="spin"/> : <Link2 size={16}/>} Gerar link de convite</button>
    </section>;
  }

  if (data.state === "pending") {
    return <section className="panel stack">
      <div><h2>Convite pendente</h2><p className="muted">Expira em {new Date(data.expiresAt).toLocaleDateString("pt-BR")}. Se perdeu o link, gere um novo — o anterior será cancelado.</p></div>
      <div className="row" style={{gap:8}}>
        <button className="button" onClick={generate} disabled={pending}>{pending ? <LoaderCircle size={16} className="spin"/> : <Link2 size={16}/>} Gerar novo link</button>
        <button className="button-secondary" onClick={revoke} disabled={pending}><X size={15}/> Cancelar convite</button>
      </div>
    </section>;
  }

  return <section className="panel stack">
    <div className="list-item">
      <span className="avatar"><UserRound size={16}/></span>
      <div><p><strong>{data.partnerWorkspaceName}</strong></p><small className="muted">Conectado(a) desde {new Date(data.connectedSince).toLocaleDateString("pt-BR")}</small></div>
    </div>
    <div><h3>O que você compartilha com {data.partnerWorkspaceName}</h3><p className="muted">Seu parceiro só vê os módulos que você mantiver ativos aqui.</p></div>
    <div className="stack" style={{gap:6}}>
      {PARTNER_SHAREABLE_MODULES.map((module) => <label key={module} className="list-item">
        <span>{moduleLabels[module]}</span>
        <input type="checkbox" checked={data.myPolicy[module]} disabled={pending} onChange={(event) => toggleModule(module, event.target.checked)}/>
      </label>)}
    </div>
    <button className="button-secondary" onClick={disconnect} disabled={pending}>Desconectar</button>
  </section>;
}
