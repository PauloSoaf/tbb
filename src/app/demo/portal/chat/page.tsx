"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { useDemo } from "@/demo/demo-context";
import { demoNutritionist, demoPatientUser } from "@/demo/demo-data";

export default function DemoPortalChatPage() {
  const { t } = useI18n();
  const { messages, sendMessage } = useDemo();
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const myMessages = messages.filter((m) => m.patientId === demoPatientUser.patientId);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [myMessages.length]);

  const submit = () => {
    if (!text.trim()) return;
    sendMessage(demoPatientUser.patientId, "PATIENT", text.trim());
    setText("");
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-220px)] max-w-3xl flex-col">
      <h1 className="mb-4 text-2xl font-black text-text-primary">{t("nav.chat")}</h1>

      <div className="flex min-h-0 flex-1 flex-col rounded-3xl border border-border-neutral bg-card-bg shadow-sm">
        <div className="border-b border-border-neutral px-4 py-3">
          <p className="text-sm font-bold text-text-primary">{demoNutritionist.name}</p>
          <p className="text-xs text-text-secondary">{demoNutritionist.clinic}</p>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
          {myMessages.map((m) => {
            const mine = m.sender === "PATIENT";
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-brand-blue text-white" : "bg-surface-warm text-text-primary"}`}>
                  {m.body}
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        <div className="flex items-center gap-2 border-t border-border-neutral p-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            placeholder={t("care_session.chat_placeholder", { defaultValue: "Digite uma mensagem..." })}
            className="min-w-0 flex-1 rounded-xl border border-border-neutral bg-surface-warm px-3 py-2 text-sm text-text-primary outline-none focus:border-brand-blue"
          />
          <button
            type="button"
            onClick={submit}
            aria-label={t("demo.pages.send")}
            className="rounded-xl bg-brand-blue p-2.5 text-white transition-colors hover:bg-brand-blue-hover"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
