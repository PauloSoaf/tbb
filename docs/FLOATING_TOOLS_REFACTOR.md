# Floating Tools Refactor

## Problema anterior

O drawer de Ferramentas Rapidas misturava mini ferramentas e links de paginas completas. A acao "Abrir tela completa" tinha muito destaque, mesmo quando a proposta principal era usar utilitarios sem sair da tela atual. A janela flutuante tambem era unica e a posicao usava `right/top`, criando uma experiencia pouco natural para drag livre.

## Nova hierarquia

O drawer agora e organizado em tres areas:

- Abrir em janela: TACO, IMC, Macros, Agua diaria e TMB/GET.
- Janelas abertas: lista as janelas atuais com foco, minimizar/restaurar e fechar.
- Atalhos: paginas completas em uma secao secundaria recolhivel.

## Janelas multiplas

O estado local fica em `src/components/floating-assistant/floating-tools-store.ts`.

Funcoes expostas:

- `openToolWindow`
- `closeToolWindow`
- `minimizeToolWindow`
- `restoreToolWindow`
- `focusToolWindow`
- `moveToolWindow`

No MVP, clicar em "Abrir janela" para uma ferramenta ja aberta foca/restaura a janela existente. Isso evita instancias duplicadas confusas durante atendimento.

## Drag X/Y

`DraggableFloatingWindow` agora usa `left/top` e recebe posicao controlada pelo store. O drag acontece pelo header da janela, salva posicao em localStorage e limita a janela para manter parte visivel na viewport.

## Registry

A lista de ferramentas foi centralizada em `tool-registry.ts`.

Cada item define:

- `id`
- `title`
- `description`
- `icon`
- `mode`
- `href`
- `floating`
- `windowSize`

O drawer, janelas e atalhos leem da mesma fonte.

## Desktop e mobile

- Desktop: multiplas janelas flutuantes livres com z-index e foco.
- Mobile: a janela focada aparece como bottom sheet. Drag livre nao e usado no mobile.

## Atalhos movidos

Foram movidos para a secao Atalhos:

- Oficina de Planos
- Modelos
- Relatorio da Clinica
- Antropometria
- Agenda
- Atendimento online
- Comparar Pacientes
- Adipometro

## Limitacoes

- Favoritos possuem botao visual no MVP, mas ainda nao persistem uma lista de favoritos.
- As janelas restauradas seguem a ultima lista salva. Se isso ficar agressivo para usuarios reais, pode-se persistir apenas a ultima posicao por ferramenta.
- O bottom sheet mobile mostra a janela focada, nao todas as janelas simultaneamente.

## Proximos passos

- Adicionar resize manual das janelas.
- Persistir favoritos por usuario.
- Criar mini anotacao rapida conectada ao prontuario/contexto atual.
- Adicionar testes de interacao com Playwright para drag, z-index e mobile sheet.
