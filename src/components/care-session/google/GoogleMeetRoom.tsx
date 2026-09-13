"use client";
import { ExternalLink, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface Props {
  googleMeetUri?: string | null;
  externalMeetingUrl?: string | null;
  role: "NUTRITIONIST" | "PATIENT";
  tenantSlug: string;
  careSessionId: string;
  onUpdateLink?: (url: string) => void;
}

export function GoogleMeetRoom({ googleMeetUri, externalMeetingUrl, role, onUpdateLink }: Props) {
  const meetUrl = googleMeetUri ?? externalMeetingUrl;
  const [linkInput, setLinkInput] = useState(meetUrl ?? "");
  const [saving, setSaving] = useState(false);

  const copyLink = () => {
    if (!meetUrl) return;
    navigator.clipboard.writeText(meetUrl);
    toast.success("Link copiado!");
  };

  const saveLink = async () => {
    if (!linkInput.trim()) return;
    try {
      const url = new URL(linkInput.trim());
      if (url.protocol !== "https:") throw new Error("URL inválida");
    } catch {
      toast.error("URL inválida. Use um link https://");
      return;
    }
    setSaving(true);
    onUpdateLink?.(linkInput.trim());
    setSaving(false);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8 bg-gray-950 text-white">
      <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center">
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
          <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.41 19c1.71.46 8.59.46 8.59.46s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.92 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z" fill="#1a73e8"/>
          <polygon points="9.75,15.02 15.5,11.75 9.75,8.48 9.75,15.02" fill="white"/>
        </svg>
      </div>

      <div className="text-center">
        <h3 className="font-semibold text-lg">Google Meet</h3>
        <p className="text-sm text-white/50 mt-1">
          {meetUrl ? "Reunião configurada" : "Configure o link do Google Meet"}
        </p>
      </div>

      {meetUrl ? (
        <div className="w-full max-w-sm space-y-3">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
            <span className="flex-1 text-xs text-white/60 truncate">{meetUrl}</span>
            <button onClick={copyLink} className="shrink-0 p-1.5 hover:bg-white/10 rounded-lg transition-colors">
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
          <a
            href={meetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-semibold transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Abrir Google Meet
          </a>
          {role === "NUTRITIONIST" && (
            <button
              onClick={() => { setLinkInput(""); onUpdateLink?.(""); }}
              className="flex items-center justify-center gap-1.5 w-full py-2 text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Trocar link
            </button>
          )}
        </div>
      ) : role === "NUTRITIONIST" ? (
        <div className="w-full max-w-sm space-y-3">
          <p className="text-xs text-white/50 text-center">
            Cole o link da sua reunião Google Meet abaixo
          </p>
          <input
            type="url"
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
            placeholder="https://meet.google.com/xxx-yyyy-zzz"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
          <button
            onClick={saveLink}
            disabled={saving || !linkInput.trim()}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar link"}
          </button>
          <p className="text-[11px] text-white/30 text-center">
            Crie uma reunião em meet.google.com e cole o link aqui.
          </p>
        </div>
      ) : (
        <p className="text-sm text-white/40 text-center">
          Aguardando nutricionista configurar o link da reunião...
        </p>
      )}
    </div>
  );
}
