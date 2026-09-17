# Cálculos de Investments

## Posição e custo médio

Compras adicionam `valor bruto + taxas + impostos` ao custo. Em venda parcial, o custo removido é proporcional à quantidade vendida. O resultado realizado é `valor líquido da venda - custo removido`; o custo médio das unidades restantes não muda. Desdobramentos alteram quantidade sem alterar custo total.

Valor atual é `quantidade × preço atual`. Resultado não realizado é `valor atual - custo contábil`. O resultado total mostrado soma realizado, não realizado e rendimentos registrados.

## Alocação e benchmark

O peso de uma classe é `valor da classe / valor total`. Desvio é `peso atual - alvo definido pelo usuário`, em pontos percentuais. A comparação histórica começa cada série em 100; a linha da carteira representa a evolução do patrimônio registrado e, por isso, identifica explicitamente que inclui aportes.

## Renda fixa e poupança

Projeções são cenários com capitalização mensal. Produtos tributáveis usam a tabela regressiva configurada no motor; isentos retornam imposto zero. Poupança usa a regra condicional pela Selic e recebe TR como premissa explícita. Prefixados e IPCA+ projetados não substituem marcação a mercado antes do vencimento.

## Imóveis e trading

Equity imobiliário é `valor estimado - saldo financiado`. Yield líquido anual considera aluguel efetivo após vacância e custos mensais. Valorização estimada permanece resultado não realizado.

Trading calcula P&L líquido após taxas e impostos, win rate, médias, profit factor, expectativa, drawdown e múltiplo R. Nenhum cálculo envia ou simula uma ordem de corretora.

