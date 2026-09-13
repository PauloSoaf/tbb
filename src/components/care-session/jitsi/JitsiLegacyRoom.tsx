"use client";
import { JitsiVideoRoom } from "../JitsiVideoRoom";
import { ShieldCheck } from "lucide-react";

interface Props {
  careSessionId: string;
  displayName: string;
}

// Embedded Jitsi Meet room (open source — github.com/jitsi/jitsi-meet).
// Runs entirely inside an iframe via the official IFrame API on meet.jit.si:
// zero configuration, no signaling server, works on any deployment.
// This is the most reliable option for the call.
export function JitsiLegacyRoom({ careSessionId, displayName }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 bg-emerald-900/20 border-b border-emerald-700/20 flex items-center gap-2">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span className="text-xs text-emerald-300">
          Sala segura via Jitsi Meet (open source) — embutida na plataforma.
        </span>
      </div>
      <div className="flex-1">
        <JitsiVideoRoom roomName={careSessionId} displayName={displayName} />
      </div>
    </div>
  );
}
