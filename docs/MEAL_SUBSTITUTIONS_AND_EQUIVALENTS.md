# Substituicoes e Equivalentes Alimentares

## Objetivo
Permitir que a nutricionista cadastre opcoes autorizadas de troca para itens alimentares de um plano.

## Problema Resolvido
Planos alimentares maduros precisam oferecer flexibilidade sem alterar a prescricao principal. A feature registra alternativas estruturadas, visiveis no Estudio, no portal do paciente e na impressao.

## Escopo do MVP
- Substituicoes por item alimentar.
- Alimentos da TACO e alimentos customizados.
- Equivalencia por calorias, carboidratos, proteina, gordura, porcao ou manual.
- Controle de visibilidade para paciente.
- Exibicao no portal e na pagina print-friendly.

## Models
- `MealSubstitutionGroup`
- `MealSubstitutionItem`

## Enums
- `SubstitutionGroupType`
- `EquivalenceBasis`
- `SubstitutionItemSource`

## Services
`src/services/meal-substitution.service.ts` concentra CRUD, leitura por plano/refeicao/item, duplicacao e calculo. Todas as operacoes recebem `nutritionistId` e validam tenant.

## Actions
`src/actions/meal-substitution.action.ts` valida sessao, tenant e payload Zod antes de chamar o service.

## Calculos de equivalencia
`src/lib/utils/food-equivalents.ts` calcula nutrientes por quantidade e sugere gramas equivalentes por calorias, carboidratos, proteina ou gordura. Dados insuficientes retornam `null`, nunca `NaN`.

## Integracao com TACO
O drawer usa `src/data/taco.json`, sugere quantidade aproximada quando a base permite e salva macros proporcionais.

## Integracao com Estudio de Planos
Cada item alimentar persistido exibe um badge de substituicoes. O drawer permite criar grupos, adicionar TACO/custom, alternar visibilidade e remover itens.

## Visualizacao no Portal do Paciente
O portal mostra apenas grupos `visibleToPatient = true`, vinculados ao plano ativo do proprio paciente.

## PDF e Impressao
A pagina print-friendly lista substituicoes visiveis abaixo do alimento original, em formato compacto.

## Seguranca multi-tenant
Nenhuma busca de grupo ou item ocorre apenas por ID. O service sempre filtra por `nutritionistId` e valida plano/refeicao/item.

## i18n
Namespace `meal_substitutions` adicionado em PT, EN e ES.

## Testes
- `src/lib/utils/__tests__/food-equivalents.test.ts`
- `src/validation/__tests__/meal-substitution.schema.test.ts`

## Limitacoes
- Substituicao por refeicao completa ficou para fase 2.
- O paciente apenas visualiza alternativas; nao registra qual opcao usou.
- PDF usa a pagina print-friendly existente.

## Proximas evolucoes
- Substituicao por refeicao completa.
- Biblioteca propria de equivalentes.
- Lista de compras com ou sem substitutos.
- IA sugerindo equivalentes sempre com revisao da nutricionista.
- Paciente marcar alternativa usada sem alterar a prescricao original.
