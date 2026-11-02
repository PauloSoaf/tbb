"use client";
import { useState } from "react";
import { Star, Plus, ExternalLink } from "lucide-react";
import { useFinanceWriteAccess } from "@/features/finance/FinanceWriteAccess";
import type { CareerData } from "./queries";
import { CareerForm, CareerDrawer, CareerEmpty, SafeLink, field } from "./ui";
import {
  saveLinkAction,
  removeLinkAction,
  saveCompanyDetailsAction,
  addSuggestedLinksAction,
} from "./mutations";
import { CompanyForm, ContactForm, DocumentForm } from "./forms";

export function CareerResources({
  data,
  section,
}: {
  data: CareerData;
  section: string;
}) {
  const [search, setSearch] = useState(""),
    [type, setType] = useState(""),
    [favorites, setFavorites] = useState(false),
    canWrite = useFinanceWriteAccess();
  if (section === "companies")
    return (
      <section className="career-grid-panel">
        <header className="career-section-heading">
          <div>
            <h2>Empresas que merecem seu próximo passo</h2>
            <p>
              Favoritos, prioridade e páginas de carreiras junto ao histórico de
              candidaturas.
            </p>
          </div>
          {canWrite && (
            <CareerDrawer
              title="Adicionar empresa"
              trigger={
                <>
                  <Plus size={14} />
                  Empresa
                </>
              }
            >
              <CompanyForm />
            </CareerDrawer>
          )}
        </header>
        <div className="career-resource-list">
          {data.companies.map((c) => (
            <article key={c.id}>
              <span className="career-company-mark">{c.name.slice(0, 2)}</span>
              <div>
                <h3>
                  {c.name}
                  {c.isFavorite ? " ★" : ""}
                </h3>
                <p>
                  {c.industry || "Empresa-alvo"} · {c._count.applications}{" "}
                  candidatura(s) · prioridade {c.priority}
                </p>
                <small>
                  {
                    (
                      {
                        WATCHING: "Quero acompanhar",
                        APPLIED: "Candidatura enviada",
                        INTERVIEW: "Em entrevista",
                        NOT_INTERESTED: "Sem interesse",
                      } as Record<string, string>
                    )[c.trackingStatus]
                  }
                </small>
              </div>
              <SafeLink
                href={c.careersUrl || c.website}
                className="button-secondary"
              >
                Carreiras ↗
              </SafeLink>
              <CareerDrawer
                title={c.name}
                trigger={canWrite ? "Editar" : "Detalhes"}
              >
                <CareerForm
                  submit={(fd) =>
                    saveCompanyDetailsAction({
                      id: c.id,
                      name: field(fd, "name"),
                      website: field(fd, "website"),
                      careersUrl: field(fd, "careersUrl"),
                      industry: field(fd, "industry"),
                      notes: field(fd, "notes"),
                      priority: Number(field(fd, "priority")),
                      trackingStatus: field(fd, "trackingStatus"),
                      isFavorite: fd.get("isFavorite") === "on",
                    })
                  }
                >
                  <label>
                    Nome
                    <input name="name" defaultValue={c.name} required />
                  </label>
                  <label>
                    Site
                    <input
                      type="url"
                      name="website"
                      defaultValue={c.website ?? ""}
                    />
                  </label>
                  <label>
                    Página de carreiras
                    <input
                      type="url"
                      name="careersUrl"
                      defaultValue={c.careersUrl ?? ""}
                    />
                  </label>
                  <label>
                    Área de interesse
                    <input name="industry" defaultValue={c.industry ?? ""} />
                  </label>
                  <label>
                    Prioridade
                    <select name="priority" defaultValue={c.priority}>
                      <option value="1">Alta</option>
                      <option value="2">Normal</option>
                      <option value="3">Baixa</option>
                    </select>
                  </label>
                  <label>
                    Acompanhamento
                    <select
                      name="trackingStatus"
                      defaultValue={c.trackingStatus}
                    >
                      <option value="WATCHING">Quero acompanhar</option>
                      <option value="APPLIED">Aplicada</option>
                      <option value="INTERVIEW">Em entrevista</option>
                      <option value="NOT_INTERESTED">Sem interesse</option>
                    </select>
                  </label>
                  <label className="career-check">
                    <input
                      type="checkbox"
                      name="isFavorite"
                      defaultChecked={c.isFavorite}
                    />
                    Favorita
                  </label>
                  <label>
                    Notas
                    <textarea
                      name="notes"
                      defaultValue={c.notes ?? ""}
                      rows={4}
                    />
                  </label>
                </CareerForm>
              </CareerDrawer>
            </article>
          ))}
        </div>
        {!data.companies.length && (
          <CareerEmpty
            title="Quais empresas fazem sentido para você?"
            description="Cadastre empresas-alvo ou crie uma empresa ao adicionar sua primeira vaga."
          />
        )}
      </section>
    );
  if (section === "contacts" || section === "documents")
    return (
      <section className="career-grid-panel">
        <header className="career-section-heading">
          <h2>
            {section === "contacts"
              ? "Sua rede de contatos"
              : "Documentos e links anteriores"}
          </h2>
          {canWrite && (
            <CareerDrawer
              title={
                section === "contacts"
                  ? "Adicionar contato"
                  : "Vincular documento"
              }
              trigger="Adicionar"
            >
              {section === "contacts" ? (
                <ContactForm companies={data.companies} />
              ) : (
                <DocumentForm applications={data.applications} />
              )}
            </CareerDrawer>
          )}
        </header>
        <div className="career-resource-list">
          {section === "contacts"
            ? data.contacts.map((c) => (
                <article key={c.id}>
                  <div>
                    <h3>{c.name}</h3>
                    <p>
                      {c.role} · {c.company?.name}
                    </p>
                  </div>
                  {c.email && <a href={`mailto:${c.email}`}>{c.email}</a>}
                </article>
              ))
            : data.documents.map((d) => (
                <article key={d.id}>
                  <div>
                    <h3>{d.name}</h3>
                    <small>{d.type}</small>
                  </div>
                  <SafeLink href={d.url} className="button-secondary">
                    Abrir ↗
                  </SafeLink>
                </article>
              ))}
        </div>
        {!(section === "contacts"
          ? data.contacts.length
          : data.documents.length) && (
          <CareerEmpty
            title="Tudo começa com uma conexão"
            description="Guarde contatos profissionais e materiais que ajudam na próxima oportunidade."
          />
        )}
      </section>
    );
  const links = data.links.filter(
    (l) =>
      (!type || l.type === type) &&
      (!favorites || l.isFavorite) &&
      `${l.title} ${l.stack} ${l.notes}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <section className="career-grid-panel">
      <header className="career-section-heading">
        <div>
          <h2>Atalhos para a próxima oportunidade</h2>
          <p>Sites, empresas e materiais que você escolheu acompanhar.</p>
        </div>
        {canWrite && (
          <CareerDrawer
            title="Adicionar link útil"
            trigger={
              <>
                <Plus size={14} />
                Adicionar link
              </>
            }
          >
            <UsefulLinkForm />
          </CareerDrawer>
        )}
      </header>
      <div className="career-grid-toolbar">
        <input
          aria-label="Buscar links"
          placeholder="Buscar site, stack ou nota…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="Tipo de link"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="">Todos os tipos</option>
          <option value="JOB_BOARD">Sites de vaga</option>
          <option value="COMPANY">Carreiras de empresas</option>
          <option value="RESOURCE">Material de apoio</option>
        </select>
        <button
          type="button"
          className="button-secondary"
          aria-pressed={favorites}
          onClick={() => setFavorites(!favorites)}
        >
          <Star size={14} />
          Favoritos
        </button>
      </div>
      <div className="career-resource-cards">
        {links.map((l) => (
          <article key={l.id}>
            <header>
              <span className="career-link-symbol">
                <ExternalLink size={18} />
              </span>
              <span className="career-eyebrow">
                {l.type === "JOB_BOARD"
                  ? "SITE DE VAGAS"
                  : l.type === "COMPANY"
                    ? "EMPRESA"
                    : "MATERIAL"}
              </span>
              {l.isFavorite && <Star size={14} />}
            </header>
            <h3>
              <SafeLink href={l.url}>{l.title} ↗</SafeLink>
            </h3>
            <p>
              {l.notes ||
                l.stack ||
                "Defina uma próxima ação e transforme a busca em candidatura."}
            </p>
            <footer>
              <span>
                Prioridade {l.priority} {l.stack ? `· ${l.stack}` : ""}
              </span>
              <CareerDrawer
                title={l.title}
                trigger={canWrite ? "Editar" : "Detalhes"}
              >
                <UsefulLinkForm key={l.revision} link={l} />
              </CareerDrawer>
            </footer>
          </article>
        ))}
      </div>
      {!links.length && (
        <CareerEmpty
          title="Seu mapa de oportunidades"
          description="Adicione os sites e páginas de carreiras que você realmente quer acompanhar."
        />
      )}
      {canWrite && !data.links.length && (
        <CareerForm
          className="career-suggestion-form"
          saveLabel="Adicionar sites sugeridos"
          submit={() => addSuggestedLinksAction()}
        >
          <p>
            Começar com LinkedIn Jobs, Gupy, Indeed, Revelo, GeekHunter e
            Programathor.
          </p>
        </CareerForm>
      )}
    </section>
  );
}
function UsefulLinkForm({ link: l }: { link?: CareerData["links"][number] }) {
  return (
    <div className="stack">
      <CareerForm
        closeOnSuccess={!l}
        submit={(fd) =>
          saveLinkAction({
            id: l?.id,
            revision: l?.revision,
            title: field(fd, "title"),
            url: field(fd, "url"),
            type: field(fd, "type"),
            stack: field(fd, "stack"),
            notes: field(fd, "notes"),
            priority: Number(field(fd, "priority")),
            isFavorite: fd.get("isFavorite") === "on",
          })
        }
      >
        <label>
          Título
          <input required name="title" defaultValue={l?.title} />
        </label>
        <label>
          Endereço
          <input
            type="url"
            required
            name="url"
            defaultValue={l?.url}
            placeholder="https://…"
          />
        </label>
        <div className="career-form-grid">
          <label>
            Tipo
            <select name="type" defaultValue={l?.type ?? "JOB_BOARD"}>
              <option value="JOB_BOARD">Site de vagas</option>
              <option value="COMPANY">Empresa</option>
              <option value="RESOURCE">Material</option>
            </select>
          </label>
          <label>
            Prioridade
            <select name="priority" defaultValue={l?.priority ?? 2}>
              <option value="1">Alta</option>
              <option value="2">Normal</option>
              <option value="3">Baixa</option>
            </select>
          </label>
        </div>
        <label>
          Área / stack
          <input name="stack" defaultValue={l?.stack} />
        </label>
        <label>
          Notas
          <textarea name="notes" rows={4} defaultValue={l?.notes ?? ""} />
        </label>
        <label className="career-check">
          <input
            type="checkbox"
            name="isFavorite"
            defaultChecked={l?.isFavorite}
          />
          Favorito
        </label>
      </CareerForm>
      {l && (
        <CareerForm
          className="stack"
          saveLabel="Remover link"
          submit={() =>
            window.confirm("Remover este atalho? As candidaturas permanecem.")
              ? removeLinkAction(l.id)
              : Promise.resolve({ error: "Remoção cancelada." })
          }
        >
          <p className="career-note">Remove apenas este atalho.</p>
        </CareerForm>
      )}
    </div>
  );
}
