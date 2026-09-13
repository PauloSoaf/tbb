# Floating Assistant e Tools

## Objetivo

A sprint adiciona uma camada global de assistencia no dashboard da nutricionista: um dock com dois botoes flutuantes para abrir o Assistente NutriOpus e as Ferramentas Rapidas sem sair da tela atual.

## Componentes

- `FloatingActionDock`: integra os dois botoes globais, drawers e janela flutuante.
- `AIAssistantDrawer`: painel lateral do assistente.
- `AIAssistantChat`: historico local, sugestoes, composer e loading.
- `FloatingToolsDrawer`: busca e lista de ferramentas.
- `FloatingToolsWindow`: mini janela flutuante no desktop e bottom sheet no mobile.
- `MiniTacoSearchTool`, `MiniBMICalculatorTool`, `MiniMacroCalculatorTool`, `MiniCalculatorTool`: utilitarios locais.

## Provider de IA

A IA usa provider configuravel por variaveis de ambiente:

```env
AI_ASSISTANT_ENABLED=true
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1
AI_API_KEY=
AI_MODEL=
```

Providers suportados nesta sprint: `ollama`, `openrouter`, `groq` e `disabled`.

Se o provider nao estiver configurado ou nao responder, o drawer mostra erro amigavel. O sistema nao cria resposta falsa como se fosse IA real.

## Seguranca

- Toda pergunta passa por server action com sessao da nutricionista.
- O `tenant` enviado pelo client precisa bater com `session.nutritionistSlug`.
- Contexto de paciente so e carregado por `nutritionistId + patientId`.
- O contexto enviado ao provider e resumido e limitado.
- Arquivos completos, tokens, hashes e links privados nao sao enviados.
- A IA nao executa mutacoes destrutivas nesta sprint.
- Actions de navegacao sao inferidas e validadas no servidor/helper local.

## Contexto do Paciente

`getAIPatientContext` retorna somente dados operacionais resumidos:

- nome, idade, sexo, objetivo e status;
- ultima anamnese resumida;
- ultima antropometria;
- plano ativo;
- proxima consulta;
- pendencias;
- metas ativas;
- arquivos recentes sem conteudo.

## Actions Permitidas

```ts
type AIAssistantAction =
  | { type: "NAVIGATE"; label: string; href: string }
  | { type: "OPEN_TOOL"; label: string; toolId: string }
  | { type: "OPEN_PATIENT"; label: string; patientId: string; href: string }
  | { type: "NONE" };
```

As rotas precisam iniciar com `/dashboard/[tenant]` e nao podem conter URL externa.

## Ferramentas Flutuantes

O drawer lista atalhos para TACO, calculadoras, oficina de planos, modelos, relatorios, agenda, atendimentos e areas relacionadas ao paciente. Ferramentas simples podem abrir em janela flutuante:

- TACO rapida;
- IMC;
- macros;
- agua diaria.

## Janela Arrastavel

No desktop a janela usa `position: fixed`, pode ser movida pelo cabecalho e salva a posicao no `localStorage`. No mobile vira bottom sheet para nao quebrar a navegacao inferior.

## Limitacoes

- Nao ha streaming de resposta nesta versao.
- Historico do chat e local ao componente e nao persiste no banco.
- O assistente nao executa alteracoes clinicas automaticamente.
- Provider externo precisa ser configurado no ambiente.

## Proximos Passos

- Streaming de respostas.
- Abrir ferramentas por action retornada da IA.
- Historico persistido por nutricionista.
- Mais mini ferramentas clinicas.
- Telemetria de erros do provider.
