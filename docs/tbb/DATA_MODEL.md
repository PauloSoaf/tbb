# Modelo de dados

Core contém User, Workspace, Membership, UserSession, Permission, ActivityEvent, Notification, planos, limites, uso e StorageFile.

Life contém Habit, HabitSchedule, HabitEntry, Task, Project e Goal. Datas civis de hábitos e prazos são strings ISO `YYYY-MM-DD`; instantes agendados são UTC e projetados no fuso do workspace.

Finance contém Account, FinanceTransaction, FinanceCategory, Budget, Subscription, Debt, SavingsGoal, ImportBatch, ImportMapping e TransactionRule. Dinheiro usa centavos inteiros. Saldo de conta é derivado de saldo inicial e lançamentos; drafts ficam apenas no cliente.

Career contém Company, Application, Contact, Interview, Offer e CareerDocument. Application registra status e próxima ação; mudanças criam ActivityEvent.

Índices começam por workspace nos caminhos de acesso principais. Relações compostas em Career impedem associar entidades de workspaces diferentes.

CardStatement guarda faturas agregadas de cartão e previsões mensais ao lado do ledger, sem criar FinanceTransaction: compras e faturas nunca são contadas duas vezes. Cada linha pertence ao workspace e ao cartão (`Account` CREDIT_CARD) por chave composta. Status: PAID (histórico), OPEN (dívida atual), FUTURE_KNOWN (fatura futura conhecida) e FORECAST (previsão por competência, sem vencimento). Datas nulas significam "não informado" e nunca são inferidas; restrições CHECK impedem previsão com vencimento, data de pagamento fora de fatura paga e chave de período divergente. Uma previsão que pode já estar contida numa fatura fica PENDING (`overlapsStatementId`) e não entra em nenhum total até ser conciliada. Faturas são privadas do titular: as visões de parceiro e Juntos não as carregam.
