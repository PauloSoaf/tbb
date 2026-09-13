# Floating Tools Dock Refactor

Data: 2026-07-04
Agente: Codex
Status: Implementado e testado

## Problema

O drawer de ferramentas aplicava blur/overlay em desktop, bloqueava interacao com a tela e as janelas nasciam em posicoes pouco previsiveis.

## Causa encontrada

`FloatingToolsDrawer` era modal em todas as larguras e `FloatingActionDock` nao fechava o drawer ao abrir uma ferramenta. A posicao inicial era calculada a partir da esquerda.

## Correcao aplicada

Em desktop, o drawer nao usa overlay clicavel em tela inteira. Ao abrir uma ferramenta, o drawer fecha. A posicao inicial das janelas passou a ser calculada com base no lado direito da viewport, abaixo da navbar, com cascata entre janelas.

## Arquivos alterados

- `src/components/floating-assistant/FloatingActionDock.tsx`
- `src/components/floating-assistant/FloatingToolsDrawer.tsx`
- `src/components/floating-assistant/floating-tools-store.ts`
- `src/components/floating-assistant/__tests__/floating-tools-window-position.test.ts`

## Testes executados

- `npx vitest run src/components/floating-assistant/__tests__/floating-tools-window-position.test.ts`
- `npx tsc --noEmit --pretty false`
- `npm run build`

## Resultado

Ferramentas flutuantes deixam de travar a tela em desktop e abrem em uma posicao mais previsivel e util.

## Pendencias

Validar visualmente em navegador real com multiplas janelas abertas em diferentes tamanhos de viewport.
