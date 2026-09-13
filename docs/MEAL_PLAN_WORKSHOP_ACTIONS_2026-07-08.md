# Acoes da Oficina de Planos

Data: 2026-07-08

## Problema

Ao escolher Excluir, o card entrava em loading, mas nenhuma requisicao de
server action era iniciada. O botao de abrir ou completar no Estudio tambem nao
apresentava estado de navegacao.

## Causa raiz

`OficinaPlanosPageClient` instanciava `useConfirmDialog`, mas descartava o
`confirmDialog` retornado pelo hook. A Promise de confirmacao permanecia aberta,
portanto `deleteMealPlanTemplateAction` nunca era executada.

Os cards tambem iniciavam estados locais de loading sem aguardar os callbacks
da pagina. Cancelamentos e erros nao tinham caminho para limpar esses estados.

## Correcao

- O portal do modal de confirmacao agora e renderizado pela pagina.
- Exclusao e duplicacao retornam Promises para os cards.
- Estados locais sao finalizados com `finally`.
- Cancelar a confirmacao volta o card ao estado normal.
- Erros inesperados e respostas de erro geram feedback por toast.
- O fluxo de aplicar a paciente ganhou estado proprio, sem bloquear outras
  acoes da Oficina.
- O link do Estudio usa `useLinkStatus` do Next.js 16 e resposta imediata no
  clique, com spinner, texto de abertura e bloqueio de clique repetido.
- A rota continua usando o `loading.tsx` existente com o skeleton do Estudio.
- Novos textos foram adicionados em portugues, ingles e espanhol.

## Testes

`template.action.test.ts` valida:

- exclusao de modelo pertencente a nutricionista;
- chamada real de `prisma.mealPlan.delete`;
- invalidacao do cache da Oficina;
- bloqueio de exclusao para modelo ausente ou de outra nutricionista.

## Copia de modelo no Estudio

O fluxo anterior criava cada refeicao e depois cada alimento com server actions
separadas. Um modelo com varias refeicoes gerava uma cascata de POSTs, mantinha
o canvas desatualizado durante a operacao e permitia divergencia entre editor e
resumo lateral.

O novo fluxo:

1. pede confirmacao antes de substituir o conteudo atual;
2. mostra loading somente no modelo escolhido;
3. envia uma unica server action;
4. substitui refeicoes e alimentos em uma transacao;
5. preserva blocos de texto do modelo e recria os nos de refeicao com os IDs
   persistidos;
6. atualiza plano, canvas e resumo a partir da mesma resposta;
7. remonta o Tiptap apenas nessa troca explicita, sem interferir na digitacao
   normal.

Os testes de `studio-content` cobrem a troca dos nos sem perder blocos livres.
Os testes de `meal-plan.service` cobrem exclusao do conteudo anterior, criacao
aninhada das refeicoes e atualizacao final do documento com IDs do banco.
