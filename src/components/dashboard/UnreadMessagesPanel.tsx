"use client";

import { getPatientHref } from "@/services/patient-route.service";
import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { DashboardEmptyState } from "./DashboardEmptyState";
import { useI18n } from "@/lib/i18n/I18nContext";
import { formatDistanceByLocale } from "@/lib/i18n/formatters";

type MessageSummary = {
  id: string;
  body: string;
  createdAt: Date;
  patient: { id: string; name: string };
};

export function UnreadMessagesPanel({ messages, tenant }: { messages: MessageSummary[]; tenant: string }) {
  const { t, locale } = useI18n();
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">{t("dashboard.sections.unread_messages")}</h2>
        <p className="text-sm text-text-secondary">{t("dashboard.sections.unread_messages_desc")}</p>
      </div>
      {messages.length === 0 ? (
        <DashboardEmptyState
          icon={MessageCircle}
          title={t("dashboard.no_unread_messages")}
          description={t("dashboard.no_unread_messages_desc")}
        />
      ) : (
        <div className="space-y-2">
          {messages.map((message) => (
            <Link
              prefetch={false}
              key={message.id}
              href={getPatientHref({ tenant: tenant, patient: message.patient, suffix: "chat" })}
              className="block rounded-xl border border-border-neutral bg-card-bg p-3 transition-all hover:border-brand-blue/30 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-text-primary">{message.patient.name}</p>
                <span className="shrink-0 text-[11px] text-text-secondary">
                  {formatDistanceByLocale(message.createdAt, locale)}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-text-secondary">{message.body}</p>
              <span className="mt-2 inline-flex text-xs font-semibold text-brand-blue">{t("common.reply")}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
