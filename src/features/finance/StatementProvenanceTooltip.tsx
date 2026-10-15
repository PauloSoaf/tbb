"use client";

import { Info, TriangleAlert } from "lucide-react";
import { AppTooltip } from "@/components/ui/AppTooltip";
import type { ProvenanceView } from "./statement-provenance";

/** Info icon beside a bill: when it was last changed in TBB, which bank date it reflects, where it came
 * from. Opens on hover and keyboard focus, and by tap on touch screens. The text is already formatted
 * by the server, so the browser can never show a different time zone. */
export function StatementProvenanceTooltip({ view, subject }: { view: ProvenanceView; subject?: string }) {
  const content = <span className="provenance-tip">
    {view.stale && <strong className="provenance-stale"><TriangleAlert size={13} aria-hidden="true"/>Dados sem confirmação recente<small>{view.staleReason}</small></strong>}
    <dl>{view.lines.map((line) => <span key={line.label}><dt>{line.label}</dt><dd>{line.value}</dd></span>)}</dl>
    <small>{view.note}</small>
  </span>;
  return <AppTooltip content={content} side="top" touchToggle className="provenance-trigger">
    <button type="button" className="provenance-button" data-stale={view.stale || undefined} aria-label={`Procedência dos dados${subject ? ` de ${subject}` : ""}. ${view.summary}`}>
      {view.stale ? <TriangleAlert size={14} aria-hidden="true"/> : <Info size={14} aria-hidden="true"/>}
    </button>
  </AppTooltip>;
}
