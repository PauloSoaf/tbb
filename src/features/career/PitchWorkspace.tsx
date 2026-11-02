"use client";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Plus, Play, Pause, Check, BookOpen, Timer } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useFinanceWriteAccess } from "@/features/finance/FinanceWriteAccess";
import type { CareerData } from "./queries";
import { answerContentSchema, storyContentSchema } from "./schemas";
import { CareerForm, CareerEmpty, dateLabel } from "./ui";
import {
  savePreparationAction,
  seedQuestionsAction,
  practiceAction,
} from "./mutations";

export function PitchWorkspace({ data }: { data: CareerData }) {
  const [section, setSection] = useState<"answers" | "stories" | "practice">(
      "answers",
    ),
    [selected, setSelected] = useState<string | null>(
      data.answers[0]?.id ?? null,
    ),
    [newAnswer, setNewAnswer] = useState(false),
    [selectedStory, setSelectedStory] = useState<string | null>(
      data.stories[0]?.id ?? null,
    ),
    [newStory, setNewStory] = useState(false),
    [search, setSearch] = useState(""),
    [category, setCategory] = useState(""),
    canWrite = useFinanceWriteAccess(),
    params = useSearchParams();
  const selectedApplication = data.all.find(
    (a) => a.id === params.get("application"),
  );
  const current = data.answers.find((a) => a.id === selected),
    story = data.stories.find((s) => s.id === selectedStory);
  function safeSwitch(callback: () => void) {
    if (
      [...document.querySelectorAll('[data-career-dirty="true"]')].some(
        (element) =>
          (element as HTMLElement).checkVisibility({
            visibilityProperty: true,
          }),
      ) &&
      !window.confirm("Há texto não salvo. Descartar antes de trocar?")
    )
      return;
    callback();
  }
  return (
    <div className="career-preparation">
      <div className="career-preparation-intro">
        <div>
          <span className="career-eyebrow">
            HISTÓRIAS REAIS. RESPOSTAS SUAS.
          </span>
          <h2>Prepare a conversa, não um roteiro decorado.</h2>
          <p>
            Organize experiências, ensaie com intenção e registre o que precisa
            melhorar.
          </p>
        </div>
        <div className="career-segmented">
          {[
            ["answers", "Perguntas"],
            ["stories", "Histórias STAR / CAR"],
            ["practice", "Praticar"],
          ].map(([v, l]) => (
            <button
              type="button"
              key={v}
              aria-pressed={section === v}
              onClick={() => safeSwitch(() => setSection(v as typeof section))}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      {selectedApplication && (
        <div className="career-context-banner">
          Preparação para <strong>{selectedApplication.jobTitle}</strong>
          <Link href={`/career/applications?record=${selectedApplication.id}`}>
            Abrir candidatura ↗
          </Link>
        </div>
      )}
      {section === "practice" ? (
        <PracticeStudio data={data} />
      ) : (
        <div className="career-preparation-grid">
          <aside className="career-library">
            <header>
              <h3>
                {section === "answers"
                  ? "Suas perguntas"
                  : "Banco de experiências"}
              </h3>
              {canWrite && (
                <button
                  className="icon-button"
                  type="button"
                  aria-label={
                    section === "answers" ? "Nova pergunta" : "Nova história"
                  }
                  onClick={() =>
                    safeSwitch(() => {
                      if (section === "answers") {
                        setNewAnswer(true);
                        setSelected(null);
                      } else {
                        setNewStory(true);
                        setSelectedStory(null);
                      }
                    })
                  }
                >
                  <Plus size={16} />
                </button>
              )}
            </header>
            <input
              aria-label="Buscar preparação"
              placeholder="Pesquisar…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {section === "answers" ? (
              <>
                <select
                  aria-label="Categoria de perguntas"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">Todas as categorias</option>
                  {[...new Set(data.answers.map((a) => a.category))].map(
                    (c) => (
                      <option key={c}>{c}</option>
                    ),
                  )}
                </select>
                {data.answers
                  .filter(
                    (a) =>
                      (!category || a.category === category) &&
                      a.question.toLowerCase().includes(search.toLowerCase()),
                  )
                  .map((a) => (
                    <button
                      type="button"
                      className="career-library-item"
                      data-selected={a.id === selected || undefined}
                      key={a.id}
                      onClick={() =>
                        safeSwitch(() => {
                          setSelected(a.id);
                          setNewAnswer(false);
                        })
                      }
                    >
                      <span>
                        <small>{a.category}</small>
                        <strong>{a.question}</strong>
                        <small>Preparo {a.confidence}/5</small>
                      </span>
                    </button>
                  ))}
                {canWrite && (
                  <CareerForm
                    className="stack"
                    saveLabel="Adicionar perguntas sugeridas"
                    submit={() => seedQuestionsAction()}
                  >
                    <p className="career-note">
                      Uma base editável, sem respostas ou conquistas inventadas.
                    </p>
                  </CareerForm>
                )}
              </>
            ) : (
              data.stories
                .filter((s) =>
                  s.title.toLowerCase().includes(search.toLowerCase()),
                )
                .map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    className="career-library-item"
                    data-selected={s.id === selectedStory || undefined}
                    onClick={() =>
                      safeSwitch(() => {
                        setSelectedStory(s.id);
                        setNewStory(false);
                      })
                    }
                  >
                    <span>
                      <small>{s.method}</small>
                      <strong>{s.title}</strong>
                    </span>
                  </button>
                ))
            )}
          </aside>
          <main className="career-preparation-editor">
            {section === "answers" ? (
              current || newAnswer ? (
                <AnswerEditor
                  key={current?.id ?? "new"}
                  row={newAnswer ? undefined : current}
                  data={data}
                  onCreated={(id) => {
                    setSelected(id);
                    setNewAnswer(false);
                  }}
                />
              ) : (
                <CareerEmpty
                  title="Comece com uma boa pergunta"
                  description="Adicione a base de perguntas ou crie uma pergunta específica para a próxima entrevista."
                />
              )
            ) : story || newStory ? (
              <StoryEditor
                key={story?.id ?? "new"}
                row={newStory ? undefined : story}
                onCreated={(id) => {
                  setSelectedStory(id);
                  setNewStory(false);
                }}
              />
            ) : (
              <CareerEmpty
                title="Sua trajetória é a matéria-prima"
                description="Registre um projeto real, o problema, suas decisões e os resultados confirmados. A mesma história pode apoiar várias respostas."
              />
            )}
          </main>
          <aside className="career-preparation-guide">
            <BookOpen size={22} />
            <h3>Uma resposta com substância</h3>
            <ol>
              <li>Apresente o contexto em poucas frases.</li>
              <li>Explique sua responsabilidade.</li>
              <li>Mostre decisões e ações concretas.</li>
              <li>Conclua com resultados verificáveis.</li>
              <li>Registre o aprendizado.</li>
            </ol>
            <p>
              Use apenas fatos que você possa explicar. Se faltar uma métrica,
              deixe a evidência em aberto.
            </p>
            <button
              type="button"
              className="button-secondary"
              onClick={() => safeSwitch(() => setSection("practice"))}
            >
              <Timer size={15} />
              Iniciar prática
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}
function AnswerEditor({
  row,
  data,
  onCreated,
}: {
  row?: CareerData["answers"][number];
  data: CareerData;
  onCreated: (id: string) => void;
}) {
  const [content, setContent] = useState(
      answerContentSchema.parse(row?.content ?? {}),
    ),
    [question, setQuestion] = useState(row?.question ?? ""),
    [category, setCategory] = useState(row?.category ?? "Sobre mim"),
    [confidence, setConfidence] = useState(row?.confidence ?? 1),
    [storyId, setStoryId] = useState(row?.storyId ?? ""),
    [revision, setRevision] = useState(row?.revision);
  const story = data.stories.find((s) => s.id === storyId);
  return (
    <CareerForm
      saveLabel="Salvar resposta"
      submit={async () => {
        const result = await savePreparationAction("answer", {
          id: row?.id,
          revision,
          question,
          category,
          confidence,
          storyId,
          content,
        });
        if ("id" in result && result.id) {
          setRevision((revision ?? 0) + 1);
          onCreated(result.id);
        }
        return result;
      }}
    >
      <div className="career-form-grid">
        <label className="career-wide">
          Pergunta / título
          <input
            required
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
        </label>
        <label>
          Categoria
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            list="career-answer-categories"
          />
          <datalist id="career-answer-categories">
            {[
              "Pitch",
              "Sobre mim",
              "Experiência",
              "Comportamental",
              "Mudança de emprego",
              "Liderança",
              "Materiais extras",
            ].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </datalist>
        </label>
        <label>
          Confiança
          <select
            value={confidence}
            onChange={(e) => setConfidence(Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}/5 ·{" "}
                {
                  [
                    "Preciso estruturar",
                    "Em construção",
                    "Consigo explicar",
                    "Confortável",
                    "Bem preparado",
                  ][n - 1]
                }
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Pontos-chave
        <textarea
          rows={3}
          value={content.keyPoints}
          onChange={(e) =>
            setContent({ ...content, keyPoints: e.target.value })
          }
        />
      </label>
      <label>
        Resposta principal
        <textarea
          rows={7}
          value={content.main}
          onChange={(e) => setContent({ ...content, main: e.target.value })}
          placeholder="Escreva com a sua voz. Que contexto é necessário para entender sua resposta?"
        />
      </label>
      <details className="career-disclosure">
        <summary>Versão curta, completa e em inglês</summary>
        {[
          ["short", "Versão curta"],
          ["long", "Versão completa"],
          ["english", "English answer"],
        ].map(([k, l]) => (
          <label key={k}>
            {l}
            <textarea
              rows={5}
              value={content[k as "short"]}
              onChange={(e) => setContent({ ...content, [k]: e.target.value })}
            />
          </label>
        ))}
      </details>
      <label>
        História real associada
        <select value={storyId} onChange={(e) => setStoryId(e.target.value)}>
          <option value="">Nenhuma história vinculada</option>
          {data.stories.map((s) => (
            <option value={s.id} key={s.id}>
              {s.title} · {s.method}
            </option>
          ))}
        </select>
      </label>
      {story && (
        <details className="career-disclosure">
          <summary>Revisar a história vinculada</summary>
          {Object.entries(storyContentSchema.parse(story.content))
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <p key={k}>
                <strong>{storyLabels[k]}:</strong> {v}
              </p>
            ))}
        </details>
      )}
      <label>
        Evidências e métricas confirmadas
        <textarea
          rows={3}
          value={content.evidence}
          onChange={(e) => setContent({ ...content, evidence: e.target.value })}
        />
      </label>
      <label>
        Pontos a melhorar
        <textarea
          rows={3}
          value={content.improve}
          onChange={(e) => setContent({ ...content, improve: e.target.value })}
        />
      </label>
      <div className="career-form-grid">
        <label>
          Stack
          <input
            value={content.stack}
            onChange={(e) => setContent({ ...content, stack: e.target.value })}
          />
        </label>
        <label>
          Tags
          <input
            value={content.tags.join(",")}
            onChange={(e) =>
              setContent({ ...content, tags: e.target.value.split(",") })
            }
          />
        </label>
      </div>
    </CareerForm>
  );
}
const storyLabels: Record<string, string> = {
  situation: "Situação",
  challenge: "Desafio",
  actions: "Ações realizadas",
  decisions: "Decisões técnicas",
  result: "Resultado",
  learning: "Aprendizados",
  technologies: "Tecnologias",
  evidence: "Evidências e métricas confirmadas",
  suitableFor: "Perguntas para as quais esta história serve",
};
function StoryEditor({
  row,
  onCreated,
}: {
  row?: CareerData["stories"][number];
  onCreated: (id: string) => void;
}) {
  const [content, setContent] = useState(
      storyContentSchema.parse(row?.content ?? {}),
    ),
    [title, setTitle] = useState(row?.title ?? ""),
    [method, setMethod] = useState(row?.method ?? "STAR"),
    [revision, setRevision] = useState(row?.revision);
  return (
    <CareerForm
      saveLabel="Salvar história"
      submit={async () => {
        const result = await savePreparationAction("story", {
          id: row?.id,
          revision,
          title,
          method,
          content,
        });
        if ("id" in result && result.id) {
          setRevision((revision ?? 0) + 1);
          onCreated(result.id);
        }
        return result;
      }}
    >
      <label>
        Título da experiência
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label>
        Estrutura
        <select value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="STAR">STAR · Situação, Tarefa, Ação, Resultado</option>
          <option value="CAR">CAR · Contexto, Ação, Resultado</option>
        </select>
      </label>
      <p className="career-note">
        Não precisa preencher tudo de uma vez. Registre o que aconteceu de
        verdade; complemente as evidências depois.
      </p>
      {Object.entries(storyLabels).map(([key, label]) => (
        <label key={key}>
          {label}
          <textarea
            rows={3}
            value={content[key as keyof typeof content]}
            onChange={(e) => setContent({ ...content, [key]: e.target.value })}
          />
        </label>
      ))}
    </CareerForm>
  );
}
type PracticeState = NonNullable<
  Awaited<ReturnType<typeof practiceAction>>["session"]
>;
type Practiced = {
  id: string;
  seconds: number;
  answered: boolean;
  confidence: number;
};
function PracticeStudio({ data }: { data: CareerData }) {
  const existing = data.sessions.find((s) => !s.finishedAt);
  const [session, setSession] = useState<PracticeState | null>(
      existing ? { ...existing } : null,
    ),
    [target, setTarget] = useState(45),
    [notes, setNotes] = useState(existing?.notes ?? ""),
    [questionId, setQuestionId] = useState(
      existing?.activeQuestionId ?? data.answers[0]?.id ?? "",
    ),
    [confidence, setConfidence] = useState(3),
    [elapsed, setElapsed] = useState(existing?.totalSeconds ?? 0),
    [error, setError] = useState(""),
    [pending, start] = useTransition(),
    canWrite = useFinanceWriteAccess();
  const answers = (session?.answers ?? []) as Practiced[],
    question = data.answers.find((a) => a.id === questionId),
    content = answerContentSchema.parse(question?.content ?? {});
  useEffect(() => {
    function tick() {
      setElapsed(
        (session?.totalSeconds ?? 0) +
          (session?.status === "RUNNING" && session.activeSince
            ? Math.max(
                0,
                Math.floor(
                  (Date.now() - Date.parse(session.activeSince)) / 1000,
                ),
              )
            : 0),
      );
    }
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [session]);
  function act(action: string, selectedQuestion = questionId) {
    start(async () => {
      setError("");
      try {
        const result = await practiceAction({
          id: session?.id,
          revision: session?.revision,
          action,
          targetMinutes: target,
          questionId: selectedQuestion,
          notes,
          confidence,
        });
        if (result.error) setError(result.error);
        else if ("session" in result && result.session) {
          setSession(result.session);
          if (action === "START") setQuestionId("");
        }
      } catch {
        setError("Não foi possível salvar o treino. As notas foram mantidas.");
      }
    });
  }
  const minutes = Math.floor(elapsed / 60),
    seconds = elapsed % 60,
    finished = !!session?.finishedAt;
  return (
    <div className="career-practice">
      <section className="career-practice-clock">
        <span className="career-eyebrow">PRÁTICA COM INTENÇÃO</span>
        <h3>Uma conversa em três blocos</h3>
        <div
          className="career-timer"
          role="timer"
          aria-label="Tempo de prática"
        >
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </div>
        <p>
          Meta de {session?.targetMinutes ?? target} minutos ·{" "}
          {session?.status === "RUNNING"
            ? "Em andamento"
            : finished
              ? "Sessão encerrada"
              : "Pausado"}
        </p>
        <progress
          value={Math.min(elapsed, (session?.targetMinutes ?? target) * 60)}
          max={(session?.targetMinutes ?? target) * 60}
          aria-label="Progresso do tempo de prática"
        />
        <ol>
          {[
            "Apresentação e contexto",
            "Experiência, projetos e problemas",
            "Comportamental e perguntas difíceis",
          ].map((l, i) => (
            <li
              key={l}
              data-active={
                (minutes >= (i * (session?.targetMinutes ?? target)) / 3 &&
                  minutes <
                    ((i + 1) * (session?.targetMinutes ?? target)) / 3) ||
                undefined
              }
            >
              <span>
                {Math.round((session?.targetMinutes ?? target) / 3)} min
              </span>
              {l}
            </li>
          ))}
        </ol>
        {!session || finished ? (
          <>
            <label>
              Meta de duração (minutos)
              <input
                type="number"
                min={5}
                max={180}
                value={target}
                onChange={(e) => setTarget(Number(e.target.value))}
              />
            </label>
            <button
              type="button"
              className="button"
              disabled={pending || !canWrite || !data.answers.length}
              onClick={() => {
                setNotes("");
                act("START", "");
              }}
            >
              <Play size={15} />
              Iniciar novo treino
            </button>
          </>
        ) : (
          <div className="stack">
            <button
              type="button"
              className="button"
              disabled={pending || !canWrite}
              onClick={() =>
                act(session.status === "RUNNING" ? "PAUSE" : "RESUME")
              }
            >
              {session.status === "RUNNING" ? (
                <Pause size={15} />
              ) : (
                <Play size={15} />
              )}{" "}
              {session.status === "RUNNING" ? "Pausar e salvar" : "Continuar"}
            </button>
            <button
              type="button"
              className="button-secondary"
              disabled={pending || !canWrite}
              onClick={() => act("FINISH")}
            >
              Encerrar e revisar
            </button>
          </div>
        )}
        <p className="career-note">
          O tempo é registrado pelo servidor. Atingir a meta não conclui o
          treino automaticamente: registre perguntas e faça a revisão.
        </p>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
      </section>
      <section className="career-practice-questions">
        <header>
          <h3>O que você vai praticar?</h3>
          <span>
            {answers.filter((a) => a.answered).length} pergunta(s) revisada(s)
          </span>
        </header>
        {!data.answers.length ? (
          <CareerEmpty
            title="Adicione suas primeiras perguntas"
            description="Use a biblioteca para criar perguntas ou adicionar a base sugerida antes de começar."
          />
        ) : (
          <>
            <label>
              Pergunta ativa
              <select
                value={questionId}
                disabled={!session || finished || pending || !canWrite}
                onChange={(e) => {
                  setQuestionId(e.target.value);
                  act("QUESTION", e.target.value);
                }}
              >
                <option value="">Escolha uma pergunta</option>
                {data.answers.map((a) => (
                  <option key={a.id} value={a.id}>
                    {answers.some((p) => p.id === a.id && p.answered)
                      ? "✓ "
                      : ""}
                    {a.question}
                  </option>
                ))}
              </select>
            </label>
            {question && (
              <>
                <h2>{question.question}</h2>
                <div className="career-practice-prompt">
                  <span className="career-eyebrow">PONTOS-CHAVE</span>
                  <p>
                    {content.keyPoints ||
                      "Explique o contexto, suas ações e o resultado. Evite ler uma resposta pronta."}
                  </p>
                </div>
                <details className="career-disclosure">
                  <summary>Consultar minha resposta</summary>
                  <p className="career-preserve-lines">
                    {content.main || "Sua resposta ainda não foi escrita."}
                  </p>
                </details>
                <label>
                  Como foi esta resposta?
                  <select
                    value={confidence}
                    onChange={(e) => setConfidence(Number(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option value={n} key={n}>
                        {n}/5
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="button-secondary"
                  disabled={pending || !session || finished || !canWrite}
                  onClick={() => act("ANSWER")}
                >
                  <Check size={15} />
                  Marcar resposta como praticada
                </button>
              </>
            )}
          </>
        )}
        <label>
          Notas e pontos para melhorar
          <textarea
            rows={5}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={!canWrite || finished}
            placeholder="Onde hesitei? Que exemplo preciso aprofundar?"
          />
        </label>
        <p className="career-note">
          As notas são salvas ao pausar, mudar pergunta, marcar resposta ou
          encerrar.
        </p>
      </section>
      <section className="career-practice-history">
        <h3>Histórico e comparação</h3>
        {data.sessions.length ? (
          data.sessions.map((s, index) => {
            const practiced = s.answers as Practiced[],
              previous = data.sessions[index + 1];
            return (
              <article key={s.id}>
                <div>
                  <strong>
                    {dateLabel(s.startedAt)} · {Math.floor(s.totalSeconds / 60)}{" "}
                    min
                  </strong>
                  <span
                    className="career-status"
                    data-stage={s.status === "COMPLETED" ? "ACCEPTED" : "SAVED"}
                  >
                    {s.status === "COMPLETED"
                      ? "Meta e revisão concluídas"
                      : s.finishedAt
                        ? "Revisão registrada · meta não concluída"
                        : "Sessão em andamento"}
                  </span>
                </div>
                <p>
                  {practiced.filter((a) => a.answered).length} resposta(s) ·
                  meta {s.targetMinutes} min
                  {previous
                    ? ` · ${Math.round((s.totalSeconds - previous.totalSeconds) / 60)} min em relação ao treino anterior`
                    : ""}
                </p>
                <details>
                  <summary>Respostas, tempo e notas</summary>
                  {practiced.map((p) => (
                    <p key={p.id}>
                      {data.answers.find((a) => a.id === p.id)?.question ??
                        "Pergunta anterior"}{" "}
                      · {Math.floor(p.seconds / 60)}m {p.seconds % 60}s ·
                      preparo {p.confidence}/5 ·{" "}
                      {p.answered ? "Praticada" : "Em aberto"}
                    </p>
                  ))}
                  <p className="career-preserve-lines">
                    {s.notes || "Sem notas."}
                  </p>
                </details>
              </article>
            );
          })
        ) : (
          <p className="career-note">
            Seu primeiro treino cria um histórico real de prática.
          </p>
        )}
      </section>
    </div>
  );
}
