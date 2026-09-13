# Sprint Medidas Caseiras e Conversor de Porcoes

## Escopo entregue
- Modelagem Prisma para `HouseholdMeasure` e `FoodHouseholdMeasure`.
- Migration incremental `20260629170000_add_household_measures`.
- Dataset local inicial curado.
- Expansao de utensilios globais com `key`, tipo, tamanho e volume quando aplicavel.
- Mappings ampliados por alimento com `measureKey`, `minGrams`, `maxGrams`, `source`, `confidence`, `isVerified` e `isDefault`.
- Importador `scripts/import-household-measures.ts`.
- Helpers puros de conversao e calculo nutricional.
- Schemas Zod.
- Painel na pagina TACO.
- Janela flutuante `Conversor de porcoes`.
- Filtros por tipo de medida e alternancia de direcao no conversor.
- i18n PT/EN/ES.
- Testes unitarios de conversao e validacao.
- Docs de funcionamento e fontes.

## Decisao de MVP
Os models `MealItem`, `MealSubstitutionItem` e `ShoppingListItem` ja possuem campo `householdMeasure`. Por isso, esta sprint nao alterou esses models para campos estruturados por item. A persistencia detalhada por item fica como evolucao incremental, evitando migration ampla enquanto o Prisma Client local esta bloqueado por `EPERM`.

## Como importar dados
Depois de aplicar a migration e liberar o Prisma Client:

```bash
npx prisma migrate dev
npx prisma generate
npx tsx scripts/import-household-measures.ts
```

## Validacao manual sugerida
1. Abrir `/dashboard/[tenant]/ferramentas/taco`.
2. Pesquisar arroz.
3. Confirmar sugestao aproximada de 100g para 4 colheres de sopa.
4. Selecionar medida caseira e conferir peso/nutrientes estimados.
5. Abrir ferramentas flutuantes e testar `Conversor de porcoes`.
6. Alternar PT/EN/ES.
7. Testar tema claro/escuro.

## Limitacoes
- Dataset inicial e curado, cobrindo cerca de 30 alimentos frequentes da base TACO local.
- Dados curados nao sao oficiais e ficam `isVerified: false`.
- CRUD de medidas customizadas ainda nao tem UI final.
- Exibicao estruturada em plano, portal, lista de compras e diario alimentar fica para proxima fase.
