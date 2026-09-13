# Sprint Meal Substitutions

## O Que Foi Implementado
MVP de substituicoes alimentares por item, com persistencia, actions, services, calculos, i18n, UI da nutricionista, portal do paciente e impressao.

## O Que Ficou Fora
Substituicoes por refeicao completa e lista de compras ficaram documentadas como proximas fases.

## Decisoes Tecnicas
O Prisma schema recebeu models e enums novos. O runtime usa queries SQL parametrizadas no service para evitar depender de Prisma Client gerado enquanto o Windows bloqueia o DLL do query engine neste workspace.

## Migrations
- `prisma/migrations/20260628234000_add_meal_substitutions/migration.sql`

## Arquivos Criados
- `src/actions/meal-substitution.action.ts`
- `src/services/meal-substitution.service.ts`
- `src/validation/meal-substitution.schema.ts`
- `src/lib/utils/food-equivalents.ts`
- `src/components/meal-substitutions/*`
- `src/components/patient-portal/meal-plan/*`
- testes de calculo e validacao

## Arquivos Alterados
- `prisma/schema.prisma`
- `src/components/meal-plan-studio/StudioCanvas.tsx`
- `src/components/meal-plans/MealEditor.tsx`
- `src/app/dashboard/[tenant]/pacientes/[patientId]/planos/[mealPlanId]/MealPlanClientView.tsx`
- `src/app/portal/[tenant]/cardapio/page.tsx`
- `src/app/portal/[tenant]/cardapio/[planId]/page.tsx`
- `src/app/dashboard/[tenant]/pacientes/[patientId]/planos/[mealPlanId]/pdf/page.tsx`
- `src/lib/i18n/pt.json`
- `src/lib/i18n/en.json`
- `src/lib/i18n/es.json`

## Comandos Executados
- `git status`
- `git remote -v`
- `npm run lint`
- `npm run build`
- `npx tsc --noEmit`
- `npm run test`

## Fluxo Manual de Validacao
Criar grupo no Estudio, adicionar substituto TACO, adicionar customizado, marcar visivel, abrir portal, conferir cardapio e conferir impressao.

## Limitacoes
`npm run build` inicial falhou no `prisma generate` por `EPERM` no DLL do Prisma no Windows. Isso precisa de desbloqueio do processo/arquivo para validar build completo.

## Proxima Sprint Recomendada
Implementar substituicoes por refeicao completa e biblioteca de equivalentes reutilizavel por nutricionista.
