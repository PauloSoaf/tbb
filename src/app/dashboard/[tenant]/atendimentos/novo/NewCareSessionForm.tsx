"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createCareSessionAction } from "@/actions/care-session.action";

type ProviderOption = "NATIVE_WEBRTC" | "GOOGLE_MEET" | "JITSI_LEGACY" | "EXTERNAL_LINK";

interface Patient {
  id: string;
  name: string;
  email: string | null;
}

interface Props {
  tenantSlug: string;
  patients: Patient[];
}

const PROVIDERS: { value: ProviderOption; label: string; description: string; badge?: string }[] = [
  {
    value: "NATIVE_WEBRTC",
    label: "NutriOpus Nativo",
    description: "Chamada dentro do NutriOpus, com visual próprio e controles integrados. Requer o servidor de sinalização ativo (npm run signaling).",
  },
  {
    value: "JITSI_LEGACY",
    label: "Sala Jitsi (embutida)",
    description: "Sala de vídeo open source (Jitsi Meet) embutida na plataforma. Zero configuração — opção mais estável.",
    badge: "Estável",
  },
  {
    value: "GOOGLE_MEET",
    label: "Google Meet",
    description: "Cole o link de uma reunião Meet. Abre em nova aba (o Google não permite embutir o Meet).",
  },
  {
    value: "EXTERNAL_LINK",
    label: "Link externo",
    description: "Use qualquer link de videoconferência externo.",
  },
];

export function NewCareSessionForm({ tenantSlug, patients }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<"VIDEO" | "AUDIO" | "IN_PERSON">("VIDEO");
  const [provider, setProvider] = useState<ProviderOption>("NATIVE_WEBRTC");
  const [roomUrl, setRoomUrl] = useState("");

  const needsUrl = provider === "GOOGLE_MEET" || provider === "EXTERNAL_LINK";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) {
      toast.error("Selecione um paciente.");
      return;
    }
    if (needsUrl && roomUrl && mode !== "IN_PERSON") {
      try {
        const parsed = new URL(roomUrl);
        if (parsed.protocol !== "https:") throw new Error();
      } catch {
        toast.error("URL inválida. Use um link https://");
        return;
      }
    }
    setLoading(true);
    const res = await createCareSessionAction(tenantSlug, patientId, {
      title: title || undefined,
      mode,
      provider,
      roomUrl: needsUrl && roomUrl ? roomUrl : undefined,
    });
    setLoading(false);
    if (res.success && res.careSession) {
      toast.success("Atendimento criado!");
      router.push(`/dashboard/${tenantSlug}/atendimentos/${res.careSession.id}`);
    } else {
      toast.error(res.error ?? "Erro ao criar atendimento.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 bg-card-bg border border-border-neutral rounded-xl p-6">
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          Paciente <span className="text-red-500">*</span>
        </label>
        <select
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          className="w-full border border-border-neutral rounded-lg px-3 py-2 text-sm bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          required
        >
          <option value="">Selecione um paciente...</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-3">
          Tipo de sala
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PROVIDERS.map((p) => (
            <label
              key={p.value}
              className={`relative flex flex-col gap-1 p-3 rounded-xl border cursor-pointer transition-all ${
                provider === p.value
                  ? "border-brand-blue bg-brand-blue/10 ring-1 ring-brand-blue/30"
                  : "border-border-neutral bg-background hover:border-brand-blue/40 hover:bg-warm-surface"
              }`}
            >
              <input
                type="radio"
                name="provider"
                value={p.value}
                checked={provider === p.value}
                onChange={() => setProvider(p.value)}
                className="sr-only"
              />
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${provider === p.value ? "text-brand-blue" : "text-text-primary"}`}>
                  {p.label}
                </span>
                {p.badge && (
                  <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-semibold rounded border border-amber-500/30">
                    {p.badge}
                  </span>
                )}
              </div>
              <span className="text-xs text-text-secondary leading-relaxed">{p.description}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">
          Título (opcional)
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Retorno mensal"
          className="w-full border border-border-neutral rounded-lg px-3 py-2 text-sm bg-background text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-primary mb-1">Modalidade</label>
        <div className="flex gap-3">
          {(["VIDEO", "AUDIO", "IN_PERSON"] as const).map((m) => (
            <label key={m} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                value={m}
                checked={mode === m}
                onChange={() => setMode(m)}
                className="accent-brand-blue"
              />
              <span className="text-sm text-text-primary">
                {m === "VIDEO" ? "Vídeo" : m === "AUDIO" ? "Áudio" : "Presencial"}
              </span>
            </label>
          ))}
        </div>
      </div>

      {needsUrl && mode !== "IN_PERSON" && (
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            {provider === "GOOGLE_MEET" ? "Link do Google Meet (opcional — pode colar depois)" : "Link externo da reunião"}
          </label>
          <input
            type="url"
            value={roomUrl}
            onChange={(e) => setRoomUrl(e.target.value)}
            placeholder={provider === "GOOGLE_MEET" ? "https://meet.google.com/xxx-yyyy-zzz" : "https://zoom.us/j/..."}
            className="w-full border border-border-neutral rounded-lg px-3 py-2 text-sm bg-background text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          />
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 px-4 py-2 border border-border-neutral text-text-secondary text-sm font-medium rounded-lg hover:bg-warm-surface transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-brand-blue hover:bg-brand-blue-hover text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? "Criando..." : "Criar atendimento"}
        </button>
      </div>
    </form>
  );
}
