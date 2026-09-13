# Auditoria de reaproveitamento da interface

O commit `9ecde2d` é o catálogo visual do NutriOpus usado na criação do TBB. A auditoria compara esse catálogo com o produto atual e registra a decisão de cada conjunto genérico. Nenhum item clínico, marca NutriOpus ou rota de paciente foi transportado para o domínio do TBB.

| Área do catálogo | Decisão | Implementação no TBB |
| --- | --- | --- |
| Sidebar expansível, animação, persistência e tooltips recolhidos | **ADAPT** | `AppShell` conserva o comportamento com a navegação Life, Money e Career. |
| Cabeçalho, breadcrumb e estados de navegação | **ADAPT** | Busca, loading por rota, avatar e controles globais permanecem no shell. |
| Temas, paletas, prévia, contraste e favoritos | **RESTORE** | `ThemeToggle`, `CustomThemeDialog`, `ThemePreviewDots` e utilitários vieram do catálogo; armazenamento e marca foram adaptados para TBB. |
| Idiomas PT/EN/ES e troca instantânea | **RESTORE** | Provider, cookie, persistência local e controle animado são globais; o vocabulário do shell é do TBB. |
| Central de notificações | **ADAPT** | O sino e painel suspenso mostram somente notificações persistidas do workspace TBB. |
| Command palette | **RESTORE** | Busca global, atalho e comandos rápidos usam entidades do TBB. |
| Dock flutuante e gavetas | **ADAPT** | Ferramentas clínicas deram lugar a agenda, ledger, importação, hábitos, metas, insights e calculadora. |
| Assistente com histórico e provider | **ADAPT** | Drawer e composer mantêm o padrão; provider autenticado consulta agregados reais e não altera dados automaticamente. |
| Agenda semanal/mensal e drawer | **ADAPT** | Projeta tarefas, entrevistas, metas e assinaturas sem duplicar entidades. |
| Configurações em seções | **ADAPT** | Perfil, workspace, aparência, idioma, notificações, finanças, integrações, dados e segurança. |
| Navegação inferior móvel | **ADAPT** | Today, Tasks, criação rápida, Finance e Career. |
| Modais, drawers, tooltips e estados vazios/loading | **RESTORE** | Continuam como fundação compartilhada com tokens TBB. |
| Gráficos | **ADAPT** | Linguagem analítica comum via Bklit com dados próprios do TBB. |
| Pacientes, consultas, antropometria, prescrição e prontuário | **INTENTIONALLY_REMOVED** | Domínio exclusivo do NutriOpus. |
| Calculadoras nutricionais, TACO, macros, água e IMC | **INTENTIONALLY_REMOVED** | Ferramentas clínicas não pertencem ao produto pessoal. |
| Integrações clínicas e páginas de tenant de consultório | **INTENTIONALLY_REMOVED** | Integrações do TBB terão contratos próprios. |
| Marca, textos e chaves locais NutriOpus | **INTENTIONALLY_REMOVED** | Marca TBB e namespaces `tbb-*` evitam acoplamento. |

## Regra arquitetural

TBB e NutriOpus são produtos independentes construídos sobre a mesma família de produtos. Eles compartilham padrões de interação, linguagem de design, componentes fundamentais e convenções de engenharia, enquanto mantêm domínios, repositórios, bancos de dados e roadmaps completamente independentes.

## Critério futuro

Um componente genérico continua compartilhando a linguagem visual quando funciona sem modelos clínicos. Componentes que conhecem pacientes, consultas, prontuários ou prescrições ficam no NutriOpus. Uma adaptação do TBB troca contratos e vocabulário, preservando o comportamento maduro quando ele continua adequado.
