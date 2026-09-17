# TBB Investments

Investments é um submódulo de Money. Ele reutiliza o shell, temas, idioma, sidebar, busca, assistente, calendário e componentes visuais do TBB.

Documentos de referência: [modelo de dados](./INVESTMENT_DATA_MODEL.md), [market data](./MARKET_DATA.md), [cálculos](./INVESTMENT_CALCULATIONS.md) e [trading journal](./TRADING_JOURNAL.md).

## Modelo financeiro

- Valores monetários persistidos usam centavos inteiros. Quantidades aceitam até 12 casas e preços até 8 casas.
- O custo médio considera compras, vendas parciais, taxas, impostos e desdobramentos. Vendas não reescrevem o custo histórico das unidades restantes.
- Uma `InvestmentAccount` pode apontar para uma conta de Money. Quando um aporte tem conta de origem e a conta de investimento está vinculada, o sistema cria uma transferência em Money. Assim, o aporte não vira despesa.
- No patrimônio consolidado, contas vinculadas já carregam o principal transferido. O Finance adiciona somente a diferença de valor e o resultado realizado. Carteiras sem vínculo entram pelo valor atual.
- Cotações indisponíveis não zeram posições. O último valor persistido ou o custo registrado continua visível e a fonte aparece como manual ou desatualizada.

## Fontes externas

| Dado | Provider | Cache | Fonte exibida |
| --- | --- | --- | --- |
| Meta Selic | Banco Central do Brasil, SGS 432 | 12 horas | URL oficial, referência e horário de coleta |
| Histórico Selic | Banco Central do Brasil, SGS 11 | 12 horas | série diária e comparação normalizada base 100 |
| Cripto | CoinGecko Simple Price | 2 minutos | provider, horário do dado, coleta e atraso |
| Busca cripto | CoinGecko Search | 24 horas | provider no cadastro do ativo |

Falhas externas usam cache persistido quando existe. O sistema não raspa a B3, não inventa cotações e não simula ordens de mercado.

`COINGECKO_API_KEY` é opcional. Sem a chave, o provider usa a API pública e continua sujeito aos limites dela.

## Produtos de renda fixa

`InvestmentProductDefinition` guarda instituição, nome, indexador, taxa, elegibilidade, limite, liquidez, fonte, validade e data da última verificação. Uma alteração de regra cria uma nova versão; não se deve sobrescrever a histórica.

O catálogo inicial inclui Caixinha Nubank, Turbo 115 e Turbo 120 conforme a fonte oficial verificada em 15/09/2026. Elegibilidade e limites precisam ser confirmados no aplicativo da instituição. Essas definições são editáveis no produto e não ficam embutidas no cálculo.

## Importação

A tela `Money → Investments → Importar` aceita CSV UTF-8 de até 5 MB, separado por vírgula, ponto e vírgula ou tab. Reconhece cabeçalhos genéricos e nomes comuns em exportações B3/corretora.

Colunas obrigatórias:

- data;
- tipo/operação;
- ticker/código de negociação;
- quantidade;
- preço ou valor total.

Opcionais: nome, taxas, impostos, instituição/conta e ID externo. O ID externo ou uma identidade determinística da linha evita importações duplicadas. O usuário vê uma prévia antes de confirmar.

PDF de nota ou extrato e OCR ficam adiados. A interface informa essa limitação e recomenda CSV; não tenta inferir operações de um documento sem leitura segura.

## Integrações internas

- **Today:** mostra patrimônio investido, renda do mês ou o vencimento mais próximo e oferece atalho de aporte.
- **Calendar:** inclui vencimentos de renda fixa dentro do período visível.
- **Assistant:** resume a carteira, renda e vencimentos e calcula cenários simples com fonte e premissas explícitas. Perguntas de investimento com valores não são classificadas como despesas.
- **Partner:** usa a permissão `investments`; Partner e Together são somente leitura e mantêm os registros em seus workspaces de origem.
- **Finance:** transferências de aporte não entram em receitas ou despesas e o patrimônio evita contar o principal vinculado duas vezes.

## Verificação

Os testes de `calculations.test.ts` cobrem custo médio, vendas parciais, taxas, desdobramentos, precisão cripto, juros compostos, renda fixa, poupança, alocação, benchmark, imóveis e métricas de trading.
