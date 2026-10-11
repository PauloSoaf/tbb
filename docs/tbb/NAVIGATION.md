# Navegação do aplicativo

`navigation-registry.ts` resolve a trilha de breadcrumb, o pai usado como destino alternativo de Voltar e os parâmetros que devem acompanhar links ancestrais. Os rótulos do menu vêm de `navigation.ts` e das traduções; Admin, importações, revisão semanal, convite de parceiro e rotas de detalhe têm resolução explícita. Rotas desconhecidas usam o ancestral registrado mais próximo, ou Hoje quando não há ancestral.

Detalhes de hábito e candidatura passam o título amigável já carregado pela página para `BreadcrumbTitle`; o breadcrumb nunca mostra o id da URL nem consulta o banco para obter outro nome. Se o título ainda não chegou, aparece um rótulo traduzido. A página atual recebe `aria-current="page"`; ancestrais navegáveis são links. `scope` acompanha links ancestrais de investimentos, sem copiar filtros não declarados.

O botão Voltar usa uma pilha por aba em sessionStorage, com no máximo cinquenta URLs internas. A URL inclui a query, preservando filtros ao voltar. Refresh não repete a última visita; retornar a uma página anterior consome a pilha para evitar ciclos. Acesso direto ou storage indisponível usa o pai do registro. JSON inválido é descartado, e destinos externos, URLs iniciadas em `//` ou contendo barras invertidas são ignorados. O aplicativo não chama `history.back()`.

`AppNavigationBar` fica acima do conteúdo e fora da topbar com autohide, mantendo Voltar e breadcrumb acessíveis mesmo quando a topbar está recolhida. No mobile, a trilha oculta ancestrais intermediários e trunca rótulos para caber na largura disponível. O título da página continua visível no conteúdo.

A sidebar retraída é um rail de 72px com ícones centrados, grupos separados e nomes acessíveis. Tooltips aparecem por hover ou foco; o botão de painel alterna explicitamente entre retraída e expandida. Passar o mouse no rail não expande o menu. A preferência fica no localStorage; no mobile, o botão de menu abre a navegação em um painel próprio.

Os testes percorrem todos os arquivos de página autenticada, expandem as seções dinâmicas, verificam fallback, parâmetros, refresh, retorno com filtros, limite da pilha e storage corrompido. O QA visual usa sessões e dados sintéticos em banco descartável, temas claro/escuro e larguras desktop/mobile.
