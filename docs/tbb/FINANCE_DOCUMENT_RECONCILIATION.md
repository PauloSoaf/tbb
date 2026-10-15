# Documentos financeiros e conciliação

O fluxo em `/finance/imports` reutiliza `ImportBatch`, regras, `FinanceTransaction`, `CardStatement` e `Subscription`. Os originais e seus candidatos são privados do titular. O workspace e o ator vêm da sessão; nenhum formulário escolhe outro workspace. A interface permite retomar fontes, corrigir candidatos, transcrever fotos manualmente, revisar o total da fatura e confirmar apenas ocorrências aprovadas.

## Fontes e limites

`FinancialSource` conserva bytes originais, SHA-256, conta, nome, tipo e lote. Conta + workspace + hash é único: trocar o nome do mesmo upload não cria outra fonte. O endpoint de visualização exige OWNER e READ do mesmo workspace, retorna 404 para acesso indevido e usa `private, no-store`, `nosniff` e sandbox.

CSV preserva aspas/delimitadores e dinheiro em centavos. XLSX lê abas, datas Excel nos sistemas 1900/1904 e os valores armazenados; fórmulas não viram ocorrências confirmadas. O parser de PDF textual usa coordenadas, colunas e zonas de compras, pagamentos e produtos. Resumos, código de barras, CET, mínimo, limites e cronograma futuro não viram despesas. Datas parciais exigem ciclo comprovado, incluindo o índice da parcela para anos anteriores. Linhas não reconhecidas permanecem em revisão. Imagens sem OCR ficam explicitamente pendentes e aceitam formulário de transcrição ou JSON revisado `finance-evidence/1` com `rows` no formato de `import-candidates.ts`.

Limites: 5 MB por arquivo, 20 MB por envio, 100 fontes, 5.000 candidatos, 40 páginas PDF, 20 abas e 50 MB descompactados. ZIP valida diretório central, nomes duplicados, traversal, links, criptografia, métodos, cabeçalhos e razão máxima de expansão antes de descompactar. ZIP aninhado/executáveis, macros, entidades XML e links externos não são aceitos. Validações não autorizam descartar silenciosamente candidatos financeiros incertos.

## Identidade e revisão

`FinancialEvidence` identifica uma posição única dentro do original. Guarda a transcrição original imutável, candidato atual, decisão, versão, ator, data e vínculo canônico a transação ou pagamento. Uma compra pode ter múltiplas evidências; uma posição nunca é usada como falso identificador bancário.

Identidade forte é o ID do banco ou um vínculo já reconciliado. Conta, valor, estabelecimento normalizado e datas próximas geram uma hipótese, que exige decisão. Igualdade de valor sozinha não une compras. `CREATE`, `KEEP`, `LINK_EVIDENCE`, `ENRICH_METADATA`, `AMBIGUOUS`, `CONFLICT` e `IGNORE` distinguem as ações. Compra recorrente repetida em datas distintas e parcelas de competências distintas permanecem eventos separados. Uma nova ocorrência provável exige confirmação de que é separada.

Enriquecimento não substitui descrições, categorias ou tags manuais. Preenche metadados vazios e corrige a data efetiva de importações não editadas baseadas apenas na postagem quando uma compra é confirmada por outra fonte. Edições manuais preservam a data. Revisão explícita de câmbio referencia a compra original e pode corrigir seus metadados; jamais cria outra despesa. `FinancialSnapshot` conserva o antes/depois das revisões privadas, e `ActivityEvent` registra ator e versão sem expor os dados da revisão aos demais membros.

## Datas, consumo e faturas

`date` é a data efetiva do evento. `purchasedDate`, `postedDate`, `occurredAt` UTC, `occurredTimezone` e `dateBasis` preservam a diferença entre compra e processamento. Hora desconhecida é nula. Horários locais ambíguos/inexistentes exigem revisão. O calendário usa a compra quando confirmada e exibe a postagem separadamente.

`eventKind` distingue financiamento, parcelas, compras e encargos. Parcela de refinanciamento conserva o vínculo à fatura, mas `isConsumption=false` impede tratá-la como nova compra nos gráficos, calendário e orçamentos. Conversões de limite não são importadas automaticamente como consumo ou renda. Valores originais e cotação não criam outra transação em moeda estrangeira; IOF identificável pode ser uma linha própria. Cotação inconsistente gera revisão de metadados com o gasto em BRL preservado.

Totais são snapshots de `CardStatement`, separados das compras. Detalhes incluídos usam `ALREADY_INCLUDED`; uma fonte parcial não autoriza completar o total com ajustes. Snapshots são imutáveis, datados e vinculados ao original; uma versão antiga ou alteração de fatura quitada é bloqueada. Correções preservam IDs e verificam período, competência, datas próximas, versão e detalhamento. `OPEN` exige vencimento. Valor futuro conhecido e histórico pago podem manter o dia exato nulo, usando competência na chave; o calendário não inventa vencimentos.

`CardStatementPayment` registra pagamento e sua origem, sem salário ou consumo fictício e sem presumir a conta de dinheiro de origem. Um total histórico bruto desconta pagamentos vinculados para obter o saldo. Um snapshot já atualizado pelo banco (`amountIsOutstanding`) desconta apenas pagamentos posteriores à data-base; pagamentos anteriores ou do mesmo dia já estão no valor confirmado. Histórico com `rolledIntoStatementId` continua parcialmente pago, mas seu saldo já está na fatura seguinte e fica fora da soma de obrigações, cobertura, limite e vencimentos. O vínculo é confirmado por evidência do mesmo cartão, nunca por mera soma coincidente.

Planos de assinatura permanecem projeções. `subscriptionId` liga cobranças reais ao plano e impede acrescentar outra previsão equivalente ao fixo já registrado. Preço e próxima data estimados são identificados; moeda/preço original ficam separados da previsão em BRL. O limite informado pelo banco é um snapshot próprio, separado da estimativa feita pelos compromissos registrados.

## Transações e rollback

Confirmação revalida titularidade, conta, referências e o token da prévia, incluindo versões das faturas, dentro de transação SERIALIZABLE com lock por workspace/conta. Índices únicos protegem fontes, evidências e fingerprints contra retries/importações concorrentes. Uma prévia desatualizada deve ser refeita; nenhuma decisão é repetida silenciosamente.

Rollback remove apenas lançamentos criados pelo lote sem edição, vínculos de investimento ou evidências de outros lotes. Pagamentos com outras evidências são preservados. Linhas manuais e enriquecidas de outro lote permanecem; snapshots e originais não são apagados. Ocorrências removidas voltam à revisão, permitindo reimportação controlada.

## Baixa manual e procedência das faturas

O TBB não consulta o banco. Por isso cada fatura mostra, num tooltip, três datas que não se confundem: quando o registro mudou no TBB, até que dia vai a informação do banco (`sourceAsOf`) e quando o titular a conferiu com o documento original (o último `FinancialSnapshot` da fatura). A origem (arquivo JSON importado ou documento conferido) aparece junto, e informação bancária com mais de 35 dias é marcada como não confirmada. Tudo é formatado no servidor, no fuso do workspace e com o deslocamento visível (`statement-provenance.ts`), para o navegador não discordar do servidor. O tooltip também abre por toque e por teclado.

**Marcar fatura como paga** (somente OWNER, com `WRITE`) oferece resultados escolhidos pelo titular, sem nada pré-selecionado: quitar o saldo restante; pagar só uma parte (a fatura continua aberta com o saldo menor); pagar uma parte, ou nada, e transportar o restante para a fatura seguinte do mesmo cartão (a fatura é encerrada e o saldo não é somado outra vez); e, quando o saldo já está na fatura seguinte, encerrar a fatura como paga sem pagar nada agora. Nesse último caso a data do encerramento é a do último pagamento registrado, ou nenhuma. A data nunca é futura, e "não sei a data" grava o pagamento sem data, nunca uma data inventada. A prévia descreve o resultado em linguagem simples e exige confirmação explícita.

As regras ficam em `statement-payment.ts` (puras) e `statement-payment-service.ts` (transação serializável). Cada pedido leva um token que vira o fingerprint do pagamento, então clique duplo ou retry não paga duas vezes; um pagamento de mesmo valor e data numa fatura é recusado, a menos que a data ou o valor mude. Uma trava otimista (`updatedAt` da fatura) recusa formulários desatualizados. O pagamento é um `CardStatementPayment` com `origin=MANUAL_VERIFIED`, acompanhado de um `ActivityEvent` com antes e depois. Nenhuma despesa é criada e nenhum saldo de conta muda. O titular pode desfazer a última baixa manual de uma fatura (`undoStatementPayment`), o que restaura o estado anterior e registra outro evento.

## Validação e operação

Testes de parser, sinais, datas, hipóteses de identidade, ZIP e DST usam exemplos sintéticos. A integração PostgreSQL exige `FINANCE_IMPORT_TEST_DB_URL` apontando explicitamente para banco descartável; cobre concorrência, retry, pagamento parcial, vínculo, metadados, permissões e rollback. A base pessoal não é usada como banco de testes. Uma importação autorizada exige backup restaurável, comparação antes/depois, relatório por fonte e nova prévia com zero criações inesperadas. Documentos reais, dados financeiros, cookies e backups nunca entram no Git.
