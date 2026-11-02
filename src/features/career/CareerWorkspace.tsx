"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  Plus,
  CalendarPlus,
  FilePlus2,
  PanelRightClose,
  PanelRightOpen,
  ArrowUpRight,
} from "lucide-react";
import { FinanceWriteProvider } from "@/features/finance/FinanceWriteAccess";
import type { CareerData } from "./queries";
import { OpportunityGrid } from "./OpportunityGrid";
import { OpportunityForm } from "./OpportunityForm";
import { CareerCalendar } from "./CareerCalendar";
import { ResumeWorkspace } from "./ResumeWorkspace";
import { PitchWorkspace } from "./PitchWorkspace";
import { CareerResources } from "./Resources";
import { CareerStatistics, GoalsPanel } from "./CareerStatistics";
import { CareerDrawer, SafeLink } from "./ui";
import { EventForm } from "./EventForm";
import { dayKey } from "@/lib/dates";
const sections = {
  overview: "Visão geral",
  applications: "Vagas",
  calendar: "Calendário",
  resumes: "Currículos",
  pitch: "Preparação",
  links: "Links úteis",
  statistics: "Metas e estatísticas",
};
export function CareerWorkspace({
  data,
  section,
  canWrite,
}: {
  data: CareerData;
  section: string;
  canWrite: boolean;
}) {
  const params = useSearchParams();
  const [sideOpen, setSideOpen] = useState(true),
    overview = section === "overview",
    pipeline = overview || section === "applications";
  const labels: Record<string, string> = {
    ...sections,
    companies: "Empresas",
    contacts: "Contatos",
    documents: "Documentos",
    interviews: "Entrevistas",
  };
  const nextInterview = data.interviews.find(
    (i) =>
      ["PENDING", "RESCHEDULED"].includes(i.status) &&
      dayKey(new Date(i.scheduledAt), data.timeZone) >= data.today,
  );
  return (
    <FinanceWriteProvider canWrite={canWrite}>
      <div className="career-workspace">
        <header className="career-page-heading">
          <div>
            <span className="career-eyebrow">
              CARREIRA · CONSTRUA SEU PRÓXIMO PASSO
            </span>
            <h1>{overview ? "Oportunidades com direção." : labels[section]}</h1>
            <p>
              {overview
                ? "Sua busca, suas conversas e o próximo passo — no mesmo lugar."
                : section === "resumes"
                  ? "Seu repertório profissional, organizado para cada oportunidade."
                  : section === "pitch"
                    ? "Transforme experiências reais em conversas claras."
                    : section === "calendar"
                      ? "Entrevistas, prazos e preparação, sem perder o contexto."
                      : "Clareza para transformar intenção em oportunidade."}
            </p>
          </div>
          {canWrite && (
            <div className="career-header-actions">
              <CareerDrawer
                title="Adicionar vaga"
                trigger={
                  <>
                    <Plus size={15} />
                    Adicionar vaga
                  </>
                }
                className="button"
                open={params.get("action") === "new"}
              >
                <OpportunityForm data={data} />
              </CareerDrawer>
              <CareerDrawer
                title="Adicionar entrevista ou evento"
                trigger={
                  <>
                    <CalendarPlus size={15} />
                    <span>Entrevista</span>
                  </>
                }
              >
                <EventForm data={data} />
              </CareerDrawer>
              <Link className="button-secondary" href="/career/resumes?new=1">
                <FilePlus2 size={15} />
                <span>Currículo</span>
              </Link>
            </div>
          )}
        </header>
        <nav className="career-section-nav" aria-label="Área de carreira">
          {Object.entries(sections).map(([id, label]) => (
            <Link
              key={id}
              href={id === "overview" ? "/career" : `/career/${id}`}
              aria-current={section === id ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
          <details>
            <summary>Mais</summary>
            <div>
              {[
                ["companies", "Empresas"],
                ["contacts", "Contatos"],
                ["documents", "Documentos anteriores"],
              ].map(([id, label]) => (
                <Link key={id} href={`/career/${id}`}>
                  {label}
                </Link>
              ))}
            </div>
          </details>
        </nav>
        {pipeline && (
          <>
            <div className="career-stat-strip">
              {[
                ["Vagas salvas", data.stats.saved],
                ["Candidaturas", data.stats.applied],
                ["Positivas", data.stats.positive],
                ["Negativas", data.stats.negative],
                ["Entrevistas", data.stats.interviews],
                ["Ofertas", data.stats.offers],
              ].map(([l, v]) => (
                <div key={l}>
                  <span>{l}</span>
                  <strong>{v}</strong>
                </div>
              ))}
            </div>
            <div className="career-operational-strip">
              <span>
                <b>{data.attention.due.length}</b> follow-up(s) pendente(s)
              </span>
              <span>
                Esta semana: <b>{data.stats.appliedThisWeek}</b> candidatura(s)
              </span>
              {nextInterview && (
                <Link
                  href={`/career/calendar?day=${dayKey(new Date(nextInterview.scheduledAt), data.timeZone)}&month=${dayKey(new Date(nextInterview.scheduledAt), data.timeZone).slice(0, 7)}`}
                >
                  Próxima conversa:{" "}
                  <b>{nextInterview.application.company.name}</b> ·{" "}
                  {new Intl.DateTimeFormat("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: data.timeZone,
                  }).format(new Date(nextInterview.scheduledAt))}
                </Link>
              )}
              {overview && (
                <button
                  type="button"
                  className="career-cell-link"
                  onClick={() => setSideOpen(!sideOpen)}
                  aria-expanded={sideOpen}
                >
                  {sideOpen ? (
                    <PanelRightClose size={15} />
                  ) : (
                    <PanelRightOpen size={15} />
                  )}
                  Agenda e metas
                </button>
              )}
            </div>
            <div
              className={`career-overview-grid ${overview && sideOpen ? "with-side" : ""}`}
            >
              <OpportunityGrid data={data} />
              {overview && sideOpen && (
                <aside className="career-overview-side">
                  <CareerCalendar data={data} compact />
                  <CareerAttention data={data} />
                  <GoalsPanel data={data} compact />
                  <section className="career-quick-links">
                    <header>
                      <h2>Links à mão</h2>
                      <Link href="/career/links">Ver todos ↗</Link>
                    </header>
                    {data.links.slice(0, 4).map((l) => (
                      <SafeLink key={l.id} href={l.url}>
                        {l.title}
                        <ArrowUpRight size={13} />
                      </SafeLink>
                    ))}
                    {!data.links.length && (
                      <Link href="/career/links">
                        Organizar meus sites de vagas ↗
                      </Link>
                    )}
                  </section>
                </aside>
              )}
            </div>
          </>
        )}
        {(section === "calendar" || section === "interviews") && (
          <CareerCalendar data={data} />
        )}
        {section === "resumes" && (
          <ResumeWorkspace key={params.get("new") ?? "library"} data={data} />
        )}
        {section === "pitch" && <PitchWorkspace data={data} />}{" "}
        {["links", "companies", "contacts", "documents"].includes(section) && (
          <CareerResources data={data} section={section} />
        )}{" "}
        {section === "statistics" && <CareerStatistics data={data} />}
      </div>
    </FinanceWriteProvider>
  );
}
function CareerAttention({ data }: { data: CareerData }) {
  const { attention: a } = data;
  return (
    <section className="career-attention">
      <header>
        <span className="career-eyebrow">UMA COISA DE CADA VEZ</span>
        <h2>O que merece atenção</h2>
      </header>
      {[
        [
          a.due.length,
          "follow-up(s) para fazer",
          "/career/applications?attention=due",
        ],
        [
          a.stale.length,
          "processo(s) parado(s) há 10+ dias",
          "/career/applications?attention=stale",
        ],
        [
          a.deadlines.length,
          "prazo(s) nos próximos 3 dias",
          "/career/applications?attention=deadline",
        ],
        [
          a.unprepared.length,
          "entrevista(s) em até 1 dia sem preparação",
          "/career/calendar",
        ],
        [
          a.unrevised.length,
          "currículo(s) sem revisão há 60+ dias",
          "/career/resumes",
        ],
        [
          a.targetCompanies.length,
          "empresa(s)-alvo sem candidatura",
          "/career/companies",
        ],
      ]
        .filter(([n]) => Number(n) > 0)
        .map(([n, label, href]) => (
          <Link key={href} href={String(href)}>
            <strong>{n}</strong>
            <span>{label}</span>
            <ArrowUpRight size={14} />
          </Link>
        ))}
      {![
        a.due,
        a.stale,
        a.deadlines,
        a.unprepared,
        a.unrevised,
        a.targetCompanies,
      ].some((v) => v.length) && (
        <p className="career-note">
          Tudo em dia. Salve uma vaga, personalize seu currículo ou reserve
          tempo para praticar.
        </p>
      )}
    </section>
  );
}
