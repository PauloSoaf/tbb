# Medidas Caseiras

## Objetivo
Permitir que gramas da TACO sejam traduzidos em medidas de uso real, como colher de sopa, copo, concha, fatia e unidade media.

## Como a conversao funciona
O NutriOpus separa composicao nutricional e medida caseira:

- TACO fornece nutrientes por 100g.
- Medidas caseiras convertem uma porcao em gramas aproximadas.
- O calculo nutricional final usa os gramas estimados contra os dados por 100g.

## Relacao com TACO
A TACO continua sendo a base principal de kcal, proteinas, carboidratos, gorduras e fibras. O conversor nunca substitui a composicao nutricional da TACO.

## Dados curados
O dataset inicial fica em:

- `src/data/household-measures/common-measures.json`
- `src/data/household-measures/food-measure-mappings.json`

`common-measures.json` define utensilios globais e capacidade/volume quando isso faz sentido. Ele nao define gramas definitivos.

`food-measure-mappings.json` define alimento + utensilio = gramas aproximadas, com faixa `minGrams/maxGrams`, `source`, `confidence`, `isVerified` e `isDefault`.

Todos os itens curados ficam marcados como `CURATED`, com `confidence` e `isVerified: false` quando nao sao fonte oficial.

## UX do conversor
O conversor permite:

- alternar entre `gramas -> medida caseira` e `medida caseira -> gramas`;
- filtrar medidas por colheres, xicaras/copos, conchas, pratos, fatias, unidades e porcoes;
- mostrar a medida mais comum primeiro via `isDefault`;
- mostrar fonte, confianca e faixa estimada quando houver min/max.

## Medidas customizadas
A modelagem Prisma permite medidas criadas por nutricionista em `FoodHouseholdMeasure.createdByNutritionistId`. O MVP valida o contrato e prepara persistencia; a UI de CRUD customizado fica para a proxima fase.

## Integracoes
- TACO: painel de conversor na pagina `/ferramentas/taco`.
- Floating tools: janela `Conversor de porcoes`.
- Plano alimentar/lista/diario: os models existentes ja possuem `householdMeasure` textual; a persistencia estruturada por item pode ser adicionada em fase incremental.

## Limitacoes
Medidas caseiras sao estimativas. O peso pode variar conforme alimento, preparo, marca, corte e tamanho do utensilio. Para maior precisao, utilize balanca.

## Seguranca
Medidas globais podem ser lidas por todos. Medidas customizadas devem ser filtradas por `nutritionistId` antes de aparecerem para nutricionista/paciente.

## i18n
As chaves novas ficam em `household_measures.*` e `taco.*` nos arquivos `pt.json`, `en.json` e `es.json`.

## Testes
Cobertura adicionada:

- `src/lib/utils/__tests__/household-measures.test.ts`
- `src/validation/__tests__/household-measures.schema.test.ts`

## Proximas evolucoes
- Importacao ampla da TBCA se a licenca/termos permitirem.
- Curadoria profissional de medidas.
- CRUD completo de medidas customizadas.
- Persistencia estruturada por `MealItem`.
- Exibicao no cardapio do paciente, lista de compras e diario alimentar.
