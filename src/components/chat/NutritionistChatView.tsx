"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { sendNutritionistMessageAction, getNutritionistChatAction, markNutritionistChatReadAction } from "@/actions/patient-portal.action";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Send, MessageCircle } from "lucide-react";
import { AsyncButton } from "@/components/ui/AsyncButton";

interface Message {
  id: string;
  sender: string;
  body: string;
  createdAt: Date | string;
}

interface Props {
  tenantSlug: string;
  patientId: string;
  initialMessages: Message[];
}

export function NutritionistChatView({ tenantSlug, patientId, initialMessages }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    const result = await getNutritionistChatAction(tenantSlug, patientId);
    if (result.messages) {
      setMessages(result.messages as Message[]);
    }
  }, [tenantSlug, patientId]);

  useEffect(() => {
    // Mark patient messages as read when chat is opened
    markNutritionistChatReadAction(tenantSlug, patientId).catch(() => {});
    const id = setInterval(fetchMessages, 15000);
    return () => clearInterval(id);
  }, [fetchMessages, tenantSlug, patientId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    setSending(true);
    try {
      const result = await sendNutritionistMessageAction(tenantSlug, patientId, trimmed);
      if (result.success && result.message) {
        setMessages(prev => [...prev, result.message as Message]);
        setBody("");
      } else {
        toast.error(result.error || "Erro ao enviar mensagem.");
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col bg-white rounded-2xl border border-border-neutral overflow-hidden" style={{ height: "600px" }}>
      <div className="px-4 py-3 border-b border-border-neutral bg-warm-surface flex items-center gap-2">
        <MessageCircle className="w-4 h-4 text-brand-blue" />
        <span className="text-sm font-semibold text-text-primary">Mensagens do portal</span>
        <span className="text-xs text-text-secondary ml-auto">As mensagens aparecem em tempo real no portal do paciente</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-text-secondary text-sm mt-12">
            <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p>Nenhuma mensagem ainda.</p>
            <p className="mt-1">Envie uma mensagem para o paciente.</p>
          </div>
        )}
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === "NUTRITIONIST" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm ${
                msg.sender === "NUTRITIONIST"
                  ? "bg-brand-blue text-white rounded-br-sm"
                  : "bg-gray-100 text-text-primary rounded-bl-sm"
              }`}
            >
              <p className={`text-[10px] mb-1 font-medium ${msg.sender === "NUTRITIONIST" ? "text-white/70" : "text-text-secondary"}`}>
                {msg.sender === "NUTRITIONIST" ? "Você" : "Paciente"}
              </p>
              <p>{msg.body}</p>
              <p className={`text-[10px] mt-1 ${msg.sender === "NUTRITIONIST" ? "text-white/70" : "text-text-secondary"}`}>
                {format(new Date(msg.createdAt), "dd/MM HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="p-3 border-t border-border-neutral flex gap-2">
        <input
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Mensagem para o paciente..."
          className="flex-1 border border-border-neutral rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          disabled={sending}
        />
        <AsyncButton
          type="submit"
          disabled={sending || !body.trim()}
          pending={sending}
          pendingLabel={null}
          aria-label={sending ? "Enviando mensagem..." : "Enviar mensagem"}
          className="bg-brand-blue text-white p-2.5 rounded-xl hover:bg-brand-blue-hover transition-colors disabled:opacity-60"
        >
          <Send className="w-4 h-4" />
        </AsyncButton>
      </form>
    </div>
  );
}
