# Modelo de dados de Investments

`InvestmentAccount` representa a custódia e pode se vincular a uma `Account` de Money. A instituição é dado da conta; bancos e corretoras não possuem tabelas próprias.

`InvestmentAsset` descreve o ativo e sua classe. Perfis opcionais guardam os campos específicos de renda fixa e imóveis. `InvestmentPosition` é o estado materializado por conta e ativo; ele é recalculado a partir das operações e evita refazer todo o histórico em cada renderização.

`InvestmentTransaction` registra compras, vendas, aportes, retiradas, custos e desdobramentos. O vínculo opcional com `FinanceTransaction` registra a transferência de caixa sem contar o aporte como despesa. `InvestmentIncome` aplica a mesma regra para dividendos, juros, cupons e aluguel recebidos.

Quantidades usam `Decimal(30,12)`, preços usam `Decimal(30,8)` e valores consolidados usam centavos inteiros. Isso conserva frações de cripto e evita operações monetárias com ponto flutuante.

As demais entidades cobrem preços e fontes, snapshots diários, benchmarks, catálogo versionado de produtos, orçamento mensal, alocação alvo, metas, watchlists, pesquisa, alertas, trades e revisão mensal. Todas as entidades do usuário mantêm `workspaceId`; leituras Partner/Together validam a política no servidor.

