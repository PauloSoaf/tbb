# Paletas de tema curadas

Data: 2026-07-08

## Contexto

O menu de personalizacao aceitava cores livres para marca, navbar, sidebar e
estado ativo. Isso permitia combinacoes sem contraste, alem de exigir que a
nutricionista entendesse relacoes entre seis tokens diferentes.

O ajuste preserva todos os temas existentes, restaura as opcoes visuais Azul e
Areia e substitui a composicao manual por paletas completas.

## Referencia de acessibilidade

A validacao segue WCAG 2.2, criterio 1.4.3:

- texto comum: contraste minimo de 4.5:1;
- texto grande: contraste minimo de 3:1;
- estados e limites visuais relevantes devem permanecer perceptiveis.

Fontes:

- https://www.w3.org/TR/WCAG22/#contrast-minimum
- https://www.w3.org/WAI/WCAG22/Techniques/general/G18
- https://www.w3.org/WAI/WCAG22/Understanding/distinguishable

## Decisoes

1. O seletor global continua usando `next-themes`.
2. `Azul` e `Areia` foram adicionados como temas independentes, sem renomear ou
   remover os temas atuais.
3. O modal nao oferece mais `input[type=color]`, hexadecimal ou troca isolada
   de navbar/sidebar.
4. Cada paleta define primary, accent, secondary, navbar, sidebar, ativo,
   surfaces e textos como uma unidade.
5. A cor de texto sobre comandos e estados ativos e calculada pela maior razao
   de contraste entre uma opcao clara e uma escura.
6. Configuracoes antigas do `localStorage` sao migradas para o preset curado
   equivalente pelo `backgroundPreset`; cores arbitrarias antigas nao voltam a
   ser injetadas.

## Paletas disponiveis

- Tema claro
- NutriOpus Claro
- Clinico Suave
- Bege Minimalista
- Rosa Suave
- Lilas Elegante
- Azul Escuro Premium
- Roxo Noturno
- Preto Metalico

Os temas globais existentes continuam disponiveis, incluindo Folha Clinica.
As opcoes restauradas `Azul` e `Areia` usam os ids
`theme-classic-blue` e `theme-classic-sand`.

## I18n

O menu e o modal usam chaves equivalentes em portugues, ingles e espanhol.
Foram revisados nomes, descricoes, grupos, acoes, feedback de restauracao e
rotulos da previa.

## Verificacao automatizada

`custom-theme-utils.test.ts` verifica:

- ids de paleta sem duplicidade;
- contraste semantico de primary, accent, secondary, navbar, sidebar e ativo;
- texto principal e secundario contra background e card;
- pares principais dos temas restaurados Azul e Areia diretamente nos tokens
  de `globals.css`.
