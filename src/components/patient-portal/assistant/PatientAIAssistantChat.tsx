"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Trash2, Loader2, X } from "lucide-react";
import { askPatientAIAction } from "@/actions/patient-ai.action";
import { useI18n } from "@/lib/i18n/I18nContext";
import type { ConversationHistoryItem } from "@/lib/ai/build-messages";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
}

const STORAGE_KEY_PREFIX = "nutriopus-patient-ai-";

interface PatientAIAssistantChatProps {
  tenantSlug: string;
  onClose: () => void;
}

export function PatientAIAssistantChat({ tenantSlug, onClose }: PatientAIAssistantChatProps) {
  const { t } = useI18n();
  const storageKey = `${STORAGE_KEY_PREFIX}${tenantSlug}`;

  const suggestions = [
    t("patient_portal.ai.suggestions.view_meal_plan"),
    t("patient_portal.ai.suggestions.register_weight"),
    t("patient_portal.ai.suggestions.schedule_appointment"),
    t("patient_portal.ai.suggestions.contact_nutritionist"),
    t("patient_portal.ai.suggestions.what_to_do"),
  ];

  const welcomeMessage: Message = {
    id: "welcome",
    role: "assistant",
    content: t("patient_portal.ai.welcome"),
  };

  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as Message[];
        if (Array.isArray(saved) && saved.length > 0) setMessages(saved);
      }
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    if (!loadedRef.current) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages.slice(-20)));
    } catch {}
  }, [messages, storageKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const clearHistory = () => {
    localStorage.removeItem(storageKey);
    setMessages([welcomeMessage]);
  };

  const submit = async (prompt = input) => {
    const text = prompt.trim();
    if (!text || loading) return;
    setInput("");

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: text };
    const currentMsgs = [...messages, userMsg];
    setMessages(currentMsgs);
    setLoading(true);

    const history: ConversationHistoryItem[] = currentMsgs
      .filter((m) => m.id !== "welcome" && !m.isError)
      .slice(-8)
      .map((m) => ({ role: m.role, content: m.content }));

    const result = await askPatientAIAction(tenantSlug, text, history);

    setMessages((prev) => [
      ...prev,
      {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: result.text,
        isError: !result.ok,
      },
    ]);
    setLoading(false);
  };

  const showSuggestions = messages.length === 1 && messages[0].id === "welcome";

  return (
    <div className="flex flex-col h-full">
      {/* Header — title left, actions right */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border-neutral">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary">{t("patient_portal.ai.title")}</p>
          <p className="text-xs text-text-secondary truncate">{t("patient_portal.ai.subtitle")}</p>
        </div>

        {/* Trash — limpar conversa */}
        <button
          onClick={clearHistory}
          title={t("assistant.close") === "Close" ? "Clear chat" : "Limpar conversa"}
          className="p-1.5 rounded-lg hover:bg-warm-surface text-text-secondary hover:text-danger transition-colors shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        {/* X — fechar modal */}
        <button
          onClick={onClose}
          title={t("assistant.close")}
          className="p-1.5 rounded-lg hover:bg-warm-surface text-text-secondary hover:text-text-primary transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-brand-blue text-white rounded-br-sm"
                  : msg.isError
                  ? "bg-red-50 dark:bg-red-900/20 text-danger border border-red-200 dark:border-red-800 rounded-bl-sm"
                  : "bg-warm-surface text-text-primary rounded-bl-sm"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-warm-surface rounded-2xl rounded-bl-sm px-3.5 py-2.5">
              <Loader2 className="w-4 h-4 text-brand-blue animate-spin" />
            </div>
          </div>
        )}

        {showSuggestions && (
          <div className="space-y-1.5 pt-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => submit(s)}
                className="w-full text-left text-xs px-3 py-2 rounded-xl bg-brand-blue-soft text-brand-blue hover:bg-brand-blue/20 transition-colors border border-brand-blue/20"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border-neutral">
        <form
          onSubmit={(e) => { e.preventDefault(); submit(); }}
          className="flex gap-2"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("patient_portal.ai.placeholder")}
            disabled={loading}
            className="flex-1 text-sm px-3 py-2 rounded-xl border border-border-neutral bg-background text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-blue/30 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="px-3 py-2 bg-brand-blue text-white rounded-xl hover:bg-brand-blue-hover transition-colors disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
