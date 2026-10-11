# Visão geral financeira

A visão geral distingue dinheiro disponível, resultados do mês e planejamento. Renda prevista não é dinheiro recebido, limite do cartão não é saldo bancário e possível dívida não é uma dívida cadastrada.

## Organização da tela

Depois dos indicadores, da renda prevista e do alerta de cobertura de faturas, os blocos aparecem nesta ordem:

1. Contas e Cartões e faturas.
2. Fluxo de caixa e Uso da renda.
3. Gastos por categoria e Economia do mês.
4. Radar financeiro, próximos vencimentos e transações recentes.

A ordem é definida no conteúdo da página, inclusive na navegação por teclado, mantendo os mesmos blocos no desktop e no celular.

## Contas, cartões e reservas

Produtos da mesma instituição aparecem agrupados por banco. Conta de dinheiro, cartão e poupança/cofrinho conservam contas e lançamentos independentes. O cadastro permite acrescentar esses produtos ao banco; a conferência de saldo registra um ajuste pela diferença, preservando o histórico.

O saldo atual soma contas correntes, carteiras digitais e dinheiro até hoje. Reservas aparecem separadas. Lançamentos futuros e referências antigas de renda não antecipam o saldo. Os cartões exibem fatura atual, compromissos futuros e limite, com segmentos verde, amarelo e laranja; o disponível é uma estimativa dos registros do TBB.

Faturas agregadas e compras detalhadas não são somadas duas vezes. Ao vincular uma compra, o usuário informa se ela já estava incluída no total ou se deve aumentar a fatura. Faturas pagas preservam seu total. A importação promove previsões compatíveis para faturas conhecidas e apresenta conflitos quando não pode reconciliar os registros com segurança.

## Renda e gastos fixos

Editar a renda mensal salva uma previsão, com dia esperado e conta de recebimento. Registrar recebimento é uma ação separada que cria receita efetiva, com data não futura e proteção contra repetição idêntica. Referências antigas `QUICK_INCOME` permanecem no histórico, classificadas como previsão sem confirmação.

O atalho Registrar gastos fixos permite cadastrar, editar e arquivar compromissos mensais previstos. Esse cadastro não cria despesas no ledger.

Uso da renda compara fixos previstos e variáveis registradas com a renda prevista. O tooltip explica que totais de faturas e parcelas futuras ficam fora dessa conta. Fixos podem incluir gastos que serão pagos no cartão. Quando um pagamento correspondente já existe, previsão e realizado não são duplicados; prevalece o maior valor quando o gasto ultrapassa a previsão. A sobra prevista é diferente do saldo bancário.

## Cobertura de faturas

O alerta compara dinheiro atual com faturas abertas e mostra quanto falta para quitá-las. A projeção por vencimento consome o saldo uma única vez, considera faturas futuras conhecidas e não presume recebimentos futuros. Reservas, limite e investimentos ficam separados do caixa disponível. Saldo desconhecido e cobertura incompleta são indicados explicitamente.

Essa análise é somente leitura: não cadastra `Debt`, despesas ou juros hipotéticos. Faturas e projeções derivadas delas são privadas do titular do workspace.

## Relatórios PDF e Markdown

Os botões da visão geral exportam um retrato completo dos dados registrados: indicadores, bancos, saldos, reservas, cartões, limites, faturas e previsões, recebimentos e gastos, datas, planejamento, dívidas, metas, investimentos e histórico de lançamentos, incluindo registros futuros identificados como tais.

O PDF tem texto selecionável, paginação e gráfico de cobertura. O Markdown preserva as seções e tabelas para leitura ou processamento em outras ferramentas. A exportação exige `OWNER` no servidor e usa o workspace da sessão. Apenas lê os dados e entrega o arquivo ao navegador; não grava relatórios no repositório nem cria eventos financeiros.

## Navegação e hidratação

Breadcrumb e Voltar seguem a política de [navegação](NAVIGATION.md). O menu retraído mostra ícones e tooltips, com expansão explícita. As traduções iniciais são serializadas pelo servidor para que a primeira renderização do cliente use o mesmo conteúdo. A supressão de avisos por atributos externos no `body` fica limitada a esse elemento; divergências dentro da aplicação continuam visíveis.

## Modelo e atualização

As regras de dados estão em [DATA_MODEL.md](DATA_MODEL.md), e a importação em [FINANCE_IMPORT_ENGINE.md](FINANCE_IMPORT_ENGINE.md).

Esta entrega acrescenta três migrations: vínculo de compras a faturas, planejamento financeiro e índice da conta de recebimento. Em ambientes existentes, aplicar com `npm run prisma:deploy` antes de iniciar a aplicação atualizada. Backups, exportações pessoais e arquivos de QA devem permanecer fora do Git; testes usam dados sintéticos.
