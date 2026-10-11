# Finance Import Engine

Entradas CSV, PDF textual e clipboard convergem para ImportBatch. O fluxo é Upload/Paste → Parse → Map → Normalize → Validate → Rules → Deduplicate → Preview → Confirm → Report.

O parser preserva aspas, células vazias, UTF-8, vírgulas em descrições e delimitadores vírgula, ponto e vírgula ou tab. Datas BR/ISO e dinheiro BR/EUA são normalizados com testes de precisão.

O fingerprint usa workspace, conta, data, valor, tipo e descrição normalizada, ou externalId quando presente. A origem não participa, então dedup funciona entre canais.

Preview e mapping ficam no batch para lotes de até 5.000 linhas; arquivos originais grandes não são mantidos depois da confirmação. Linhas inválidas e duplicadas não são importadas. Rollback remove somente transações do batch com revisão zero e preserva as editadas depois.

PDF usa `unpdf`, limites de 5 MB, 100 páginas e timeouts. O extrator produz candidatos intermediários; nunca cria FinanceTransaction diretamente.

Faturas de cartão usam um importador próprio (JSON `schemaVersion` 1.0) em Finance → Faturas, restrito ao titular do workspace da sessão. A prévia valida o arquivo e o resumo declarado, resolve os cartões existentes (ambiguidade bloqueia) e mostra o que será criado, atualizado, mantido ou está em conflito, sem gravar. A identidade de cada fatura é a `externalKey` ou, para arquivos de outra data-base, cartão + período, então reimportar não duplica. A confirmação reaplica o plano numa transação serializável e só grava se ele for idêntico ao aprovado; nunca rebaixa uma fatura paga, nunca aplica dados mais antigos e nunca apaga um valor salvo com um nulo. Os valores anteriores de cada fatura atualizada ficam no ActivityEvent da importação. O arquivo enviado não é armazenado.

A resolução segue `externalKey` → cartão + período → cartão + competência informada (`referenceMonth`). Quando a terceira chave encontra uma única previsão mensal e o arquivo fornece uma fatura conhecida, o plano usa `PROMOTE`: mantém o id, substitui a chave externa e o período e grava `reconciliation=NOT_REQUIRED` junto com `overlapsStatementId=null`. A promoção preserva os valores anteriores no snapshot de auditoria. Uma previsão posterior à fatura conhecida, múltiplos registros salvos na competência, uma previsão marcada como incluída em outra fatura ou com gastos somados geram `CONFLICT`. Não é criado outro registro para contornar o conflito. O parser também rejeita duas linhas do mesmo cartão com a mesma competência no arquivo.

A importação não escreve em FinanceTransaction nem Debt. Ela pode ler os detalhes das compras para impedir que um novo valor fique abaixo do detalhamento existente ou que uma atualização altere o valor declarado sem esclarecer gastos somados manualmente. Os valores efetivos das faturas são calculados pelas consultas usando o vínculo e o modo de detalhe, conforme [o modelo de dados](DATA_MODEL.md). Totais agregados não viram compras no ledger, e previsões pendentes não comprometem limite.

Reimportar um arquivo idêntico resulta em `KEEP` sem escrever faturas, contas ou eventos de auditoria. A confirmação exige o fingerprint da prévia e rejeita mudanças intervenientes no plano; pular conflitos depende da opção explícita da confirmação. As server actions autorizam somente OWNER e obtêm workspace e ator da sessão, ignorando ids de workspace enviados no formulário. O limite compartilhado por Finance, Contas e Faturas e as regras de leitura privada também estão descritos no modelo de dados.

Testes e QA usam dados sintéticos. Verificações de dados pessoais são somente leitura; backups, arquivos de sessão, JSONs privados e screenshots locais ficam em `.data/`, ignorada pelo git. O QA com gravações usa um banco descartável com `DATABASE_URL` **e** `DIRECT_URL` apontando para ele, pois o CLI do Prisma usa a URL direta nas migrations.
