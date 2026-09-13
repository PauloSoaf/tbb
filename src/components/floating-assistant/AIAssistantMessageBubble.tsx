"use client";

import Link from "next/link";
import { Wrench } from "lucide-react";
import type { AssistantMessage } from "./types";

export function AIAssistantMessageBubble({
  message,
  onOpenTool,
}: {
  message: AssistantMessage;
  onOpenTool?: (toolId: string) => void;
}) {
  const isUser = message.role === "user";

  const navActions = message.actions?.filter(
    (a): a is Extract<typeof a, { label: string; href: string }> =>
      a.type !== "NONE" && a.type !== "OPEN_TOOL"
  ) ?? [];

  const toolActions = message.actions?.filter(
    (a): a is Extract<typeof a, { type: "OPEN_TOOL"; label: string; toolId: string }> =>
      a.type === "OPEN_TOOL"
  ) ?? [];

  const hasActions = navActions.length > 0 || toolActions.length > 0;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-brand-blue text-white"
            : message.isError
              ? "border border-amber-200 bg-amber-50 text-text-primary shadow-sm"
              : "border border-border-neutral bg-card-bg text-text-primary shadow-sm"
        }`}
      >
        {message.isError && (
          <p className="mb-1.5 text-[11px] font-medium text-amber-600">⚠ Não foi possível obter resposta</p>
        )}
        <p className="whitespace-pre-wrap">{message.content}</p>
        {hasActions && (
          <div className="mt-3 flex flex-wrap gap-2">
            {navActions.map((action) => (
              <Link
                key={`${action.type}-${action.href}`}
                href={action.href}
                className="rounded-md border border-brand-blue/20 bg-brand-blue/10 px-2.5 py-1 text-xs font-semibold text-brand-blue hover:bg-brand-blue/15"
              >
                {action.label}
              </Link>
            ))}
            {onOpenTool && toolActions.map((action) => (
              <button
                key={`OPEN_TOOL-${action.toolId}`}
                type="button"
                onClick={() => onOpenTool(action.toolId)}
                className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
              >
                <Wrench className="h-3 w-3" />
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
