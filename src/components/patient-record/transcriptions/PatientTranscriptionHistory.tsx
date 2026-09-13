"use client";

import { useState } from "react";
import { FileText, Search } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nContext";
import { PatientTranscriptionCard, type TranscriptionCardData } from "./PatientTranscriptionCard";
import { TranscriptionDetailDrawer } from "./PatientTranscriptionDetailDrawer";
import type { TranscriptionStatus } from "@prisma/client";

interface Props {
  transcriptions: TranscriptionCardData[];
  tenantSlug: string;
}

const ALL_STATUSES: TranscriptionStatus[] = [
  "NOT_STARTED", "UPLOADED", "PROCESSING", "COMPLETED",
  "FAILED", "NEEDS_REVIEW", "REVIEWED", "APPROVED", "REJECTED",
];

export function PatientTranscriptionHistory({ transcriptions, tenantSlug }: Props) {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TranscriptionStatus | "ALL">("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = transcriptions.filter((tr) => {
    if (statusFilter !== "ALL" && tr.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const haystack = [tr.title, tr.clinicalSummary, tr.editedTranscript, tr.rawTranscript]
        .filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    }
    return true;
  });

  const selected = transcriptions.find((tr) => tr.id === selectedId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          {t("transcriptions.title")}
          <span className="text-xs font-normal text-muted-foreground">({transcriptions.length})</span>
        </h3>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por palavra..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as TranscriptionStatus | "ALL")}
          className="rounded-lg border border-input bg-background text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="ALL">Todos os status</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{t(`transcriptions.status.${s.toLowerCase()}`)}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
          <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{t("transcriptions.empty.no_transcriptions_description")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((tr) => (
            <PatientTranscriptionCard key={tr.id} transcription={tr} onOpen={setSelectedId} />
          ))}
        </div>
      )}

      {selected && (
        <TranscriptionDetailDrawer
          transcription={selected}
          tenantSlug={tenantSlug}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
