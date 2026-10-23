# Origem dos dados financeiros

O seletor **Exibir dados** oferece **Consolidado**, **Importações**, **Open Finance** e **Manual**. A escolha fica salva no navegador e vale para visão geral, lançamentos, calendário, contas, faturas, relatórios e cobertura das faturas nas dívidas. As exportações PDF e Markdown identificam o filtro utilizado. Saldos atuais, bens e compromissos planejados continuam como referência; filtrar compras não recalcula um saldo bancário confirmado a partir de uma parte do extrato.

## Um lançamento, várias fontes

`DOCUMENT_V2` é o mecanismo de armazenamento de documentos e de movimentos bancários, não uma origem suficiente para distinguir os dois. A origem considera o cadastro original, as tags do conector e as evidências confirmadas vinculadas à ocorrência.

Uma compra importada de arquivo e depois confirmada pelo banco aparece como **Importação + Open Finance**. Ela pode ser encontrada pelos dois filtros, mas conta uma vez no Consolidado. O mesmo vale para uma entrada manual confirmada pelo banco. O nome, a categoria e as demais informações do cadastro original são preservados.

O calendário e as tabelas identificam a origem de cada lançamento. Faturas conciliadas podem pertencer às duas origens; a identidade da fatura e seu total não são duplicados. No filtro Open Finance, uma fatura exige confirmação publicada pelo banco, não apenas informação de limite.

## Conciliação conservadora

A sincronização vincula automaticamente uma nova evidência a um único lançamento compatível quando conta, data, natureza, valor, descrição normalizada, fatura e metadados de parcela coincidem. Um destino já confirmado por outra ocorrência bancária não recebe automaticamente uma segunda compra. Igualdade de valor, descrições parecidas ou datas próximas não bastam; esses casos continuam para revisão.

A correção das duplicatas existentes preserva os originais em `FinancialSource`, mantém as evidências de ambas as origens e registra o lançamento derivado removido em um snapshot `SOURCE_TRANSACTION_MERGE`. Ajustes necessários para preservar referências de saldo têm origem `SOURCE_RECONCILIATION` e ficam fora do consumo. Pagamentos, contas e faturas quitadas são preservados. A correção aplicada foi precedida de backup com restauração testada em banco isolado.

## Limite utilizado não é fatura

Nos conectores Open Finance, `Account.balance` de um cartão representa o **limite utilizado**, conforme a [documentação oficial da Pluggy](https://docs.pluggy.ai/en/docs/products/accounts). Esse valor pode incluir compromissos futuros e não substitui o total de uma fatura mensal.

O TBB usa faturas efetivamente publicadas em `/bills`. Se a fatura atual não estiver disponível, preserva o cadastro conferido e mantém compras sem ciclo confirmado para revisão. Propostas antigas baseadas em `ACCOUNT_BALANCE` deixam de ser oferecidas; correções dos totais afetados ficam registradas em `SOURCE_INVOICE_CORRECTION`.

## Validação

Os testes cobrem correspondências exatas e divergentes, parcelas e ciclos distintos, filtros por evidência compartilhada, equivalência entre consultas Prisma e SQL e repetição da sincronização sem recriar compras conciliadas. A conferência dos dados reais calcula os mesmos totais na visão geral, no calendário e no extrato de cada origem, sem exportar dados bancários para serviços de IA. As verificações de navegador usam exclusivamente dados sintéticos em banco separado.

Na validação desta entrega passaram 888 testes da suíte padrão, 59 testes de PostgreSQL, typecheck, lint e build de produção. A conferência visual inclui desktop, 390 px e 320 px, seleção persistente entre páginas e modo privado.
