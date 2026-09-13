# Modelo de dados

Core contém User, Workspace, Membership, UserSession, Permission, ActivityEvent, Notification, planos, limites, uso e StorageFile.

Life contém Habit, HabitSchedule, HabitEntry, Task, Project e Goal. Datas civis de hábitos e prazos são strings ISO `YYYY-MM-DD`; instantes agendados são UTC e projetados no fuso do workspace.

Finance contém Account, FinanceTransaction, FinanceCategory, Budget, Subscription, Debt, SavingsGoal, ImportBatch, ImportMapping e TransactionRule. Dinheiro usa centavos inteiros. Saldo de conta é derivado de saldo inicial e lançamentos; drafts ficam apenas no cliente.

Career contém Company, Application, Contact, Interview, Offer e CareerDocument. Application registra status e próxima ação; mudanças criam ActivityEvent.

Índices começam por workspace nos caminhos de acesso principais. Relações compostas em Career impedem associar entidades de workspaces diferentes.
