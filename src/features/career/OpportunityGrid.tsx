"use client";
import {
  useRef,
  useState,
  useTransition,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  SlidersHorizontal,
  Download,
  CalendarPlus,
  MoreHorizontal,
  X,
  BookmarkPlus,
} from "lucide-react";
import { useFinanceWriteAccess } from "@/features/finance/FinanceWriteAccess";
import type { CareerData, Opportunity } from "./queries";
import { stageLabels, stages } from "./domain";
import { responseLabels, responses } from "./schemas";
import { patchOpportunityAction, saveViewAction } from "./mutations";
import {
  CareerDrawer,
  CareerEmpty,
  CareerForm,
  field,
  SafeLink,
  dateLabel,
} from "./ui";
import { OpportunityForm } from "./OpportunityForm";
import { EventForm } from "./EventForm";

const columnNames: Record<string, string> = {
  status: "Etapa",
  response: "Retorno",
  stack: "Stack",
  applied: "Candidatura",
  nextAction: "Próxima ação",
  followup: "Follow-up",
  interview: "Entrevista",
  source: "Fonte",
  mode: "Modalidade",
  location: "Localização",
  seniority: "Senioridade",
  salary: "Faixa salarial",
  found: "Encontrada em",
  deadline: "Prazo",
  contact: "Último contato",
  resume: "Currículo",
  tags: "Tags",
  notes: "Observações",
  links: "Links",
};
const defaults = [
  "status",
  "response",
  "stack",
  "applied",
  "followup",
  "interview",
];
const defaultPreferences = JSON.stringify({ columns: defaults, widths: {} });
function subscribePreferences(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("tbb-career-preferences", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("tbb-career-preferences", callback);
  };
}
function useColumnPreferences(key: string) {
  const raw = useSyncExternalStore(
    subscribePreferences,
    () => {
      try {
        return localStorage.getItem(key) ?? defaultPreferences;
      } catch {
        return defaultPreferences;
      }
    },
    () => defaultPreferences,
  );
  let columns = defaults,
    widths: Record<string, number> = {};
  try {
    const parsed = JSON.parse(raw);
    if (
      Array.isArray(parsed.columns) &&
      parsed.columns.every(
        (c: unknown) => typeof c === "string" && c in columnNames,
      )
    )
      columns = parsed.columns;
    if (parsed.widths && typeof parsed.widths === "object")
      widths = Object.fromEntries(
        Object.entries(parsed.widths).filter(
          ([k, v]) =>
            k in columnNames && typeof v === "number" && v >= 80 && v <= 600,
        ),
      ) as Record<string, number>;
  } catch {}
  const save = (value: {
    columns: string[];
    widths: Record<string, number>;
  }) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      window.dispatchEvent(new Event("tbb-career-preferences"));
    } catch {}
  };
  return {
    columns,
    widths,
    setColumns: (value: string[]) => save({ columns: value, widths }),
    setWidths: (value: Record<string, number>) =>
      save({ columns, widths: value }),
  };
}
const money = (n: number | null) =>
  n == null
    ? "—"
    : new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      }).format(n / 100);

function InlineField({
  row,
  field: attribute,
  value,
  options,
}: {
  row: Opportunity;
  field: "status" | "response" | "appliedOn" | "nextActionDate";
  value: string;
  options?: Record<string, string>;
}) {
  const [draft, setDraft] = useState(value),
    [error, setError] = useState(""),
    [pending, start] = useTransition(),
    canWrite = useFinanceWriteAccess();
  function update(next: string) {
    setDraft(next);
    setError("");
    start(async () => {
      try {
        const r = await patchOpportunityAction({
          records: [{ id: row.id, revision: row.revision }],
          field: attribute,
          value: next,
        });
        if (r.error) setError(r.error);
      } catch {
        setError("Falha ao salvar. Tente novamente.");
      }
    });
  }
  return (
    <div className="career-inline" data-saving={pending || undefined}>
      {options ? (
        <select
          aria-label={`${attribute === "status" ? "Etapa" : "Retorno"}: ${row.jobTitle}`}
          value={draft}
          disabled={pending || !canWrite}
          data-stage={attribute === "status" ? draft : undefined}
          data-response={attribute === "response" ? draft : undefined}
          onChange={(e) => update(e.target.value)}
        >
          {Object.entries(options).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      ) : (
        <input
          aria-label={`${attribute === "appliedOn" ? "Data da candidatura" : "Data de follow-up"}: ${row.jobTitle}`}
          type="date"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft !== value) update(draft);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              update(draft);
            }
          }}
          disabled={pending || !canWrite}
        />
      )}
      {pending && (
        <span role="status" className="career-inline-feedback">
          Salvando…
        </span>
      )}
      {error && (
        <span role="alert" className="career-inline-error">
          {error}
        </span>
      )}
    </div>
  );
}
export function OpportunityGrid({ data }: { data: CareerData }) {
  const router = useRouter(),
    path = usePathname(),
    search = useSearchParams(),
    canWrite = useFinanceWriteAccess();
  const { columns, widths, setColumns, setWidths } = useColumnPreferences(
    data.preferenceKey,
  );
  const [selected, setSelected] = useState<string[]>([]),
    [record, setRecord] = useState<Opportunity | null>(null),
    [interview, setInterview] = useState<Opportunity | null>(null),
    [feedback, setFeedback] = useState(""),
    [pending, start] = useTransition();
  const activeSelection = selected.filter((id) =>
    data.applications.some((a) => a.id === id),
  );
  const table = useRef<HTMLTableElement>(null);
  const selectedRecord =
    record ??
    (search.get("record") === data.selectedOpportunity?.id
      ? data.selectedOpportunity
      : null);
  const activeRecord = selectedRecord
    ? (data.applications.find((r) => r.id === selectedRecord.id) ??
      (data.selectedOpportunity?.id === selectedRecord.id
        ? data.selectedOpportunity
        : selectedRecord))
    : null;
  function openRecord(row: Opportunity) {
    setRecord(row);
    const params = new URLSearchParams(search.toString());
    params.set("record", row.id);
    router.replace(path + "?" + params, { scroll: false });
  }
  function closeRecord() {
    setRecord(null);
    if (search.has("record")) {
      const params = new URLSearchParams(search.toString());
      params.delete("record");
      router.replace(path + "?" + params, { scroll: false });
    }
  }
  function navigate(patch: Record<string, string>, reset = true) {
    const params = new URLSearchParams(search.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    if (reset) params.delete("page");
    params.delete("record");
    setSelected([]);
    router.replace(path + "?" + params, { scroll: false });
  }
  function quick(rows: Opportunity[], attribute: string, value = "") {
    start(async () => {
      setFeedback("");
      try {
        const result = await patchOpportunityAction({
          records: rows.map((r) => ({ id: r.id, revision: r.revision })),
          field: attribute,
          value,
        });
        setFeedback(result.error || result.success || "");
        if (!result.error) setSelected([]);
      } catch {
        setFeedback("Não foi possível salvar; tente novamente.");
      }
    });
  }
  function keyboard(e: KeyboardEvent<HTMLTableElement>) {
    if (
      !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key) ||
      !e.altKey
    )
      return;
    const cells = [
        ...table.current!.querySelectorAll<HTMLElement>(
          "tbody button,tbody select,tbody input",
        ),
      ],
      index = cells.indexOf(document.activeElement as HTMLElement);
    if (index >= 0) {
      e.preventDefault();
      cells[
        Math.max(
          0,
          Math.min(
            cells.length - 1,
            index + (e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 1),
          ),
        )
      ].focus();
    }
  }
  function group(a: Opportunity) {
    return data.filters.group === "company"
      ? a.company.name
      : data.filters.group === "stack"
        ? a.technologies[0] || "Sem stack"
        : data.filters.group === "status"
          ? stageLabels[a.status]
          : data.filters.group === "response"
            ? responseLabels[a.response] || a.response
            : "";
  }
  const rows = data.filters.group
    ? [...data.applications].sort((a, b) => group(a).localeCompare(group(b)))
    : data.applications;
  const commonActions = (a: Opportunity) => (
    <details className="career-row-menu">
      <summary aria-label={`Ações: ${a.jobTitle}`}>
        <MoreHorizontal size={16} />
      </summary>
      <div>
        <SafeLink href={a.url}>Abrir vaga ↗</SafeLink>
        <SafeLink href={a.company.careersUrl || a.company.website}>
          Carreiras ↗
        </SafeLink>
        {canWrite && (
          <>
            <button
              type="button"
              onClick={() => quick([a], "status", "APPLIED")}
            >
              Marcar como aplicada
            </button>
            <button
              type="button"
              onClick={() => quick([a], "response", "POSITIVE")}
            >
              Resposta positiva
            </button>
            <button
              type="button"
              onClick={() => quick([a], "status", "REJECTED")}
            >
              Resposta negativa
            </button>
            <button type="button" onClick={() => setInterview(a)}>
              Agendar entrevista
            </button>
            <button type="button" onClick={() => quick([a], "followUp")}>
              Registrar follow-up enviado
            </button>
            <button type="button" onClick={() => quick([a], "duplicate")}>
              Duplicar candidatura
            </button>
            <button
              type="button"
              onClick={() => quick([a], "status", "ARCHIVED")}
            >
              Arquivar
            </button>
          </>
        )}
        <button type="button" onClick={() => openRecord(a)}>
          Detalhes e observações
        </button>
      </div>
    </details>
  );
  function cell(a: Opportunity, c: string) {
    const upcoming = a.interviews.find((i) =>
      ["PENDING", "RESCHEDULED"].includes(i.status),
    );
    switch (c) {
      case "status":
        return (
          <InlineField
            key={a.revision}
            row={a}
            field="status"
            value={a.status}
            options={stageLabels}
          />
        );
      case "response":
        return (
          <InlineField
            key={a.revision}
            row={a}
            field="response"
            value={a.response}
            options={responseLabels}
          />
        );
      case "applied":
        return (
          <InlineField
            key={a.revision}
            row={a}
            field="appliedOn"
            value={a.appliedAt?.slice(0, 10) ?? ""}
          />
        );
      case "followup":
        return (
          <InlineField
            key={a.revision}
            row={a}
            field="nextActionDate"
            value={a.nextActionDate ?? ""}
          />
        );
      case "stack":
        return a.technologies.join(", ") || "—";
      case "interview":
        return upcoming ? (
          <button
            type="button"
            className="career-cell-link"
            onClick={() => setInterview(a)}
          >
            {dateLabel(
              new Date(upcoming.scheduledAt).toLocaleDateString("en-CA", {
                timeZone: data.timeZone,
              }),
            )}
          </button>
        ) : canWrite ? (
          <button
            type="button"
            className="career-cell-link"
            onClick={() => setInterview(a)}
          >
            <CalendarPlus size={13} /> Agendar
          </button>
        ) : (
          "—"
        );
      case "source":
        return a.source;
      case "mode":
        return { REMOTE: "Remoto", HYBRID: "Híbrido", ONSITE: "Presencial" }[
          a.workMode
        ];
      case "location":
        return a.location || "—";
      case "seniority":
        return a.seniority || "—";
      case "salary":
        return `${money(a.salaryMinCents)} – ${money(a.salaryMaxCents)}`;
      case "found":
        return dateLabel(a.foundOn);
      case "deadline":
        return dateLabel(a.deadline);
      case "contact":
        return dateLabel(a.lastContactOn);
      case "resume":
        return a.resumeVersion
          ? `${a.resumeVersion.title} · v${a.resumeVersion.number}`
          : "—";
      case "tags":
        return a.tags.join(", ") || "—";
      case "notes":
        return (
          <button
            type="button"
            className="career-cell-link career-truncate"
            onClick={() => openRecord(a)}
          >
            {a.notes || "Adicionar notas"}
          </button>
        );
      case "links":
        return <SafeLink href={a.url}>Vaga ↗</SafeLink>;
      case "nextAction":
        return a.nextAction || "—";
      default:
        return "—";
    }
  }
  return (
    <section className="career-grid-panel" aria-label="Planilha de vagas">
      <div className="career-grid-heading">
        <div>
          <h2>Seu pipeline</h2>
          <span>
            {data.count} vaga(s) · {data.stats.active} ativas
          </span>
        </div>
        <div className="career-segmented">
          {[
            ["table", "Tabela"],
            ["cards", "Cards"],
            ["kanban", "Kanban"],
          ].map(([v, l]) => (
            <button
              type="button"
              key={v}
              aria-pressed={data.filters.view === v}
              onClick={() => navigate({ view: v })}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      <form
        key={JSON.stringify(data.filters)}
        className="career-grid-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          navigate(
            Object.fromEntries(
              [...fd.entries()].map(([k, v]) => [k, String(v)]),
            ),
          );
        }}
      >
        <label className="career-search">
          <Search size={15} />
          <input
            name="q"
            aria-label="Buscar vagas"
            placeholder="Buscar cargo, empresa ou stack…"
            defaultValue={data.filters.q}
          />
        </label>
        <select
          name="status"
          aria-label="Filtrar etapa"
          defaultValue={data.filters.status}
        >
          <option value="">Todas as etapas</option>
          {stages.map((s) => (
            <option key={s} value={s}>
              {stageLabels[s]}
            </option>
          ))}
        </select>
        <select
          name="response"
          aria-label="Filtrar retorno"
          defaultValue={data.filters.response}
        >
          <option value="">Todos os retornos</option>
          {responses.map((r) => (
            <option key={r} value={r}>
              {responseLabels[r]}
            </option>
          ))}
        </select>
        <button className="button-secondary" type="submit">
          Filtrar
        </button>
        <details className="career-toolbar-menu">
          <summary>
            <SlidersHorizontal size={15} /> Mais filtros
          </summary>
          <div>
            <label>
              Empresa
              <select name="company" defaultValue={data.filters.company}>
                <option value="">Todas</option>
                {data.companies.map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Stack
              <select name="stack" defaultValue={data.filters.stack}>
                <option value="">Todas</option>
                {[...new Set(data.all.flatMap((a) => a.technologies))]
                  .sort()
                  .map((s) => (
                    <option key={s}>{s}</option>
                  ))}
              </select>
            </label>
            <label>
              Modalidade
              <select name="workMode" defaultValue={data.filters.workMode}>
                <option value="">Todas</option>
                <option value="REMOTE">Remoto</option>
                <option value="HYBRID">Híbrido</option>
                <option value="ONSITE">Presencial</option>
              </select>
            </label>
            <label>
              Atenção
              <select name="attention" defaultValue={data.filters.attention}>
                <option value="">Todas</option>
                <option value="due">Follow-up pendente</option>
                <option value="stale">Paradas há 10+ dias</option>
                <option value="deadline">Prazo nos próximos 3 dias</option>
              </select>
            </label>
            <label>
              Ordenar
              <select name="sort" defaultValue={data.filters.sort}>
                <option value="updated">Última atualização</option>
                <option value="company">Empresa</option>
                <option value="applied">Candidatura</option>
                <option value="followup">Follow-up</option>
              </select>
            </label>
            <label>
              Direção
              <select name="direction" defaultValue={data.filters.direction}>
                <option value="desc">Decrescente</option>
                <option value="asc">Crescente</option>
              </select>
            </label>
            <button type="submit" className="button-secondary">
              Aplicar filtros
            </button>
          </div>
        </details>
      </form>
      <div className="career-grid-options">
        <div className="row">
          <select
            aria-label="Agrupar vagas"
            value={data.filters.group}
            onChange={(e) => navigate({ group: e.target.value })}
          >
            <option value="">Sem agrupamento</option>
            <option value="status">Por etapa</option>
            <option value="company">Por empresa</option>
            <option value="stack">Por stack</option>
            <option value="response">Por retorno</option>
          </select>
          <details className="career-toolbar-menu">
            <summary>Colunas · {columns.length}</summary>
            <div>
              {Object.entries(columnNames).map(([key, label]) => (
                <div className="career-column-option" key={key}>
                  <label className="career-check">
                    <input
                      type="checkbox"
                      checked={columns.includes(key)}
                      onChange={() =>
                        setColumns(
                          columns.includes(key)
                            ? columns.filter((c) => c !== key)
                            : [...columns, key],
                        )
                      }
                    />
                    {label}
                  </label>
                  {columns.includes(key) && (
                    <input
                      type="range"
                      aria-label={`Largura: ${label}`}
                      min={100}
                      max={360}
                      step={10}
                      value={widths[key] ?? 150}
                      onChange={(e) =>
                        setWidths({ ...widths, [key]: Number(e.target.value) })
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          </details>
          <details className="career-toolbar-menu">
            <summary>
              <BookmarkPlus size={14} /> Visualizações
            </summary>
            <div>
              {data.views.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    const config = v.settings as Record<string, unknown>;
                    navigate(
                      Object.fromEntries(
                        Object.entries(config)
                          .filter(([k]) => !["columns", "widths"].includes(k))
                          .map(([k, v]) => [k, String(v)]),
                      ),
                    );
                    if (Array.isArray(config.columns))
                      setColumns(
                        config.columns.filter(
                          (c): c is string =>
                            typeof c === "string" && c in columnNames,
                        ),
                      );
                    if (config.widths && typeof config.widths === "object")
                      setWidths(config.widths as Record<string, number>);
                  }}
                >
                  {v.title}
                </button>
              ))}
              {canWrite && (
                <CareerForm
                  className="stack"
                  saveLabel="Salvar visualização"
                  submit={(fd) =>
                    saveViewAction({
                      title: field(fd, "title"),
                      settings: { ...data.filters, columns, widths },
                    })
                  }
                >
                  <label>
                    Nome
                    <input name="title" required maxLength={80} />
                  </label>
                </CareerForm>
              )}
            </div>
          </details>
        </div>
        <div className="row">
          <a
            className="career-cell-link"
            href={`/api/career/export?${search.toString()}`}
          >
            <Download size={14} /> CSV
          </a>
          {canWrite && (
            <CareerDrawer title="Importar vagas" trigger="Importar CSV">
              <p className="career-note">
                Use a exportação como modelo. O lote será validado antes de
                gravar; registros com o mesmo identificador são ignorados, sem
                sobrescrever suas notas.
              </p>
              <CareerCsvImport />
            </CareerDrawer>
          )}
        </div>
      </div>
      {activeSelection.length > 0 && (
        <div className="career-bulk" role="region" aria-label="Ações em lote">
          <strong>{activeSelection.length} selecionada(s)</strong>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              quick(
                data.applications.filter((a) => activeSelection.includes(a.id)),
                "status",
                "APPLIED",
              )
            }
          >
            Marcar aplicadas
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              quick(
                data.applications.filter((a) => activeSelection.includes(a.id)),
                "status",
                "ARCHIVED",
              )
            }
          >
            Arquivar
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              quick(
                data.applications.filter((a) => activeSelection.includes(a.id)),
                "response",
                "POSITIVE",
              )
            }
          >
            Retorno positivo
          </button>
          <button
            type="button"
            onClick={() => setSelected([])}
            aria-label="Limpar seleção"
          >
            <X size={14} />
          </button>
        </div>
      )}
      <p className="career-grid-feedback" role="status">
        {pending ? "Salvando alterações…" : feedback}
      </p>
      {!rows.length ? (
        <CareerEmpty
          title="Abra espaço para sua próxima oportunidade"
          description="Cadastre uma vaga para acompanhar a candidatura, o currículo e cada conversa. Nenhum dado de demonstração é incluído aqui."
        />
      ) : data.filters.view === "table" ? (
        <div
          className="career-table-scroll"
          tabIndex={0}
          aria-label="Tabela de candidaturas; role horizontalmente para mais colunas"
        >
          <table className="career-table" ref={table} onKeyDown={keyboard}>
            <thead>
              <tr>
                <th className="career-pin-check">
                  {canWrite && (
                    <input
                      type="checkbox"
                      aria-label="Selecionar vagas desta página"
                      checked={activeSelection.length === rows.length}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked ? rows.map((r) => r.id) : [],
                        )
                      }
                    />
                  )}
                </th>
                <th className="career-pin-company">Empresa / cargo</th>
                {columns.map((c) => (
                  <th
                    style={{
                      minWidth: widths[c] ?? 150,
                      width: widths[c] ?? 150,
                    }}
                    key={c}
                  >
                    {columnNames[c]}
                  </th>
                ))}
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a, index) => (
                <OpportunityRows
                  key={a.id}
                  group={
                    data.filters.group &&
                    (index === 0 || group(a) !== group(rows[index - 1]))
                      ? group(a)
                      : null
                  }
                  colSpan={columns.length + 3}
                >
                  <tr
                    data-selected={activeSelection.includes(a.id) || undefined}
                  >
                    <td className="career-pin-check">
                      {canWrite && (
                        <input
                          type="checkbox"
                          aria-label={`Selecionar ${a.jobTitle}`}
                          checked={activeSelection.includes(a.id)}
                          onChange={(e) =>
                            setSelected(
                              e.target.checked
                                ? [...activeSelection, a.id]
                                : activeSelection.filter((id) => id !== a.id),
                            )
                          }
                        />
                      )}
                    </td>
                    <td className="career-pin-company">
                      <button
                        type="button"
                        className="career-company-cell"
                        onClick={() => openRecord(a)}
                        onKeyDown={(e) => {
                          if (e.key === " ") {
                            e.preventDefault();
                            openRecord(a);
                          }
                        }}
                      >
                        <span className="career-company-mark">
                          {a.company.name.slice(0, 2).toUpperCase()}
                        </span>
                        <span>
                          <strong>{a.company.name}</strong>
                          <small>{a.jobTitle}</small>
                        </span>
                        {a.nextActionDate && a.nextActionDate <= data.today && (
                          <span
                            className="career-attention-dot"
                            title="Follow-up pendente"
                          />
                        )}
                      </button>
                    </td>
                    {columns.map((c) => (
                      <td key={c}>{cell(a, c)}</td>
                    ))}
                    <td>{commonActions(a)}</td>
                  </tr>
                </OpportunityRows>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          className={
            data.filters.view === "kanban" ? "career-board" : "career-cards"
          }
        >
          {(data.filters.view === "kanban" ? stages : [""]).map((stage) => (
            <section key={stage}>
              {stage && (
                <h3 className="career-board-heading">
                  {stageLabels[stage as keyof typeof stageLabels]}{" "}
                  <span>{rows.filter((r) => r.status === stage).length}</span>
                </h3>
              )}
              {rows
                .filter((a) => !stage || a.status === stage)
                .map((a) => (
                  <article className="career-job-card" key={a.id}>
                    <div className="row justify-between">
                      <span className="career-company-mark">
                        {a.company.name.slice(0, 2).toUpperCase()}
                      </span>
                      {commonActions(a)}
                    </div>
                    <button type="button" onClick={() => openRecord(a)}>
                      <strong>{a.company.name}</strong>
                      <h3>{a.jobTitle}</h3>
                    </button>
                    <span>
                      {a.technologies.join(" · ") || "Stack não informada"}
                    </span>
                    <InlineField
                      key={a.revision}
                      row={a}
                      field="status"
                      value={a.status}
                      options={stageLabels}
                    />
                    <small>
                      {responseLabels[a.response]} ·{" "}
                      {dateLabel(a.nextActionDate)}
                    </small>
                  </article>
                ))}
            </section>
          ))}
        </div>
      )}
      <footer className="career-grid-footer">
        <span>
          40 por página · Alt + setas navega pelos controles · Espaço abre
          detalhes
        </span>
        <div className="row">
          <button
            className="button-secondary"
            type="button"
            disabled={data.page <= 1}
            onClick={() => navigate({ page: String(data.page - 1) }, false)}
          >
            Anterior
          </button>
          <span>
            {data.page} / {Math.max(1, Math.ceil(data.count / 40))}
          </span>
          <button
            className="button-secondary"
            type="button"
            disabled={data.page * 40 >= data.count}
            onClick={() => navigate({ page: String(data.page + 1) }, false)}
          >
            Próxima
          </button>
        </div>
      </footer>
      {activeRecord && (
        <CareerDrawer
          title={`${activeRecord.company.name} · ${activeRecord.jobTitle}`}
          trigger="Detalhes"
          className="career-hidden"
          open
          onClose={closeRecord}
        >
          <OpportunityForm data={data} opportunity={activeRecord} />
        </CareerDrawer>
      )}
      {interview && (
        <CareerDrawer
          title={`Entrevista · ${interview.company.name}`}
          trigger={<CalendarPlus size={16} />}
          className="career-hidden"
          open
          onClose={() => setInterview(null)}
        >
          <EventForm data={data} applicationId={interview.id} />
        </CareerDrawer>
      )}
    </section>
  );
}
import { Fragment, type ReactNode } from "react";
function OpportunityRows({
  group,
  colSpan,
  children,
}: {
  group: string | null | false;
  colSpan: number;
  children: ReactNode;
}) {
  return (
    <Fragment>
      {group && (
        <tr className="career-group-row">
          <th colSpan={colSpan}>{group}</th>
        </tr>
      )}
      {children}
    </Fragment>
  );
}
function CareerCsvImport() {
  return (
    <CareerForm
      saveLabel="Validar e importar"
      submit={async (fd) => {
        const file = fd.get("file");
        if (!(file instanceof File)) return { error: "Selecione o arquivo." };
        if (file.size > 2_000_000) return { error: "Limite de 2 MB por lote." };
        const { importCareerCsvAction } = await import("./transfer-actions");
        return importCareerCsvAction(await file.text());
      }}
    >
      <label>
        CSV UTF-8
        <input type="file" name="file" accept=".csv,text/csv" required />
      </label>
    </CareerForm>
  );
}
