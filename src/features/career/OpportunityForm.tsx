"use client";
import { useState } from "react";
import { CalendarPlus, ExternalLink } from "lucide-react";
import type { CareerData, Opportunity } from "./queries";
import { stages, stageLabels } from "./domain";
import { responseLabels, responses } from "./schemas";
import { saveOpportunityAction } from "./mutations";
import { CareerForm, field, list, SafeLink, dateLabel } from "./ui";
import { EventForm } from "./EventForm";

export function OpportunityForm({
  data,
  opportunity: a,
}: {
  data: CareerData;
  opportunity?: Opportunity;
}) {
  const [company, setCompany] = useState(a?.companyId ?? "");
  const cents = (fd: FormData, key: string) =>
    field(fd, key)
      ? Math.round(Number(field(fd, key).replace(",", ".")) * 100)
      : null;
  return (
    <div className="stack">
      <CareerForm
        closeOnSuccess={!a}
        key={`${a?.id ?? "new"}:${a?.revision ?? 0}`}
        submit={async (fd) =>
          saveOpportunityAction({
            id: a?.id,
            revision: a?.revision,
            companyId: field(fd, "companyId"),
            companyName: field(fd, "companyName"),
            careersUrl: field(fd, "careersUrl"),
            jobTitle: field(fd, "jobTitle"),
            url: field(fd, "url"),
            source: field(fd, "source"),
            location: field(fd, "location"),
            workMode: field(fd, "workMode"),
            technologies: list(fd, "technologies"),
            seniority: field(fd, "seniority"),
            status: field(fd, "status"),
            response: field(fd, "response"),
            appliedOn: field(fd, "appliedOn"),
            foundOn: field(fd, "foundOn"),
            deadline: field(fd, "deadline"),
            lastContactOn: field(fd, "lastContactOn"),
            nextActionDate: field(fd, "nextActionDate"),
            nextAction: field(fd, "nextAction"),
            salaryMinCents: cents(fd, "salaryMin"),
            salaryMaxCents: cents(fd, "salaryMax"),
            notes: field(fd, "notes"),
            requirements: field(fd, "requirements"),
            coverLetter: field(fd, "coverLetter"),
            tags: list(fd, "tags"),
            resumeVersionId: field(fd, "resumeVersionId"),
          })
        }
      >
        <div className="career-form-grid">
          <label>
            Cargo
            <input
              name="jobTitle"
              required
              maxLength={300}
              defaultValue={a?.jobTitle}
              autoFocus={!a}
            />
          </label>
          <label>
            Empresa
            <select
              name="companyId"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            >
              <option value="">Nova empresa…</option>
              {data.companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {!company && (
            <>
              <label>
                Nome da empresa
                <input name="companyName" required maxLength={300} />
              </label>
              <label>
                Página de carreiras
                <input type="url" name="careersUrl" placeholder="https://…" />
              </label>
            </>
          )}
          <label className="career-wide">
            Link da vaga
            <input
              type="url"
              name="url"
              defaultValue={a?.url ?? ""}
              placeholder="https://…"
            />
          </label>
          <label>
            Etapa
            <select name="status" defaultValue={a?.status ?? "SAVED"}>
              {stages.map((s) => (
                <option key={s} value={s}>
                  {stageLabels[s]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Retorno
            <select name="response" defaultValue={a?.response ?? "NONE"}>
              {responses.map((r) => (
                <option key={r} value={r}>
                  {responseLabels[r]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Data da candidatura
            <input
              type="date"
              name="appliedOn"
              defaultValue={a?.appliedAt?.slice(0, 10) ?? ""}
            />
          </label>
          <label>
            Encontrada em
            <input
              type="date"
              name="foundOn"
              defaultValue={a?.foundOn ?? data.today}
            />
          </label>
          <label>
            Próxima ação
            <input
              name="nextAction"
              defaultValue={a?.nextAction ?? ""}
              placeholder="Ex.: conversar com recrutador"
            />
          </label>
          <label>
            Follow-up em
            <input
              type="date"
              name="nextActionDate"
              defaultValue={a?.nextActionDate ?? ""}
            />
          </label>
          <label className="career-wide">
            Currículo enviado — versão preservada
            <select
              name="resumeVersionId"
              defaultValue={a?.resumeVersionId ?? ""}
            >
              <option value="">Sem currículo vinculado</option>
              {data.resumes.flatMap((r) =>
                r.versions.map((v) => (
                  <option value={v.id} key={v.id}>
                    {v.title} · v{v.number} · {dateLabel(v.createdAt)}
                  </option>
                )),
              )}
            </select>
          </label>
          <label className="career-wide">
            Observações
            <textarea name="notes" rows={3} defaultValue={a?.notes ?? ""} />
          </label>
        </div>
        <details className="career-disclosure">
          <summary>Stack, salário, requisitos e outros detalhes</summary>
          <div className="career-form-grid">
            <label>
              Stack / área (separe por vírgula)
              <input
                name="technologies"
                defaultValue={a?.technologies.join(", ") ?? ""}
                placeholder="Angular, TypeScript"
              />
            </label>
            <label>
              Senioridade
              <input name="seniority" defaultValue={a?.seniority ?? ""} />
            </label>
            <label>
              Modalidade
              <select name="workMode" defaultValue={a?.workMode ?? "REMOTE"}>
                <option value="REMOTE">Remoto</option>
                <option value="HYBRID">Híbrido</option>
                <option value="ONSITE">Presencial</option>
              </select>
            </label>
            <label>
              Localização
              <input name="location" defaultValue={a?.location ?? ""} />
            </label>
            <label>
              Salário mínimo (R$)
              <input
                type="number"
                step="0.01"
                min="0"
                name="salaryMin"
                defaultValue={
                  a?.salaryMinCents != null ? a.salaryMinCents / 100 : ""
                }
              />
            </label>
            <label>
              Salário máximo (R$)
              <input
                type="number"
                step="0.01"
                min="0"
                name="salaryMax"
                defaultValue={
                  a?.salaryMaxCents != null ? a.salaryMaxCents / 100 : ""
                }
              />
            </label>
            <label>
              Fonte
              <input
                name="source"
                defaultValue={a?.source ?? "Outro"}
                list="career-sources"
              />
              <datalist id="career-sources">
                {[
                  "LinkedIn",
                  "Gupy",
                  "Indeed",
                  "Indicação",
                  "Site da empresa",
                ].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </datalist>
            </label>
            <label>
              Prazo da candidatura
              <input
                type="date"
                name="deadline"
                defaultValue={a?.deadline ?? ""}
              />
            </label>
            <label>
              Último contato
              <input
                type="date"
                name="lastContactOn"
                defaultValue={a?.lastContactOn ?? ""}
              />
            </label>
            <label>
              Tags
              <input name="tags" defaultValue={a?.tags.join(", ") ?? ""} />
            </label>
            <label className="career-wide">
              Descrição / requisitos
              <textarea
                name="requirements"
                rows={4}
                defaultValue={a?.requirements ?? ""}
              />
            </label>
            <label className="career-wide">
              Carta de apresentação
              <textarea
                name="coverLetter"
                rows={4}
                defaultValue={a?.coverLetter ?? ""}
              />
            </label>
          </div>
        </details>
      </CareerForm>
      {a && (
        <>
          <div className="row">
            <SafeLink href={a.url} className="button-secondary">
              Abrir vaga <ExternalLink size={13} />
            </SafeLink>
            <SafeLink
              href={a.company.careersUrl || a.company.website}
              className="button-secondary"
            >
              Carreiras da empresa ↗
            </SafeLink>
          </div>
          <details
            className="career-disclosure"
            open={a.status.includes("INTERVIEW")}
          >
            <summary>
              <CalendarPlus size={15} /> Agendar entrevista nesta vaga
            </summary>
            <EventForm data={data} applicationId={a.id} />
          </details>
          <section className="career-timeline">
            <h3>Histórico da candidatura</h3>
            {data.history
              .filter((e) => e.entityId === a.id)
              .map((e) => (
                <div key={e.id}>
                  <span className="career-timeline-dot" />
                  <div>
                    <strong>
                      {(
                        {
                          ApplicationCreated: "Vaga criada",
                          ApplicationUpdated: "Informações atualizadas",
                          ApplicationStatusChanged: "Etapa alterada",
                          FollowUpSent: "Follow-up enviado",
                          InterviewScheduled:
                            "Entrevista agendada / atualizada",
                        } as Record<string, string>
                      )[e.type] ?? e.type}
                    </strong>
                    <small>
                      {new Intl.DateTimeFormat("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                        timeZone: data.timeZone,
                      }).format(new Date(e.createdAt))}
                      {e.metadata &&
                      typeof e.metadata === "object" &&
                      !Array.isArray(e.metadata) &&
                      typeof e.metadata.to === "string" &&
                      stageLabels[e.metadata.to as keyof typeof stageLabels]
                        ? ` · ${stageLabels[e.metadata.to as keyof typeof stageLabels]}`
                        : ""}
                    </small>
                  </div>
                </div>
              ))}
          </section>
        </>
      )}
    </div>
  );
}
