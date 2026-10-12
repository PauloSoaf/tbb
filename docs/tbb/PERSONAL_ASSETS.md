# Bens pessoais

O cadastro em `/finance/assets` acompanha veículos, eletrônicos, imóveis e outros bens pelo valor atual estimado de revenda. Pode ser aberto pelo menu Dinheiro → Bens, pelo menu Mais da visão geral ou pelo link do indicador Patrimônio. Interface e navegação disponíveis em PT/EN/ES.

## Cadastro e manutenção

- Nome, tipo, valor atual estimado e data da avaliação são obrigatórios. Valor zero é válido; valores negativos, centavos inválidos e datas futuras são rejeitados.
- Valor de compra, data de compra, observações e dívida vinculada são opcionais. A avaliação não pode anteceder a compra informada.
- Editar permite atualizar a avaliação. A versão do registro impede que um formulário antigo sobrescreva uma alteração recente.
- Arquivar pede confirmação, preserva o registro e o retira do patrimônio. Restaurar usa a última avaliação, que pode ser editada depois.
- Dívida vinculada é uma referência a `Debt` do mesmo workspace. A tela mostra seu saldo ativo e oferece acesso ao cadastro de dívidas. Não cria financiamento automaticamente nem altera a dívida ao arquivar um bem.

## Patrimônio e dinheiro disponível

`patrimônio total = patrimônio financeiro líquido + valores de revenda dos bens ativos`

O componente financeiro mantém a regra anterior: contas e reservas, ajuste de investimentos, menos compromissos registrados dos cartões e saldos de dívidas ativas. Ele já inclui as deduções; vincular um financiamento a um bem não o desconta novamente. Compras parceladas incluídas em faturas continuam nas faturas e não devem ser repetidas como uma dívida independente.

O preço de compra é informativo. Cadastrar, avaliar, arquivar ou restaurar um bem não gera `FinanceTransaction`, não muda o saldo das contas e não cria receita, despesa, fatura ou pagamento. Compras e vendas com movimento de dinheiro devem ser registradas pelo fluxo de transações existente. Os bens ficam fora da cobertura de faturas, do fluxo de caixa e do uso da renda. Um imóvel já registrado em Investimentos não deve ser repetido aqui.

O tooltip do indicador Patrimônio separa o componente financeiro dos bens. Relatórios completos PDF/Markdown incluem bens ativos, avaliações, informações de compra, dívida vinculada e a composição do patrimônio.

## Persistência e acesso

`PersonalAsset` pertence ao workspace da sessão. Valores usam centavos inteiros em BRL; datas de avaliação/compra são `DATE`; `archivedAt` preserva os registros retirados e `version` controla alterações concorrentes. Índices cobrem workspace/arquivamento e a relação com a dívida. A migration é aditiva, sem mudanças nos dados financeiros existentes.

A página exige READ. Cadastro, edição, arquivamento e restauração exigem WRITE efetivo no servidor, respeitando as permissões e overrides existentes. Controles de alteração ficam ocultos quando WRITE está negado. O workspace enviado pelo formulário é ignorado; a dívida e o bem são conferidos no espaço da sessão. Alterações e auditoria são atômicas. Relatórios completos continuam restritos ao titular; esta feature não amplia o acesso a faturas privadas.

## Verificação funcional

Use um workspace sintético para cadastrar um bem, editar sua avaliação, vincular um financiamento já existente, arquivar e restaurar. Confira a soma no Patrimônio e a exportação PDF/Markdown, preservando caixa, lançamentos e total das dívidas. Valide um usuário com READ sem WRITE, e confirme que IDs de outro workspace e versões antigas são rejeitados.

## Validação de 12/10/2026

Typecheck, build de produção, lint dos arquivos alterados, validação do schema e status das migrations aprovados. A suíte completa passou em 406 de 407 testes; a falha restante é a comparação antiga de caminho POSIX com caminho Windows no storage.

Foram aprovadas 41 verificações distintas no Chrome contra o build de produção, com dados sintéticos. A conferência cobriu cadastro, avaliação, vínculo ao financiamento, arquivamento/restauração, proteção contra formulário desatualizado e IDs de outro espaço, soma dos bens no patrimônio, preservação dos registros financeiros, downloads PDF/Markdown, PT/EN/ES e permissões com overrides. Telas e formulários foram verificados em 320, 375, 768 e 1440 px, nos temas claro e escuro, sem overflow horizontal nem erros de runtime/hidratação. O formulário em celular permite rolar os campos dentro do diálogo.
