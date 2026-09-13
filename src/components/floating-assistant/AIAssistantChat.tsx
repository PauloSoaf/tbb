"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Trash2 } from "lucide-react";
import { AIAssistantComposer } from "./AIAssistantComposer";
import { AIAssistantMessageBubble } from "./AIAssistantMessageBubble";
import { AIAssistantSuggestedPrompts } from "./AIAssistantSuggestedPrompts";
import { getCannedResponse } from "./canned-responses";
import type { AssistantMessage } from "./types";
import type { AIAssistantAction } from "@/lib/ai/ai-actions";

const WELCOME_MESSAGE: AssistantMessage = {
  id: "welcome",
  role: "assistant",
  content: "Oi, eu sou o Assistente NutriOpus. Posso ajudar com navegacao, ferramentas e contexto do paciente atual quando autorizado.",
};

const MAX_HISTORY = 20;

function storageKey(tenant: string) {
  return `nutriopus-ai-chat-${tenant}`;
}

export function AIAssistantChat({ tenant, onOpenTool }: { tenant: string; onOpenTool?: (toolId: string) => void }) {
  const pathname = usePathname();
  const patientId = useMemo(() => {
    const match = pathname.match(/\/pacientes\/([^/]+)/);
    return match?.[1] ?? null;
  }, [pathname]);

  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([WELCOME_MESSAGE]);
  const counterRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const loadDoneRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    loadDoneRef.current = false;
    Promise.resolve(localStorage.getItem(storageKey(tenant)))
      .then((raw) => {
        loadDoneRef.current = true;
        if (!raw) return;
        const saved = JSON.parse(raw) as AssistantMessage[];
        if (Array.isArray(saved) && saved.length > 0) setMessages(saved);
      })
      .catch(() => { loadDoneRef.current = true; });
  }, [tenant]);

  useEffect(() => {
    if (!loadDoneRef.current) return;
    localStorage.setItem(storageKey(tenant), JSON.stringify(messages.slice(-MAX_HISTORY)));
  }, [messages, tenant]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  function clearHistory() {
    abortRef.current?.abort();
    localStorage.removeItem(storageKey(tenant));
    setMessages([WELCOME_MESSAGE]);
  }

  async function submit(prompt = input) {
    const text = prompt.trim();
    if (!text || isStreaming) return;
    setInput("");

    const userMessage: AssistantMessage = { id: `u-${Date.now()}`, role: "user", content: text };

    // Known suggested-prompt questions get an instant canned answer — no
    // network round-trip, no waiting on the (often slow, local-model) AI.
    const canned = getCannedResponse(text, tenant);
    if (canned) {
      const cannedMessage: AssistantMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: canned.content,
        actions: canned.actions,
        provider: "canned",
      };
      setMessages((prev) => [...prev, userMessage, cannedMessage]);
      return;
    }

    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);

    const history = currentMessages
      .filter((m) => m.id !== "welcome" && !m.isError && (m.role === "user" || m.role === "assistant"))
      .slice(-8)
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    // Placeholder para streaming — id estável para atualização incremental
    counterRef.current += 1;
    const assistantId = `a-${Date.now()}-${counterRef.current}`;
    const placeholderMsg: AssistantMessage = { id: assistantId, role: "assistant", content: "" };
    setMessages((prev) => [...prev, placeholderMsg]);

    setIsStreaming(true);
    const abort = new AbortController();
    abortRef.current = abort;

    let accumulatedText = "";
    let finalActions: AIAssistantAction[] = [];
    let finalProvider = "";
    let isError = false;

    try {
      const resp = await fetch(`/api/ai/stream-assistant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, tenant, currentPath: pathname, patientId, history }),
        signal: abort.signal,
      });

      if (!resp.ok || !resp.body) {
        throw new Error(`HTTP ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const raw = trimmed.slice(5).trim();

          try {
            const chunk = JSON.parse(raw) as {
              d?: string;
              done?: boolean;
              p?: string;
              a?: AIAssistantAction[];
              err?: boolean;
            };

            if (chunk.d) {
              accumulatedText += chunk.d;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: accumulatedText } : m,
                ),
              );
            }

            if (chunk.done) {
              finalActions = chunk.a ?? [];
              finalProvider = chunk.p ?? "";
              isError = chunk.err === true;
            }
          } catch {
            // malformed chunk — skip
          }
        }
      }
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        accumulatedText = "Nao consegui contatar o assistente agora. Tente novamente.";
        isError = true;
      }
    } finally {
      abortRef.current = null;
      setIsStreaming(false);
    }

    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantId
          ? {
              ...m,
              content: accumulatedText || "Nao recebi resposta. Tente novamente.",
              actions: finalActions,
              provider: finalProvider,
              isError,
            }
          : m,
      ),
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border-neutral px-4 py-3">
        <div className="min-w-0 flex-1">
          <AIAssistantSuggestedPrompts onSelect={submit} patientId={patientId} />
        </div>
        {messages.length > 1 && (
          <button
            type="button"
            onClick={clearHistory}
            title="Limpar conversa"
            aria-label="Limpar conversa"
            className="shrink-0 rounded-lg p-1.5 text-text-secondary hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-warm-surface/60 px-4 py-4">
        {messages.map((message) => (
          <AIAssistantMessageBubble key={message.id} message={message} onOpenTool={onOpenTool} />
        ))}
        {isStreaming && messages.at(-1)?.content === "" && (
          <div className="inline-flex items-center gap-1 rounded-2xl border border-border-neutral bg-card-bg px-3 py-2 text-sm text-text-secondary shadow-sm">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-blue" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-blue [animation-delay:120ms]" />
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-blue [animation-delay:240ms]" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <AIAssistantComposer value={input} loading={isStreaming} onChange={setInput} onSubmit={() => submit()} />
    </div>
  );
}
