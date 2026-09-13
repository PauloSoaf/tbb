"use client";
import { ExternalLink, Copy } from "lucide-react";
import { toast } from "sonner";

interface Props {
  url: string;
  role: "NUTRITIONIST" | "PATIENT";
}

export function ExternalMeetingRoom({ url, role: _role }: Props) {
  const copy = () => { navigator.clipboard.writeText(url); toast.success("Link copiado!"); };

  if (!url) return (
    <div className="flex items-center justify-center h-full text-white/40 text-sm">
      Nenhum link externo configurado.
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 bg-gray-950 text-white">
      <ExternalLink className="w-10 h-10 text-white/30" />
      <p className="text-sm text-white/60 text-center">Reunião por link externo</p>
      <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 max-w-sm w-full">
        <span className="flex-1 text-xs text-white/60 truncate">{url}</span>
        <button onClick={copy} className="shrink-0 p-1.5 hover:bg-white/10 rounded-lg">
          <Copy className="w-3.5 h-3.5" />
        </button>
      </div>
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-2 px-6 py-2.5 bg-brand-blue hover:bg-brand-blue-hover rounded-xl text-sm font-semibold transition-colors">
        <ExternalLink className="w-4 h-4" />
        Entrar na reunião
      </a>
    </div>
  );
}
