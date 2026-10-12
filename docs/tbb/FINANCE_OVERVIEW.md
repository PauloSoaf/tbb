# Visão geral financeira

A visão geral distingue dinheiro disponível, resultados do mês e planejamento. Renda prevista não é dinheiro recebido, limite do cartão não é saldo bancário e possível dívida não é uma dívida cadastrada.

Patrimônio inclui o valor estimado de revenda dos bens ativos cadastrados em [Bens pessoais](PERSONAL_ASSETS.md). O link do indicador e o menu Mais abrem `/finance/assets`; o tooltip separa patrimônio financeiro líquido e bens. Avaliações e financiamentos vinculados aparecem nos relatórios PDF/Markdown. Bens não entram no saldo disponível nem na cobertura das faturas; a dívida vinculada não é descontada novamente.

## Organização da tela

Depois dos indicadores, da renda prevista e do alerta de cobertura de faturas, os blocos aparecem nesta ordem:

A renda prevista e a cobertura das faturas dividem uma linha em duas colunas de mesma altura quando há largura suficiente. O alerta resume o valor a cobrir, o saldo e as faturas abertas; explicações ficam no tooltip e a projeção completa continua em Dívidas. O X oculta o alerta durante a visita e permite à renda usar toda a largura. “Mostrar alerta” o restaura; alterações nos totais comparados, nas pendências ou na data fazem a comparação atual reaparecer. Em espaços estreitos, a linha empilha os blocos. Fechar o alerta não altera os registros financeiros.

A revisão de 12/10/2026 passou em 60 verificações no Chrome contra o build de produção: fechamento por teclado, restauração, atualização da comparação, larguras de 320/375/768/1440 px, temas claro/escuro e adaptação ao recolher a sidebar. O build, typecheck e lint dos arquivos passaram; a suíte manteve 406/407, com a falha antiga de caminhos de storage no Windows. Foi corrigida a animação `RevealOnScroll` para revelar o conteúdo sem transição quando movimento reduzido está ativo; a revisão visual confirmou os blocos visíveis com e sem essa preferência, sem erros de runtime/hidratação.

1. Contas, Cartões e faturas e Calendário mensal, em três colunas no desktop.
2. Fluxo de caixa e Uso da renda.
3. Gastos por categoria e Economia do mês.
4. Radar financeiro, próximos vencimentos e transações recentes.

A coluna de Contas é mais estreita. Em telas intermediárias, o calendário ocupa uma segunda linha; no celular, os três blocos ficam empilhados. A ordem é definida no conteúdo da página, inclusive na navegação por teclado.

## Contas, cartões e reservas

Produtos da mesma instituição aparecem agrupados por banco. Conta de dinheiro, cartão e poupança/cofrinho conservam contas e lançamentos independentes. O cadastro permite acrescentar esses produtos ao banco; a conferência de saldo registra um ajuste pela diferença, preservando o histórico.

O saldo atual soma contas correntes, carteiras digitais e dinheiro até hoje. Reservas aparecem separadas. Lançamentos futuros e referências antigas de renda não antecipam o saldo. Os cartões exibem fatura atual, compromissos futuros e limite, com segmentos verde, amarelo e laranja; o disponível é uma estimativa dos registros do TBB.

Faturas agregadas e compras detalhadas não são somadas duas vezes. Ao vincular uma compra, o usuário informa se ela já estava incluída no total ou se deve aumentar a fatura. Faturas pagas preservam seu total. A importação promove previsões compatíveis para faturas conhecidas e apresenta conflitos quando não pode reconciliar os registros com segurança.

Corrigir fatura abre um formulário no card e nas tabelas para editar vencimento, fechamento, competência, valor declarado e observação. Editar cartão leva ao ciclo habitual e ao limite, que são independentes das datas da fatura. A correção exige titular com permissão de escrita, mantém a identidade e os gastos vinculados, atualiza a chave natural e registra auditoria em uma transação serializável. Ela rejeita versões desatualizadas, vencimentos duplicados, fechamento posterior ao vencimento e valor efetivo abaixo do detalhamento. Faturas pagas permanecem protegidas. Compras somadas continuam separadas do valor declarado. O gráfico de vencimentos usa a soma dos segmentos de cada mês para calcular sua escala.

## Calendário financeiro

O calendário compacto da visão geral usa uma grade mensal de sete colunas, menor que a página completa, ao lado de Contas e Cartões e faturas. O mês inteiro permanece visível. A seleção inicial é hoje, e a lista diária começa recolhida. Selecionar um dia abre detalhes, que podem ser fechados. Valores de saídas e indicadores de entradas e saídas aparecem em cada dia. O calendário respeita movimento reduzido e permite uso por toque e teclado. Ele não altera os parâmetros da visão geral; Tela completa preserva mês e dia selecionados.

Faturas abertas e futuras conhecidas aparecem no dia do vencimento, com marcação roxa e ícone de cartão. O tooltip identifica os cartões, os valores completos e a diferença entre compromisso de pagamento e gasto registrado. Quando várias faturas vencem juntas, a célula mostra a soma e os detalhes listam cada cartão separadamente. A grade compacta abrevia valores para caber nas células; tooltip e lista preservam os centavos.

Faturas a pagar têm um total separado do resultado do ledger. Elas usam os valores efetivos já calculados no fluxo de faturas, incluindo compras adicionadas ao total. Compras já incluídas não aumentam novamente a fatura. A marcação não cria despesas nem pagamentos. Faturas pagas, previsões sem vencimento e valores zerados não aparecem como compromissos a pagar. Essas informações permanecem privadas do titular e reutilizam os dados já carregados, sem novas consultas ao banco.

A página `/finance/calendar` mantém a grade mensal de sete colunas, navegação contínua e gestos horizontais para trocar meses. Os parâmetros `month` e `day` acompanham a seleção usando a History API integrada ao Next.js, permitindo links diretos e Voltar/Avançar do navegador sem recarregar a página. Parâmetros inválidos usam uma seleção válida. Textos e datas seguem PT, EN ou ES.

Dias de meses adjacentes são atalhos de navegação com indicação neutra, sem valores ou anúncio de ausência de gastos. Ao selecioná-los, o calendário consulta o mês correspondente e preserva o dia. Carregamento e falha de rede também não aparecem como totais zerados; Tentar novamente inicia uma nova consulta.

A consulta lê somente os lançamentos do workspace da sessão, usando um intervalo UTC de início inclusivo e fim exclusivo por mês. Faturas consolidadas não entram como uma segunda despesa. Referências `QUICK_INCOME` não são recebimentos. Transferências e ajustes aparecem na lista, mas ficam fora dos totais de entradas e saídas. Reembolsos contam como entradas; lançamentos posteriores a hoje são identificados como agendados e ficam separados do resultado registrado.

Ao selecionar um dia, aparecem compras, receitas e reembolsos. Os botões Despesa e Receita preenchem essa data no cadastro rápido. Gasto no cartão abre o fluxo existente de faturas, também com a data selecionada e a escolha entre valor já incluído e valor a somar. A lista e os totais são atualizados após salvar, inclusive quando a data pertence a outro mês. Os controles e formulários exigem permissão efetiva `WRITE`, calculada pela política existente com overrides de papel e membro; o servidor continua validando cada ação.

O cache local guarda até doze meses por snapshot recebido do servidor. Uma nova resposta de `router.refresh()` invalida os meses anteriores, mesmo quando uma edição, exclusão ou importação ocorreu fora do mês inicial. Cadastros do calendário e do fluxo de cartão descartam o cache após salvar. Recuperar foco ou visibilidade revalida os dados do servidor, com deduplicação dos dois eventos. Selecionar outro dia do mesmo mês não faz uma consulta adicional.

O titular vê uma explicação quando existem valores de faturas sem compras detalhadas, com atalho para o fluxo existente em Faturas. Esses valores não são distribuídos entre dias nem viram lançamentos artificiais.

`GET /api/finance/calendar?month=AAAA-MM` exige sessão e permissão `READ`, valida o mês e responde com cache privado desabilitado. Não aceita workspace fornecido pelo cliente. Identificadores de faturas e o fluxo de compras vinculadas ficam restritos ao titular. O calendário é de lançamentos registrados; previsões de faturas e renda mensal continuam em seus blocos específicos.

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

Contas, faturas e planejamento usam as migrations de vínculo de compras a faturas, planejamento financeiro e índice da conta de recebimento. Em ambientes existentes, aplicar com `npm run prisma:deploy` antes de iniciar a aplicação atualizada. O calendário e a correção de faturas usam os modelos existentes e não acrescentam migrations. Backups, exportações pessoais e arquivos de QA devem permanecer fora do Git; testes usam dados sintéticos.

## Validação da integração inicial de 11/10/2026

Build de produção, typecheck e lint dos arquivos alterados passaram. A suíte passou em 334 de 335 testes; a falha restante é a comparação de caminho POSIX no teste de storage no Windows, já existente. O lint completo mantém quatro erros e um aviso antigos fora dos arquivos desta entrega.

Foram aprovadas 39 verificações no Chrome: 34 em desenvolvimento e cinco na versão de produção. A conferência cobriu desktop e celular de 390 px, temas claro e escuro, traduções, navegação, correção de faturas, cadastro com a data selecionada, compra vinculada no crédito, atualização do mês carregado e limites do gráfico. As verificações finais não registraram erros de runtime ou hidratação. Os testes com gravação usaram um banco descartável com dados sintéticos, removido após a validação.

## Validação do hotfix anterior de 11/10/2026 (b1f853e)

Typecheck, build de produção e lint dos arquivos alterados passaram. Os 37 testes do calendário passaram; a suíte completa passou em 356 de 357 testes, mantendo apenas a falha de caminhos POSIX no Windows já descrita acima. O lint geral mantém os mesmos quatro erros e um aviso anteriores fora do escopo.

Foram aprovadas 87 verificações no Chrome contra o build de produção, com dados sintéticos em banco descartável. A conferência incluiu as larguras de 320, 375, 768 e 1440 px nos temas claro e escuro, detalhes expansíveis, teclado, toque, movimento reduzido, PT/EN/ES, links diretos, histórico, dias adjacentes, retry após falha de rede, cadastros em meses carregados e atualização após criação, edição e exclusão externa. Permissões com overrides e privacidade dos identificadores de faturas também foram conferidas. Não houve erros de runtime ou hidratação.

A faixa de dias manteve o conteúdo abaixo de 130 px de altura. A revisão das imagens levou a dois ajustes de responsividade no CSS global: espaçamento do cabeçalho em telas estreitas e organização da faixa de renda para evitar overflow e sobreposição de botões. Os dados reais foram conferidos somente por leitura e permaneceram preservados.

## Validação da grade mensal e dos vencimentos de faturas de 11/10/2026

Typecheck, build de produção e lint dos arquivos alterados passaram. Os 45 testes do calendário passaram; a suíte completa passou em 364 de 365 testes, com a mesma falha de caminhos POSIX no Windows já registrada.

Foram aprovadas 70 verificações distintas no Chrome contra o build de produção. A conferência cobriu as três colunas no desktop, Contas mais estreito, a grade mensal reduzida e os detalhes diários nos temas claro e escuro em 320, 375, 768 e 1440 px. Também verificou valores exatos nos tooltips, várias faturas no mesmo vencimento, faturas futuras conhecidas, ausência de faturas pagas como compromissos, teclado, toque, PT/EN/ES e privacidade para MEMBER/VIEWER. Uma compra adicionada ao total da fatura foi salva no banco sintético e atualizou o valor a pagar sem misturá-lo ao total de gastos registrados. Não houve erros de runtime ou hidratação. Os dados reais foram preservados e a validação com gravação ficou restrita ao banco descartável.
