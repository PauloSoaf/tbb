"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { sendPatientMessageAction, getChatMessagesAction } from "@/actions/patient-portal.action";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Send } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { AsyncButton } from "@/components/ui/AsyncButton";

interface Message {
  id: string;
  sender: string;
  body: string;
  createdAt: Date | string;
}

interface Props {
  tenantSlug: string;
  initialMessages: Message[];
}

export function ChatClient({ tenantSlug, initialMessages }: Props) {
  const { t } = useI18n();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = useCallback(async () => {
    const result = await getChatMessagesAction(tenantSlug);
    if (result.messages) {
      setMessages(result.messages as Message[]);
    }
  }, [tenantSlug]);

  useEffect(() => {
    const id = setInterval(fetchMessages, 15000);
    return () => clearInterval(id);
  }, [fetchMessages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    setSending(true);
    try {
      const result = await sendPatientMessageAction(tenantSlug, trimmed);
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
    <div className="flex flex-col flex-1 min-h-0 bg-white rounded-2xl border border-border-neutral overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-text-secondary text-sm mt-8">
            {t("patient_portal.chat.empty")}
          </p>
        )}
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === "PATIENT" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm ${
                msg.sender === "PATIENT"
                  ? "bg-brand-blue text-white rounded-br-sm"
                  : "bg-gray-100 text-text-primary rounded-bl-sm"
              }`}
            >
              <p>{msg.body}</p>
              <p className={`text-[10px] mt-1 ${msg.sender === "PATIENT" ? "text-white/70" : "text-text-secondary"}`}>
                {format(new Date(msg.createdAt), "HH:mm", { locale: ptBR })}
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
          placeholder={t("patient_portal.chat.placeholder", { defaultValue: "Digite uma mensagem..." })}
          className="flex-1 border border-border-neutral rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          disabled={sending}
        />
        <AsyncButton
          type="submit"
          disabled={sending || !body.trim()}
          pending={sending}
          pendingLabel={null}
          aria-label={sending
            ? t("patient_portal.chat.sending", { defaultValue: "Enviando mensagem..." })
            : t("patient_portal.chat.send", { defaultValue: "Enviar mensagem" })}
          className="bg-brand-blue text-white p-2.5 rounded-xl hover:bg-brand-hover transition-colors disabled:opacity-60"
        >
          <Send className="w-4 h-4" />
        </AsyncButton>
      </form>
    </div>
  );
}
