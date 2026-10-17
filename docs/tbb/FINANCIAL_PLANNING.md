# Planejamento financeiro

O planejamento usa os modelos existentes: `FixedExpense`, `Subscription`, `Budget` e `SavingsGoal`. Previsões, limites e reservas planejadas não criam compras, recebimentos ou pagamentos.

## Telas e permissões

- `/finance/forecasts`: horizontes de 3, 6, 12 ou 24 meses, tabela, composição, cenários e conferências.
- `/finance/limits`: limites por período, categoria, conta ou ciclo de fatura. O fim do período é inclusivo, no fuso do workspace.
- `/finance/savings`: objetivos, contribuições, histórico, evolução da reserva e prazos. Objetivos de amortização abrem o simulador existente com dados da dívida; prazo restante e datas precisam ser conferidos.
- Os novos links ficam na navegação financeira e no menu Mais da visão geral. O dashboard conserva seus cards, gráficos, animações e calendários mensais de sete colunas.
- Leitura exige `READ` antes das consultas; alterações exigem `WRITE`. As decisões usam permissões efetivas, inclusive exceções por membro. Faturas, limites e previsões detalhadas são privados do titular. Os controles de escrita ficam ocultos para perfis de leitura.

## Consumo, caixa e sobra

Os cálculos usam centavos inteiros. Consumo pertence à data da compra. Uma compra no crédito pode consumir o orçamento agora e afetar o caixa no mês de vencimento da fatura.

Faturas mantêm seu valor integral. Compras vinculadas a elas não entram novamente nas variáveis de caixa. Um fixo só é retirado da parcela separada quando existe evidência de que a compra já está dentro da fatura. Vincular um cartão ao planejamento, sozinho, não comprova cobertura.

Sobra de caixa = renda total prevista − faturas integrais − fixos fora das faturas − variáveis de caixa − outras obrigações.

Sobra livre = sobra de caixa − novas reservas planejadas + reserva usada para financiar uma obrigação já incluída no mês.

Recebimentos efetivos aparecem separadamente do total esperado: um salário recebido não é somado outra vez à previsão do mesmo salário. Uma renda mensal específica igual a zero é válida; renda desconhecida mantém a sobra incompleta. Receitas extras esperadas permanecem distintas das confirmadas. A criação de uma previsão não registra recebimento.

Limite de cartão, valorização de bens e dinheiro reservado para objetivos não são renda. O saldo bancário é calculado pelo saldo inicial e movimentações efetivas; transferências não são consumo.

O cenário conservador remove extras apenas esperados e considera o máximo informado para fixos variáveis. O econômico reduz somente variáveis ainda planejadas, conforme o percentual escolhido. São simulações.

Datas de caixa estimadas usam o ciclo configurado do cartão. Um orçamento variável sem dia usa o dia 15 como hipótese explícita. Ciclos ausentes, compras sem fatura, limites que cobrem apenas parte do mês e históricos que excedem o teto de consulta geram avisos de incompletude.

## Limite incremental

`Budget.kind=SPENDING_LIMIT` distingue os novos limites dos orçamentos por categoria. O marco incremental guarda instante, dia local e identidades dos lançamentos conhecidos. Não usa a data da importação como data da compra.

Compras anteriores ao marco ficam fora. Uma compra do mesmo dia sem horário confirmado, uma importação sem data real da compra ou um estorno sem origem confirmada ficam pendentes de classificação. Incluir ou ignorar é uma decisão auditada; não cria outro lançamento. Estornos incluídos reduzem o consumo líquido. Alterações no lançamento recalculam os valores.

Pagamentos de cartão, transferências, ajustes e outros eventos sem consumo ficam fora. A exclusão de fixos usa vínculos explícitos, assinatura ou recorrência. Limites sobrepostos não são somados como gastos independentes; um teto global prevalece sobre seus subtetos. Um limite parcial não representa sozinho todo o orçamento mensal.

Estados: abaixo de 50%, de 50% a menos de 80%, de 80% a menos de 100%, exatamente 100% e acima de 100%. A comparação do valor em centavos, antes do arredondamento visual do percentual, diferencia um excesso de um centavo. O painel mostra realizado, agendado, restante, dias, média disponível, ritmo, possível esgotamento e histórico acumulado.

## Fixos e conciliação

O cadastro aceita início e término, crédito, PIX, débito, boleto, dinheiro, outro ou meio desconhecido; conta de origem; beneficiário; faixa estimada e margem. O mês do término é incluído. Não se interpreta ausência de cartão como PIX.

Aliases controlados ajudam a encontrar correspondências, incluindo Wellhub/Gympass. Nome semelhante é sugestão. Conta, valor, recorrência, data e vínculo sustentam a classificação. A revisão permite associar uma compra/assinatura, atualizar o valor previsto, reconhecer gastos independentes ou ignorar a sugestão. Nenhuma linha é apagada ou fundida automaticamente. Cadastros semelhantes exigem revisão ou confirmação explícita de independência.

A chave PIX opcional usa AES-256-GCM, nonce aleatório e autenticação do conteúdo. O valor cifrado é removido dos objetos enviados às páginas; a interface recebe somente a indicação de existência. Exportações não incluem a chave. A derivação depende da chave de sessão configurada: trocar essa chave exige migração dos campos protegidos. Não existe execução de PIX.

Faturas agregadas continuam agregadas. A importação não inventa compras detalhadas nem cria outro fixo por encontrar uma cobrança histórica. Valores atuais sem confirmação permanecem pendências.

## Pagamento e banco

O pagamento de fatura permite quatro situações:

1. Já refletido no saldo informado, mediante confirmação.
2. Vínculo com uma liquidação bancária existente do mesmo cartão, valor e data compatível.
3. Criação explícita de transferência entre a conta que pagou e o cartão, sem consumo adicional.
4. Conciliação pendente.

Uma pendência nova mantém uma obrigação equivalente no patrimônio até a conciliação; liberar a dívida do cartão sem confirmar a saída de caixa não cria riqueza. Pagamentos antigos permanecem com estado legado desconhecido até revisão.

As operações usam transações serializáveis, restrições de unicidade e auditoria. Repetir o mesmo token não paga duas vezes. Desfazer remove apenas a movimentação criada pelo próprio fluxo e ainda inalterada; uma transferência preexistente permanece. Conciliações posteriores são verificadas pelo histórico de auditoria. Movimentações vinculadas ficam protegidas contra alteração financeira e exclusão nos editores genéricos.

## Objetivos

Separar dinheiro existente altera apenas a reserva do objetivo. Uma transferência real altera os produtos bancários, preservando o total e sem criar consumo. Um pagamento real reduz o dinheiro reservado; a amortização de principal só altera uma dívida após confirmação explícita.

A sugestão mensal considera valor já pago, reserva existente e meses restantes, incluindo o mês do prazo. O planejamento libera a reserva financiada no vencimento para evitar somar aportes e obrigação integral como dois pagamentos. Ciclos anuais futuros usam o valor atual como estimativa sinalizada; não criam novo pagamento ou nova reserva real. Recorrência personalizada exige definir manualmente o próximo ciclo.

## Calendário e privacidade

Os marcadores de planejamento são opcionais e consultados apenas quando ativados. Fim de limite, prazo de objetivo e pagamentos planejados têm identificação própria e links para seus cadastros; não entram nos totais de compras do dia. As faturas continuam marcadas pelo vencimento.

O modo privado cobre as novas tabelas, formulários e gráficos. Conteúdo financeiro real, arquivos de origem, relatórios pessoais, backups e screenshots de validação permanecem fora do Git em `.data/`.

## Validação e operação

A migration `20261015042000_financial_planning` acrescenta campos, tabelas de planejamento, vínculos entre entidades do mesmo workspace, índices e restrições. Não remove os registros existentes. Execute `npm run prisma:deploy` e gere o cliente antes de iniciar a aplicação. Faça backup e valide primeiro em uma cópia descartável.

Comandos: `npm run prisma:check`, `npm run typecheck`, `npm run lint`, `npm test -- --maxWorkers=4` e `npm run build`. As suítes PostgreSQL exigem URLs explícitas de bancos descartáveis; nunca usam implicitamente o banco da aplicação. Evidências de execução e conferências pessoais ficam no relatório privado da entrega.

Medição local, mesmos fixtures, uma execução de aquecimento e mediana de cinco repetições: consultas da visão geral passaram de 29 para 27 na base vazia e de 30 para 28 na base com 10 mil transações sintéticas. As medianas observadas foram 21,7 → 32,2 ms e 38,7 → 28,2 ms, respectivamente. Houve redução de consultas; os tempos não demonstram melhora em todos os cenários e variam com a carga local. As configurações novas de planejamento acrescentam leituras próprias quando presentes.

O plano de notificações está em [NOTIFICATIONS_PLAN.md](NOTIFICATIONS_PLAN.md). Nenhum envio foi ativado.
