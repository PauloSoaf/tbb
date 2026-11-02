"use client";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useFinanceWriteAccess } from "@/features/finance/FinanceWriteAccess";
import { addDays, dayKey, startOfWeek, formatDay } from "@/lib/dates";
import type { CareerData } from "./queries";
import { stageLabels, stages } from "./domain";
import { CareerForm, CareerDrawer, field, dateLabel } from "./ui";
import { saveGoalAction } from "./mutations";
export const goalMetricLabels: Record<string, string> = {
  APPLICATIONS: "Candidaturas enviadas",
  INTERVIEWS: "Entrevistas agendadas",
  FOLLOW_UPS: "Follow-ups enviados",
  RESUMES: "Versões de currículo revisadas",
  PRACTICE: "Treinos concluídos",
  STUDY_MINUTES: "Minutos de prática",
  COMPANIES: "Empresas acompanhadas",
  MANUAL: "Progresso manual",
};
export function GoalForm({
  data,
  goal: g,
}: {
  data: CareerData;
  goal?: CareerData["goals"][number];
}) {
  return (
    <CareerForm
      closeOnSuccess={!g}
      submit={(fd) =>
        saveGoalAction({
          id: g?.id,
          revision: g?.revision,
          title: field(fd, "title"),
          metric: field(fd, "metric"),
          target: Number(field(fd, "target")),
          manualProgress: Number(field(fd, "manualProgress")),
          startsOn: field(fd, "startsOn"),
          endsOn: field(fd, "endsOn"),
        })
      }
    >
      <label>
        O que você quer alcançar?
        <input
          name="title"
          required
          defaultValue={g?.title}
          placeholder="Ex.: enviar candidaturas com currículo revisado"
        />
      </label>
      <label>
        Medir por
        <select name="metric" defaultValue={g?.metric ?? "APPLICATIONS"}>
          {Object.entries(goalMetricLabels).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <div className="career-form-grid">
        <label>
          Meta
          <input
            type="number"
            min={1}
            max={100000}
            name="target"
            defaultValue={g?.target ?? 20}
            required
          />
        </label>
        <label>
          Progresso manual (só metas manuais)
          <input
            type="number"
            name="manualProgress"
            min={0}
            max={100000}
            defaultValue={g?.manualProgress ?? 0}
          />
        </label>
        <label>
          Início
          <input
            type="date"
            name="startsOn"
            defaultValue={g?.startsOn ?? data.today}
            required
          />
        </label>
        <label>
          Prazo
          <input
            type="date"
            name="endsOn"
            defaultValue={g?.endsOn ?? addDays(data.today, 30)}
            required
          />
        </label>
      </div>
      <p className="career-note">
        Nas métricas automáticas, o progresso vem das ações registradas dentro
        do período da meta.
      </p>
    </CareerForm>
  );
}
export function GoalsPanel({
  data,
  compact = false,
}: {
  data: CareerData;
  compact?: boolean;
}) {
  const canWrite = useFinanceWriteAccess();
  return (
    <section className="career-goals">
      <header>
        <div>
          <span className="career-eyebrow">CONSISTÊNCIA, UM PASSO POR VEZ</span>
          <h2>{compact ? "Suas metas" : "Metas de carreira"}</h2>
        </div>
        {canWrite && (
          <CareerDrawer
            title="Criar meta de carreira"
            trigger={<Plus size={15} />}
            className="icon-button"
          >
            <GoalForm data={data} />
          </CareerDrawer>
        )}
      </header>
      {(compact
        ? data.goals.filter((g) => g.state !== "COMPLETE").slice(0, 3)
        : data.goals
      ).map((g) => (
        <article className="career-goal" key={g.id}>
          <div className="row justify-between">
            <h3>{g.title}</h3>
            <strong>
              {g.progress}/{g.target}
            </strong>
          </div>
          <progress
            value={Math.min(g.progress, g.target)}
            max={g.target}
            aria-label={g.title}
          />
          <footer>
            <span data-goal-state={g.state}>
              {g.state === "COMPLETE"
                ? "Concluída"
                : g.state === "OVERDUE"
                  ? "Prazo encerrado"
                  : "Em andamento"}{" "}
              · {g.percent}%
            </span>
            <CareerDrawer
              title={g.title}
              trigger={canWrite ? "Editar" : "Detalhes"}
              className="career-cell-link"
            >
              <GoalForm data={data} goal={g} />
            </CareerDrawer>
          </footer>
          <small>Até {dateLabel(g.endsOn)}</small>
        </article>
      ))}
      {!data.goals.length && (
        <p className="career-note">
          Defina uma meta possível para esta semana. O progresso acompanha suas
          ações reais.
        </p>
      )}
      {compact && (
        <Link className="career-cell-link" href="/career/statistics">
          Ver metas e progresso ↗
        </Link>
      )}
    </section>
  );
}
export function CareerStatistics({ data }: { data: CareerData }) {
  const weeks = Array.from({ length: 8 }, (_, index) => {
    const from = addDays(startOfWeek(data.today), (index - 7) * 7),
      to = addDays(from, 6);
    return {
      day: from,
      value: data.all.filter(
        (a) =>
          a.appliedAt &&
          dayKey(new Date(a.appliedAt), data.timeZone) >= from &&
          dayKey(new Date(a.appliedAt), data.timeZone) <= to,
      ).length,
    };
  });
  const max = Math.max(1, ...weeks.map((w) => w.value)),
    counts = stages
      .map((stage) => ({
        label: stageLabels[stage],
        value: data.all.filter((a) => a.status === stage).length,
      }))
      .filter((s) => s.value > 0),
    responses = [
      { label: "Positivas", n: data.stats.positive, color: "var(--success)" },
      { label: "Negativas", n: data.stats.negative, color: "var(--danger)" },
      {
        label: "Outros retornos / sem resposta",
        n: Math.max(
          0,
          data.all.length - data.stats.positive - data.stats.negative,
        ),
        color: "var(--muted-foreground)",
      },
    ];
  return (
    <div className="career-statistics">
      <div className="career-stat-strip">
        {[
          ["Candidaturas nesta semana", data.stats.appliedThisWeek],
          ["Candidaturas neste mês", data.stats.appliedThisMonth],
          ["Empresas acompanhadas", data.stats.companies],
          ["Versões enviadas", data.stats.resumesUsed],
          ["Dias sem candidatar", data.stats.daysWithoutApplying ?? "—"],
          [
            "Metas concluídas",
            data.goals.filter((g) => g.state === "COMPLETE").length,
          ],
        ].map(([l, v]) => (
          <div key={l}>
            <span>{l}</span>
            <strong>{v}</strong>
          </div>
        ))}
      </div>
      <div className="career-analytics-grid">
        <section className="career-chart-panel">
          <header>
            <h2>Ritmo de candidaturas</h2>
            <p>Envios por semana · últimas oito semanas</p>
          </header>
          <svg
            viewBox="0 0 620 200"
            role="img"
            aria-label={weeks
              .map((w) => `${formatDay(w.day)}: ${w.value}`)
              .join("; ")}
          >
            <line x1="20" x2="600" y1="155" y2="155" stroke="var(--border)" />
            <polyline
              points={weeks
                .map((w, i) => `${30 + i * 80},${150 - (w.value / max) * 120}`)
                .join(" ")}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="2.5"
            />
            {weeks.map((w, i) => (
              <g key={w.day}>
                <circle
                  cx={30 + i * 80}
                  cy={150 - (w.value / max) * 120}
                  r="4"
                  fill="var(--primary)"
                />
                <text
                  x={30 + i * 80}
                  y={140 - (w.value / max) * 120}
                  textAnchor="middle"
                  fill="var(--foreground)"
                  fontSize="11"
                >
                  {w.value}
                </text>
                <text
                  x={30 + i * 80}
                  y="180"
                  textAnchor="middle"
                  fill="var(--muted-foreground)"
                  fontSize="10"
                >
                  {formatDay(w.day)}
                </text>
              </g>
            ))}
          </svg>
        </section>
        <section className="career-chart-panel">
          <header>
            <h2>Etapas atuais</h2>
            <p>Onde cada processo está agora</p>
          </header>
          {counts.length ? (
            counts.map((c) => (
              <div className="career-horizontal-metric" key={c.label}>
                <span>{c.label}</span>
                <progress
                  value={c.value}
                  max={Math.max(...counts.map((c) => c.value), 1)}
                  aria-label={c.label}
                />
                <strong>{c.value}</strong>
              </div>
            ))
          ) : (
            <p className="career-note">
              Suas etapas aparecem depois da primeira vaga.
            </p>
          )}
        </section>
        <section className="career-chart-panel">
          <header>
            <h2>Retornos recebidos</h2>
            <p>O silêncio também faz parte do acompanhamento.</p>
          </header>
          <div className="career-response-chart">
            <svg
              viewBox="0 0 42 42"
              role="img"
              aria-label={responses.map((r) => `${r.label}: ${r.n}`).join("; ")}
            >
              <circle
                cx="21"
                cy="21"
                r="15.915"
                fill="none"
                stroke="var(--muted)"
                strokeWidth="5"
              />
              {responses.map((r, i) => {
                const size = (r.n / Math.max(data.all.length, 1)) * 100,
                  offset =
                    25 -
                    responses
                      .slice(0, i)
                      .reduce(
                        (sum, a) =>
                          sum + (a.n / Math.max(data.all.length, 1)) * 100,
                        0,
                      );
                return (
                  <circle
                    key={r.label}
                    cx="21"
                    cy="21"
                    r="15.915"
                    fill="none"
                    stroke={r.color}
                    strokeWidth="5"
                    strokeDasharray={`${size} ${100 - size}`}
                    strokeDashoffset={offset}
                  />
                );
              })}
            </svg>
            <div>
              {responses.map((r) => (
                <p key={r.label}>
                  <i style={{ background: r.color }} />
                  {r.label}
                  <strong>{r.n}</strong>
                </p>
              ))}
            </div>
          </div>
        </section>
        <section className="career-chart-panel">
          <header>
            <h2>Funil e conversões</h2>
            <p>Histórico preservado mesmo após o encerramento.</p>
          </header>
          {[
            ["Vagas cadastradas", data.all.length],
            ["Candidaturas enviadas", data.stats.applied],
            ["Entrevistas", data.stats.interviews],
            ["Ofertas", data.stats.offers],
          ].map(([l, v]) => (
            <div className="career-horizontal-metric" key={l}>
              <span>{l}</span>
              <progress
                value={Number(v)}
                max={Math.max(data.all.length, 1)}
                aria-label={String(l)}
              />
              <strong>{v}</strong>
            </div>
          ))}
          <div className="career-conversions">
            <span>
              Retorno <strong>{data.stats.responseRate}%</strong>
            </span>
            <span>
              Aplicação → entrevista{" "}
              <strong>{data.stats.interviewRate}%</strong>
            </span>
            <span>
              Entrevista → oferta <strong>{data.stats.offerRate}%</strong>
            </span>
          </div>
        </section>
      </div>
      <GoalsPanel data={data} />
    </div>
  );
}
