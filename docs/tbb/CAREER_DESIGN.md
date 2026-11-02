# TBB Carreira: decisões antes da implementação

Pesquisa realizada em 02/11/2026 nas documentações públicas abaixo. É uma análise dos padrões documentados, não acesso autenticado a esses produtos. Não serão copiados marcas, imagens nem layouts.

| Referência | Padrão observado | Aplicação no TBB |
|---|---|---|
| [Linear: custom views](https://linear.app/docs/custom-views) | Filtros duráveis, URLs de visualizações, painel lateral contextual e peek | Filtros na URL, visualizações salvas por pessoa/espaço e detalhes sem perder a planilha |
| [Attio: table views](https://attio.com/help/reference/managing-your-data/views/create-and-manage-table-views) | Atributos editáveis, filtros compostos, ações em lote, colunas ocultáveis e redimensionáveis | Status/retorno/data editáveis, seleção explícita, preferências persistidas e busca combinada com filtros |
| [Airtable: grid](https://support.airtable.com/articles/7905594155-airtable-grid-view) | Linhas densas, campos relacionados, expansão do registro e colunas configuráveis | Empresa/cargo fixos, dados secundários opcionais, edição detalhada em drawer e agrupamentos |
| [Ashby: candidate pipeline](https://docs.ashbyhq.com/candidate-pipeline) | Grupos de etapas, perfil aberto sobre o pipeline e movimentações em lote | Histórico de candidatura, entrevistas vinculadas e métricas que preservam etapas anteriores |
| [Reactive Resume](https://github.com/reactive-resume/reactive-resume) | Conteúdo estruturado, apresentação separada, preview e exportação documental | Perfil base reutilizável, snapshots imutáveis por versão, templates sóbrios e PDF vetorial |
| [FullCalendar React](https://fullcalendar.io/docs/react) | Mesma fonte de eventos em mês, semana e lista; fusos explícitos | Projeção única de entrevistas, lembretes, follow-ups e metas, sem duplicar entrevistas |
| [TanStack Table](https://tanstack.com/table/latest/docs/overview) | Motor headless com seleção, filtros e paginação | Avaliado; a consulta paginada no Prisma e controles HTML nativos atendem à primeira entrega sem adicionar motor de estado paralelo |

## Sistema visual existente

Usar `--background`, `--card`, `--muted`, `--foreground`, `--muted-foreground`, `--border`, `--primary`, `--success`, `--warning` e `--danger`. Os temas existentes continuam sendo a fonte de cor. Componentes reaproveitados: Modal/drawer, ActionForm, KeepFormValues, tooltips, breadcrumb/Voltar, ícones Lucide e funções de fuso/calendário. CSS restrito a `.career-*`, sem redesenhar outros módulos.

## Composição por página

- Visão geral: cabeçalho curto, indicadores em faixa, planilha dominante e painel lateral recolhível com calendário, ações de hoje, metas e atalhos.
- Vagas: mesma planilha ampliada, busca/filtros/agrupamento, tabela/cards/kanban e drawer. Campos de edição rápida exibem salvamento/erro. Seleção em lote vale para os registros explicitamente selecionados.
- Calendário: navegação por mês/semana/lista, duração e fuso visíveis, seleção de dia e edição dos registros originais.
- Currículos: biblioteca compacta à esquerda; editor estruturado e preview à direita. Perfil base, referências de seções, versões anteriores, comparação e PDF com texto e links.
- Preparação: biblioteca de perguntas, editor e prática; histórias STAR/CAR reutilizáveis, cronômetro persistido pelo servidor, pausas e revisão explícita.
- Links: busca, tipo/prioridade/favoritos; empresas e documentos antigos mantidos acessíveis.
- Metas/estatísticas: tendências e conversões a partir do histórico persistido, metas mensuráveis e ações para pendências.

## Integridade e privacidade

Reutilizar `Application`, `Company`, `Interview` e `ActivityEvent`. Migração aditiva, sem apagar dados. Entrevista não terá cópia em uma tabela paralela. Referências entre entidades verificadas no mesmo workspace; leitura e escrita respeitam permissões. Não enviar currículos ou informações de carreira a provedores de IA. Produção começa vazia; perguntas e links sugeridos são adicionados por ação explícita, sem fabricar realizações ou candidaturas.

Verificação: testes de regras, isolamento/concorrência com PostgreSQL separado, jornadas reais com fixtures sintéticas e capturas desktop 1440×900, notebook 1280×800, tablet 768×1024 e celular 390×844 em temas claro/escuro. PDF deve ser inspecionado por extração de texto e links, sem rasterizar o documento.
