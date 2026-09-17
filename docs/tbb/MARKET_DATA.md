# Market data

Providers ficam atrás de `MarketDataProvider` e `MarketMacroProvider`. Finance e os componentes não dependem diretamente da CoinGecko ou do Banco Central.

## Providers iniciais

- BCB SGS 432: meta Selic vigente, com data de referência.
- BCB SGS 11: Selic diária para a comparação normalizada base 100.
- CoinGecko Simple Price e Search: preço, variação, volume, market cap e busca de cripto.

Cada resposta conserva fonte, referência, coleta, atraso e estado de frescor. `InvestmentMarketSnapshot` aplica TTL e devolve o último cache marcado como `STALE` se o provider falhar. Sem cache, a carteira continua usando o último preço persistido ou o valor manual; uma falha externa nunca transforma a posição em zero.

`COINGECKO_API_KEY` é opcional e permanece somente no servidor. Não há scraping da B3. Ações, ETFs e FIIs continuam manuais até existir um provider autorizado e configurado.

Atualização automática pode chamar a mesma action usada pelo botão de atualização. O agendamento fica fora do domínio para que cron, fila ou plataforma possam ser trocados sem mudar os cálculos.

