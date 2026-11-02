"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useId } from "react";
import {
  FileText,
  Plus,
  ArrowUp,
  ArrowDown,
  Copy,
  Download,
  Eye,
} from "lucide-react";
import { useFinanceWriteAccess } from "@/features/finance/FinanceWriteAccess";
import type { CareerData } from "./queries";
import {
  resumeContentSchema,
  profileContentSchema,
  emptyProfile,
  type ResumeContent,
  type ProfileContent,
} from "./schemas";
import { resolveResume, baseResume, resumeMarkdown } from "./resume";
import { saveResumeAction, saveProfileAction } from "./mutations";
import { CareerForm, CareerDrawer, CareerEmpty, dateLabel } from "./ui";

type ResumeRow = CareerData["resumes"][number];
type Entries = ProfileContent["entries"];
const typeLabels = {
  EXPERIENCE: "Experiência",
  EDUCATION: "Formação",
  PROJECT: "Projeto",
  CERTIFICATION: "Certificação",
};
function EntryEditor({
  entries,
  onChange,
}: {
  entries: Entries;
  onChange: (v: Entries) => void;
}) {
  const update = (index: number, patch: Partial<Entries[number]>) =>
    onChange(entries.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  function move(index: number, delta: number) {
    const next = [...entries],
      target = index + delta;
    if (target < 0 || target >= entries.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }
  return (
    <div className="career-resume-entries">
      {entries.map((e, index) => (
        <details key={e.id} className="career-disclosure" open>
          <summary>
            {typeLabels[e.type]} · {e.title || "Nova seção"}
          </summary>
          <div className="career-form-grid">
            <label>
              Tipo
              <select
                value={e.type}
                onChange={(event) =>
                  update(index, {
                    type: event.target.value as Entries[number]["type"],
                  })
                }
              >
                {Object.entries(typeLabels).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Título
              <input
                value={e.title}
                onChange={(event) =>
                  update(index, { title: event.target.value })
                }
                required
              />
            </label>
            <label>
              Organização
              <input
                value={e.organization}
                onChange={(event) =>
                  update(index, { organization: event.target.value })
                }
              />
            </label>
            <label>
              Período
              <input
                value={e.period}
                onChange={(event) =>
                  update(index, { period: event.target.value })
                }
                placeholder="Ex.: 2022 – atual"
              />
            </label>
            <label className="career-wide">
              Descrição / resultados confirmados
              <textarea
                rows={4}
                value={e.description}
                onChange={(event) =>
                  update(index, { description: event.target.value })
                }
              />
            </label>
            <label className="career-wide">
              Link
              <input
                type="url"
                value={e.url}
                onChange={(event) => update(index, { url: event.target.value })}
              />
            </label>
          </div>
          <div className="row">
            <button
              type="button"
              className="icon-button"
              aria-label={`Subir ${e.title}`}
              onClick={() => move(index, -1)}
              disabled={index === 0}
            >
              <ArrowUp size={14} />
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label={`Descer ${e.title}`}
              onClick={() => move(index, 1)}
              disabled={index === entries.length - 1}
            >
              <ArrowDown size={14} />
            </button>
            <button
              type="button"
              className="career-cell-link"
              onClick={() => onChange(entries.filter((_, i) => i !== index))}
            >
              Remover seção
            </button>
          </div>
        </details>
      ))}
      <button
        type="button"
        className="button-secondary"
        onClick={() =>
          onChange([
            ...entries,
            {
              id: crypto.randomUUID(),
              type: "EXPERIENCE",
              title: "",
              organization: "",
              period: "",
              description: "",
              url: "",
            },
          ])
        }
      >
        <Plus size={14} />
        Adicionar seção
      </button>
    </div>
  );
}
function ContactEditor({
  content,
  onChange,
}: {
  content: ProfileContent;
  onChange: (p: Partial<ProfileContent>) => void;
}) {
  return (
    <div className="career-form-grid">
      {[
        ["name", "Nome"],
        ["headline", "Título profissional"],
        ["email", "E-mail"],
        ["phone", "Telefone"],
        ["location", "Localização"],
        ["website", "Portfólio / LinkedIn"],
      ].map(([key, label]) => (
        <label key={key}>
          {label}
          <input
            type={
              key === "email" ? "email" : key === "website" ? "url" : "text"
            }
            value={content[key as "name"]}
            onChange={(e) => onChange({ [key]: e.target.value })}
          />
        </label>
      ))}
    </div>
  );
}
function BaseProfileEditor({ data }: { data: CareerData }) {
  const [content, setContent] = useState<ProfileContent>(
    profileContentSchema.safeParse(data.profile?.content).data ?? emptyProfile,
  );
  return (
    <CareerForm
      submit={() =>
        saveProfileAction({ revision: data.profile?.revision ?? 0, content })
      }
    >
      <p className="career-note">
        Experiências e projetos são cadastrados uma vez. Cada currículo escolhe
        as seções que utiliza; versões já enviadas ficam preservadas.
      </p>
      <ContactEditor
        content={content}
        onChange={(p) => setContent({ ...content, ...p })}
      />
      <label>
        Perfil profissional
        <textarea
          rows={4}
          value={content.summary}
          onChange={(e) => setContent({ ...content, summary: e.target.value })}
        />
      </label>
      <label>
        Competências (separe por vírgula)
        <input
          value={content.skills.join(",")}
          onChange={(e) =>
            setContent({ ...content, skills: e.target.value.split(",") })
          }
        />
      </label>
      <EntryEditor
        entries={content.entries}
        onChange={(entries) => setContent({ ...content, entries })}
      />
    </CareerForm>
  );
}
export function ResumeWorkspace({ data }: { data: CareerData }) {
  const params = useSearchParams(),
    canWrite = useFinanceWriteAccess();
  const [selected, setSelected] = useState<string | null>(
      data.resumes[0]?.id ?? null,
    ),
    [newResume, setNewResume] = useState(
      params.get("new") === "1" || !data.resumes.length,
    ),
    [search, setSearch] = useState("");
  const current = data.resumes.find((r) => r.id === selected);
  return (
    <div className="career-resume-workspace">
      <aside className="career-library">
        <header>
          <h2>Biblioteca</h2>
          {canWrite && (
            <button
              className="icon-button"
              type="button"
              aria-label="Novo currículo"
              onClick={() => {
                setNewResume(true);
                setSelected(null);
              }}
            >
              <Plus size={17} />
            </button>
          )}
        </header>
        <input
          aria-label="Buscar currículos"
          placeholder="Título, stack ou idioma…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <CareerDrawer
          title="Perfil profissional base"
          trigger={canWrite ? "Editar perfil base" : "Ver perfil base"}
        >
          <BaseProfileEditor key={data.profile?.revision ?? 0} data={data} />
        </CareerDrawer>
        {data.resumes
          .filter((r) =>
            `${r.title} ${r.stack} ${r.language}`
              .toLowerCase()
              .includes(search.toLowerCase()),
          )
          .map((r) => (
            <button
              className="career-library-item"
              data-selected={r.id === selected || undefined}
              key={r.id}
              type="button"
              onClick={() => {
                if (
                  [
                    ...document.querySelectorAll('[data-career-dirty="true"]'),
                  ].some((element) =>
                    (element as HTMLElement).checkVisibility({
                      visibilityProperty: true,
                    }),
                  ) &&
                  !confirm("Descartar alterações não salvas?")
                )
                  return;
                setNewResume(false);
                setSelected(r.id);
              }}
            >
              <FileText size={17} />
              <span>
                <strong>
                  {r.title}
                  {r.isFavorite ? " ★" : ""}
                </strong>
                <small>
                  {r.stack || "Geral"} · {r.language.toUpperCase()} · v
                  {r.revision}
                </small>
                <small>
                  {r.status === "READY" ? "Pronto" : "Rascunho"} ·{" "}
                  {dateLabel(r.updatedAt)}
                </small>
              </span>
            </button>
          ))}
        {!data.resumes.length && (
          <p className="career-note">
            Comece pelo perfil base ou crie um currículo independente.
          </p>
        )}
      </aside>
      <ResumeEditor
        key={current?.id ?? "new"}
        row={newResume ? undefined : current}
        data={data}
        onCreated={(id) => {
          setSelected(id);
          setNewResume(false);
        }}
      />
    </div>
  );
}
function ResumeEditor({
  row,
  data,
  onCreated,
}: {
  row?: ResumeRow;
  data: CareerData;
  onCreated: (id: string) => void;
}) {
  const formId = useId();
  const canWrite = useFinanceWriteAccess(),
    base =
      profileContentSchema.safeParse(data.profile?.content).data ??
      emptyProfile;
  const [content, setContent] = useState<ResumeContent>(
      row ? resumeContentSchema.parse(row.content) : baseResume(),
    ),
    [title, setTitle] = useState(row?.title ?? ""),
    [stack, setStack] = useState(row?.stack ?? ""),
    [language, setLanguage] = useState(row?.language ?? "pt"),
    [template, setTemplate] = useState(row?.template ?? "CLASSIC"),
    [spacing, setSpacing] = useState(row?.spacing ?? "NORMAL"),
    [status, setStatus] = useState(row?.status ?? "DRAFT"),
    [favorite, setFavorite] = useState(row?.isFavorite ?? false),
    [notes, setNotes] = useState(row?.notes ?? ""),
    [tags, setTags] = useState(row?.tags.join(",") ?? ""),
    [revision, setRevision] = useState(row?.revision),
    [compare, setCompare] = useState(""),
    [preview, setPreview] = useState(""),
    [pages, setPages] = useState(0),
    [exportError, setExportError] = useState("");
  const resolved = resolveResume(content, base),
    settings = { language, template, spacing },
    payload = {
      id: row?.id,
      revision,
      title,
      stack,
      language,
      status,
      isFavorite: favorite,
      tags: tags
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      notes,
      template,
      spacing,
      content,
    };
  const fingerprint = JSON.stringify({ resolved, settings });
  useEffect(() => {
    let url = "",
      cancelled = false;
    const timeout = setTimeout(async () => {
      try {
        const { buildResumePdf } = await import("./resume-pdf");
        const built = buildResumePdf(
          JSON.parse(fingerprint).resolved,
          JSON.parse(fingerprint).settings,
        );
        url = URL.createObjectURL(built.pdf.output("blob"));
        if (!cancelled) {
          setPreview(url);
          setPages(built.pages);
        }
      } catch {
        if (!cancelled)
          setExportError(
            "Não foi possível gerar o PDF. Revise o conteúdo e tente novamente.",
          );
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      if (url) URL.revokeObjectURL(url);
    };
  }, [fingerprint]);
  const old = row?.versions.find((v) => v.id === compare),
    oldContent = old ? profileContentSchema.parse(old.content) : null;
  const update = (patch: Partial<ResumeContent>) =>
    setContent({ ...content, ...patch });
  return (
    <div className="career-resume-editor">
      <div className="career-editor-main">
        <CareerForm
          id={formId}
          submit={async () => {
            const result = await saveResumeAction(payload);
            if ("id" in result && result.id) {
              setRevision((revision ?? 0) + 1);
              onCreated(result.id);
            }
            return result;
          }}
          saveLabel="Salvar nova versão"
        >
          <div className="career-form-grid">
            <label className="career-wide">
              Título do currículo
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Frontend Angular · português"
              />
            </label>
            <label>
              Stack / área
              <input
                value={stack}
                onChange={(e) => setStack(e.target.value)}
                list="career-resume-stacks"
              />
              <datalist id="career-resume-stacks">
                {[
                  "Angular",
                  "React / Next.js",
                  ".NET / C# + Angular",
                  "React + Node",
                  "React Native",
                  "Python / FastAPI",
                  "Full Stack",
                  "Geral",
                ].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </datalist>
            </label>
            <label>
              Idioma
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="pt">Português</option>
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </label>
            <label>
              Template
              <select
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
              >
                <option value="CLASSIC">Clássico · uma coluna</option>
                <option value="EDITORIAL">
                  Editorial · títulos destacados
                </option>
              </select>
            </label>
            <label>
              Espaçamento
              <select
                value={spacing}
                onChange={(e) => setSpacing(e.target.value)}
              >
                <option value="COMPACT">Compacto</option>
                <option value="NORMAL">Normal</option>
                <option value="AIRY">Amplo</option>
              </select>
            </label>
            <label>
              Situação
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="DRAFT">Rascunho</option>
                <option value="READY">Pronto para enviar</option>
              </select>
            </label>
            <label className="career-check">
              <input
                type="checkbox"
                checked={favorite}
                onChange={(e) => setFavorite(e.target.checked)}
              />
              Favorito
            </label>
          </div>
          <details className="career-disclosure" open>
            <summary>Dados pessoais e apresentação</summary>
            <label className="career-check">
              <input
                type="checkbox"
                checked={content.useBaseContact}
                onChange={(e) => update({ useBaseContact: e.target.checked })}
              />
              Usar contato do perfil base
            </label>
            {!content.useBaseContact && (
              <ContactEditor content={content} onChange={update} />
            )}
            <label>
              Resumo focado nesta oportunidade
              <textarea
                rows={4}
                value={content.summary}
                onChange={(e) => update({ summary: e.target.value })}
              />
            </label>
            <label className="career-check">
              <input
                type="checkbox"
                checked={content.useBaseSkills}
                onChange={(e) => update({ useBaseSkills: e.target.checked })}
              />
              Usar competências do perfil base
            </label>
            {!content.useBaseSkills && (
              <label>
                Competências
                <input
                  value={content.skills.join(",")}
                  onChange={(e) =>
                    update({ skills: e.target.value.split(",") })
                  }
                />
              </label>
            )}
          </details>
          <details className="career-disclosure" open>
            <summary>Seções reutilizadas do perfil</summary>
            {base.entries.length ? (
              base.entries.map((e) => (
                <label className="career-check" key={e.id}>
                  <input
                    type="checkbox"
                    checked={content.baseEntryIds.includes(e.id)}
                    onChange={(event) =>
                      update({
                        baseEntryIds: event.target.checked
                          ? [...content.baseEntryIds, e.id]
                          : content.baseEntryIds.filter((id) => id !== e.id),
                      })
                    }
                  />
                  {e.title} · {e.organization}
                </label>
              ))
            ) : (
              <p className="career-note">
                Cadastre experiências no perfil base ou adicione seções próprias
                abaixo.
              </p>
            )}
          </details>
          <EntryEditor
            entries={content.entries}
            onChange={(entries) => update({ entries })}
          />
          <details className="career-disclosure">
            <summary>Notas e tags internas</summary>
            <label>
              Notas
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </label>
            <label>
              Tags
              <input value={tags} onChange={(e) => setTags(e.target.value)} />
            </label>
          </details>
        </CareerForm>
        <div className="career-resume-actions">
          {canWrite && (
            <button type="submit" form={formId} className="button">
              Salvar nova versão
            </button>
          )}
          <a
            className="button-secondary"
            href={preview || undefined}
            download="curriculo.pdf"
            aria-disabled={!preview}
          >
            <Download size={14} />
            PDF
          </a>
          <button
            type="button"
            className="button-secondary"
            onClick={() => {
              const blob = new Blob([resumeMarkdown(resolved, language)], {
                  type: "text/markdown;charset=utf-8",
                }),
                url = URL.createObjectURL(blob),
                a = document.createElement("a");
              a.href = url;
              a.download = "curriculo.md";
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }}
          >
            Baixar Markdown
          </button>
          {row && canWrite && (
            <button
              type="button"
              className="button-secondary"
              onClick={async () => {
                const result = await saveResumeAction({
                  ...payload,
                  id: undefined,
                  revision: undefined,
                  title: title + " · cópia",
                });
                if ("id" in result && result.id) onCreated(result.id);
                if (result.error) setExportError(result.error);
              }}
            >
              <Copy size={14} />
              Usar como base
            </button>
          )}
        </div>
        {exportError && (
          <p role="alert" className="form-error">
            {exportError}
          </p>
        )}
        {row && (
          <section className="career-version-list">
            <h3>Versões preservadas</h3>
            <p className="career-note">
              Cada candidatura mantém a versão selecionada no momento do envio.
            </p>
            <select
              aria-label="Comparar versão anterior"
              value={compare}
              onChange={(e) => setCompare(e.target.value)}
            >
              <option value="">Comparar com uma versão…</option>
              {row.versions.map((v) => (
                <option value={v.id} key={v.id}>
                  v{v.number} · {dateLabel(v.createdAt)}
                </option>
              ))}
            </select>
            {oldContent && (
              <>
                <div className="career-comparison">
                  <div>
                    <h4>Versão anterior · v{old!.number}</h4>
                    <pre>{resumeMarkdown(oldContent, language)}</pre>
                  </div>
                  <div>
                    <h4>Conteúdo atual</h4>
                    <pre>{resumeMarkdown(resolved, language)}</pre>
                  </div>
                </div>
                {canWrite && (
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() =>
                      setContent({
                        ...oldContent,
                        baseEntryIds: [],
                        useBaseContact: false,
                        useBaseSkills: false,
                      })
                    }
                  >
                    Usar esta versão no editor
                  </button>
                )}
                <a
                  className="button-secondary"
                  download="curriculo-versao.pdf"
                  href={`/api/career/resumes/${old!.id}`}
                >
                  PDF desta versão
                </a>
              </>
            )}
          </section>
        )}
      </div>
      <aside className="career-document-preview">
        <header>
          <div>
            <Eye size={15} />
            <strong>Prévia real do PDF</strong>
          </div>
          <span>{pages ? `${pages} página(s)` : "Preparando…"}</span>
        </header>
        {preview ? (
          <iframe
            title="Prévia do currículo em PDF"
            src={preview + "#toolbar=0&navpanes=0&view=FitH"}
          />
        ) : (
          <CareerEmpty
            title="Seu currículo começa pelo conteúdo"
            description="Edite o perfil e as experiências para ver o documento aqui."
          />
        )}
        <p className="career-note">
          Texto selecionável, links clicáveis e layout de uma coluna. Sem
          pontuação ATS artificial.
        </p>
      </aside>
    </div>
  );
}
