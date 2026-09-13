import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/cookies";
import { aiAssistantMessageSchema } from "@/validation/ai-assistant.schema";
import { buildAIAssistantMessages } from "@/lib/ai/build-messages";

const NOT_CONFIGURED_TEXT =
  "A IA do NutriOpus ainda nao esta configurada neste ambiente. O padrao gratuito e local e Ollama: deixe AI_ASSISTANT_ENABLED=true, AI_PROVIDER=ollama, OLLAMA_BASE_URL=http://localhost:11434 e baixe um modelo com `ollama pull llama3.1` ou use um modelo local ja instalado.";

function sseChunk(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

function makeErrorStream(text: string, provider: string, actions: unknown[]): ReadableStream {
  return new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      controller.enqueue(enc.encode(sseChunk({ d: text })));
      controller.enqueue(enc.encode(sseChunk({ done: true, p: provider, a: actions, err: true })));
      controller.close();
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = aiAssistantMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Entrada inválida" }, { status: 400 });
  }

  if (parsed.data.tenant !== session.nutritionistSlug) {
    return NextResponse.json({ error: "Tenant inválido" }, { status: 403 });
  }

  const built = await buildAIAssistantMessages({
    nutritionistId: session.nutritionistId,
    tenant: parsed.data.tenant,
    message: parsed.data.message,
    currentPath: parsed.data.currentPath,
    patientId: parsed.data.patientId,
    history: parsed.data.history,
  });

  const streamHeaders = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  };

  if (!built.ok) {
    return new NextResponse(
      makeErrorStream(NOT_CONFIGURED_TEXT, built.providerName, built.actions),
      { headers: streamHeaders },
    );
  }

  const providerName = built.provider.name;
  const actions = built.actions;

  // Determine upstream API details
  const providerLower = providerName.toLowerCase();
  let upstreamUrl: string;
  let upstreamKey: string | undefined;
  let upstreamModel: string | undefined;

  if (providerLower === "groq") {
    upstreamUrl = "https://api.groq.com/openai/v1/chat/completions";
    upstreamKey = process.env.AI_API_KEY || process.env.GROQ_API_KEY;
    upstreamModel = process.env.AI_MODEL;
  } else if (providerLower === "openrouter") {
    upstreamUrl = "https://openrouter.ai/api/v1/chat/completions";
    upstreamKey = process.env.AI_API_KEY;
    upstreamModel = process.env.AI_MODEL;
  } else {
    // Ollama and unknown providers: fall back to blocking generate
    try {
      const resp = await built.provider.generate(built.messages);
      const enc = new TextEncoder();
      const stream = new ReadableStream({
        start(ctrl) {
          ctrl.enqueue(enc.encode(sseChunk({ d: resp.text })));
          ctrl.enqueue(enc.encode(sseChunk({ done: true, p: providerName, a: actions })));
          ctrl.close();
        },
      });
      return new NextResponse(stream, { headers: streamHeaders });
    } catch {
      return new NextResponse(
        makeErrorStream("Nao consegui contatar o Ollama local. Verifique se o app Ollama esta aberto e se existe algum modelo instalado.", providerName, actions),
        { headers: streamHeaders },
      );
    }
  }

  if (!upstreamKey || !upstreamModel) {
    return new NextResponse(
      makeErrorStream(NOT_CONFIGURED_TEXT, providerName, actions),
      { headers: streamHeaders },
    );
  }

  // OpenAI-compatible streaming (Groq / OpenRouter)
  let upstreamResp: Response;
  try {
    upstreamResp = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${upstreamKey}`,
      },
      body: JSON.stringify({
        model: upstreamModel,
        messages: built.messages,
        stream: true,
      }),
    });
  } catch {
    return new NextResponse(
      makeErrorStream("Nao consegui contatar o provider de IA configurado.", providerName, actions),
      { headers: streamHeaders },
    );
  }

  if (!upstreamResp.ok || !upstreamResp.body) {
    return new NextResponse(
      makeErrorStream(`Erro do provider (${upstreamResp.status}).`, providerName, actions),
      { headers: streamHeaders },
    );
  }

  const upstreamBody = upstreamResp.body;
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstreamBody.getReader();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += dec.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const raw = trimmed.slice(5).trim();
            if (raw === "[DONE]") continue;

            try {
              const parsed = JSON.parse(raw) as {
                choices?: { delta?: { content?: string } }[];
              };
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                controller.enqueue(enc.encode(sseChunk({ d: delta })));
              }
            } catch {
              // malformed SSE chunk — skip
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      controller.enqueue(enc.encode(sseChunk({ done: true, p: providerName, a: actions })));
      controller.close();
    },
  });

  return new NextResponse(stream, { headers: streamHeaders });
}
