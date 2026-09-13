# Correcoes Beta - Feedback Nutricionista Real

Data: 2026-07-04
Agente: Codex
Status: Implementado e validado com ressalva de lint legado

## Problema

A beta trouxe bugs visiveis em uso real: carboidratos da TACO podendo virar zero, idade aparecendo como `{{count}}`, portal do paciente exibindo login mesmo com sessao ativa, card "Revisadas" ambiguo e ferramentas flutuantes bloqueando a tela.

## Causa encontrada

TACO era lida diretamente sem normalizacao de aliases ou decimal com virgula. O i18n so interpolava `{{key}}` exato e os componentes passavam `age` para uma string que esperava `count`. A pagina de login do portal nao redirecionava pacientes ja autenticados. O drawer de ferramentas era modal em desktop e mantinha overlay/blur apos abrir janela.

## Correcao aplicada

Foram adicionados helpers de interpolacao e normalizacao nutricional; os consumidores TACO principais passaram a usar esses helpers. O login do portal redireciona sessoes validas para `/portal/[tenant]`. O drawer de ferramentas fecha ao abrir uma janela, nao bloqueia o desktop e as janelas agora nascem no lado direito, abaixo da navbar.

## Arquivos alterados

- `src/lib/i18n/translate.ts`
- `src/lib/i18n/I18nContext.tsx`
- `src/lib/utils/nutrition.ts`
- `src/lib/utils/food-equivalents.ts`
- `src/app/portal/[tenant]/login/page.tsx`
- `src/components/floating-assistant/*`
- `src/components/patients/PatientTable.tsx`
- `src/components/patients/PatientMobileCard.tsx`

## Testes executados

- `npx vitest run src/lib/i18n/__tests__/interpolation.test.ts src/lib/utils/__tests__/nutrition.test.ts src/lib/utils/__tests__/food-equivalents.test.ts src/components/floating-assistant/__tests__/floating-tools-window-position.test.ts`
- `npx tsc --noEmit --pretty false`
- `npm run test`
- `npm run build`
- `npm run lint` falhou por erros legados descritos nas pendencias.

## Resultado

TACO, idade, portal login e comportamento de ferramentas ficaram cobertos por testes ou build/typecheck. A build de producao passou.

## Pendencias

O lint global ainda falha em arquivos legados fora do escopo principal: scripts CommonJS com `require()`, `any` em calculadoras e erros React Compiler no assistente do portal.
