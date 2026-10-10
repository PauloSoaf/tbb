# Finance Import Engine

Entradas CSV, PDF textual e clipboard convergem para ImportBatch. O fluxo é Upload/Paste → Parse → Map → Normalize → Validate → Rules → Deduplicate → Preview → Confirm → Report.

O parser preserva aspas, células vazias, UTF-8, vírgulas em descrições e delimitadores vírgula, ponto e vírgula ou tab. Datas BR/ISO e dinheiro BR/EUA são normalizados com testes de precisão.

O fingerprint usa workspace, conta, data, valor, tipo e descrição normalizada, ou externalId quando presente. A origem não participa, então dedup funciona entre canais.

Preview e mapping ficam no batch para lotes de até 5.000 linhas; arquivos originais grandes não são mantidos depois da confirmação. Linhas inválidas e duplicadas não são importadas. Rollback remove somente transações do batch com revisão zero e preserva as editadas depois.

PDF usa `unpdf`, limites de 5 MB, 100 páginas e timeouts. O extrator produz candidatos intermediários; nunca cria FinanceTransaction diretamente.

Faturas de cartão usam um importador próprio (JSON `schemaVersion` 1.0) em Finance → Faturas, restrito ao titular do workspace da sessão. A prévia valida o arquivo e o resumo declarado, resolve os cartões existentes (ambiguidade bloqueia) e mostra o que será criado, atualizado, mantido ou está em conflito, sem gravar. A identidade de cada fatura é a `externalKey` ou, para arquivos de outra data-base, cartão + período, então reimportar não duplica. A confirmação reaplica o plano numa transação serializável e só grava se ele for idêntico ao aprovado; nunca rebaixa uma fatura paga, nunca aplica dados mais antigos e nunca apaga um valor salvo com um nulo. Os valores anteriores de cada fatura atualizada ficam no ActivityEvent da importação. O arquivo enviado não é armazenado.
