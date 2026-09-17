# Trading journal

O journal registra operações que o usuário já realizou. Ele não possui credenciais de corretora, execução de ordens ou automação de compra e venda.

Cada `InvestmentTrade` guarda conta, ativo, direção, entrada, saída, quantidade, custos, stop, alvo, estratégia, setup, notas e estado. Operações abertas permanecem fora das métricas que exigem saída; fechadas entram no P&L e na curva de resultados.

As métricas são descritivas: P&L bruto e líquido, win rate, ganho e perda médios, profit factor, expectativa, drawdown máximo e R médio. O produto não concede pontos por frequência, lucro, risco ou alavancagem.

Pesquisa e watchlist são independentes da posição e do journal. Um ativo pode ser estudado sem ser comprado, e um ativo manual pode existir na carteira sem provider de mercado.
