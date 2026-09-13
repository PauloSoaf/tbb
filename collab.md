# Oficina de Planos — Canvas e Biblioteca

## Objetivo

Evoluir a Oficina de Planos para uma experiência de canvas voltada à rotina da nutricionista:

- reordenar alimentos dentro da mesma refeição;
- mover alimentos entre refeições sem recriá-los;
- reordenar os cards de refeição;
- salvar e reutilizar refeições e alimentos;
- manter quantidade, medida caseira, nutrientes e apresentação visual do item;
- preservar a persistência clínica quando um alimento muda de refeição.

## Estado da implementação

- [x] Schema e migração da biblioteca.
- [x] Validação dos dados com Zod.
- [x] Serviços e Server Actions protegidos por tenant/permissão.
- [x] Abas `Modelos`, `Refeições` e `Alimentos` no painel lateral.
- [x] Salvar uma refeição ou um alimento a partir do próprio card.
- [x] Excluir itens salvos da biblioteca.
- [x] Inserir uma refeição salva pelo botão `+` ou por arrastar.
- [x] Inserir um alimento salvo ao arrastá-lo para uma refeição.
- [x] Reordenar alimentos com indicador visual antes/depois.
- [x] Mover alimentos entre refeições em uma única transação do editor.
- [x] Sincronizar no banco a mudança de `mealId` de um alimento existente.
- [x] Compatibilidade temporária com Prisma Client antigo ou banco sem a nova migração.
- [x] Typecheck e lint focado.

## Como usar no editor

### Reordenar ou mover alimentos

1. Segure o ícone de seis pontos no canto do alimento.
2. Arraste dentro da mesma refeição para mudar a ordem.
3. Arraste para qualquer outro card para mover o alimento de refeição.
4. Solte sobre a metade superior/inferior de um alimento para inserir antes/depois dele.
5. Solte no cabeçalho ou no espaço tracejado inferior da refeição para adicionar no final.
6. Clique em `Salvar rascunho` para persistir o canvas e a mudança de refeição no banco clínico.

### Salvar na biblioteca

- O ícone de marcador com `+` no cabeçalho salva a refeição completa e seus alimentos.
- O mesmo ícone dentro do card de alimento salva apenas aquele alimento.
- Os itens ficam isolados por nutricionista; um tenant não lê a biblioteca de outro.

### Reutilizar

- Em `Modelos > Refeições`, use `+` para anexar a refeição ao fim do plano ou arraste-a para o canvas.
- Em `Modelos > Alimentos`, arraste o alimento para o card da refeição desejada.
- A reutilização cria uma cópia independente. Alterar o plano atual não modifica retroativamente o item salvo.

## Arquitetura e segurança

### Banco

Migração: `prisma/migrations/20260815090000_meal_plan_library/migration.sql`.

- `MealPlanLibraryFood`: alimento reutilizável com porção padrão, unidade, medida caseira, nutrientes, imagem e apresentação.
- `MealPlanLibraryMeal`: cabeçalho reutilizável com nome, horário, observações, imagem e apresentação.
- `MealPlanLibraryMealItem`: snapshot ordenado dos alimentos da refeição salva.
- Exclusão em cascata por nutricionista e por refeição salva.
- Índices por nutricionista/data, nutricionista/nome e refeição/posição.

Os registros da biblioteca são snapshots próprios. Eles não apontam diretamente para `Meal` ou `MealItem` de paciente, evitando que a edição de um cardápio altere a biblioteca ou outro paciente.

### Server Actions

Cada leitura/mutação recebe o `nutritionistId` da sessão validada. As Server Actions executam novamente `requirePermission("mealPlans", "edit", tenantSlug)` e não confiam em um ID de nutricionista enviado pelo navegador.

Os campos aceitos passam pelos schemas de `src/validation/meal-plan-library.schema.ts`. O JSON `presentation` é montado por lista permitida de chaves, não pelo objeto inteiro recebido do cliente.

### Drag-and-drop

- Refeições locais: `application/x-nutriopus-meal-position`.
- Alimentos locais: `application/x-nutriopus-meal-item`.
- Refeições da biblioteca: `application/x-nutriopus-library-meal`.
- Alimentos da biblioteca: `application/x-nutriopus-library-food`.

Mover um alimento entre refeições atualiza os dois nós do Tiptap na mesma transação. Ao salvar, `syncMealPlanMeals` procura o `MealItem` no plano inteiro e atualiza seu `mealId`, em vez de excluir e recriar o registro.

## Compatibilidade durante a migração

Em desenvolvimento, `PrismaClient` fica armazenado em `globalThis`. Se `prisma generate` for executado com `npm run dev` aberto, o Windows pode bloquear `query_engine-windows.dll.node` e o processo do Next pode continuar usando os delegates antigos.

Para que um cardápio existente nunca deixe de abrir:

- se o delegate da biblioteca ainda não existir no processo, a leitura retorna biblioteca vazia;
- se as tabelas ainda não existirem (`P2021`), a leitura também retorna biblioteca vazia;
- salvar/excluir mostra uma mensagem com a etapa de migração necessária;
- depois do generate, deploy da migração e reinício, a biblioteca passa a funcionar normalmente.

Essa compatibilidade protege a abertura do editor, mas não substitui a migração.

## Ativação local — PowerShell

Pare primeiro o servidor aberto com `Ctrl+C`. Isso libera o arquivo do Prisma no Windows.

```powershell
npm run prisma:generate
npm run prisma:deploy
npm run dev
```

Use `npm run dev` para desenvolvimento. `npm start` serve somente uma build de produção já criada.

Se quiser testar o modo de produção local:

```powershell
npm run prisma:generate
npm run prisma:deploy
npm run build
npm start
```

Não execute `next build` diretamente no PowerShell; o executável local é resolvido pelos scripts do npm.

## Deploy

Ordem recomendada no ambiente de deploy:

```powershell
npm ci
npm run prisma:deploy
npm run build
npm start
```

Antes de aplicar em um banco compartilhado, confira as migrações pendentes:

```powershell
npx prisma migrate status
```

O repositório possui outras migrações atuais além da biblioteca. `prisma migrate deploy` aplica todas as migrações pendentes em ordem; o banco e o código devem ser publicados na mesma entrega.

Para Vercel ou outra plataforma com comando de build, use um pipeline que execute `npm run prisma:deploy` com acesso ao banco antes/na etapa de release e depois `npm run build`. Nunca rode `prisma migrate dev` em produção.

## Verificações realizadas

- `npx prisma format` — schema formatado.
- `npx prisma validate` — schema válido.
- `npx tsc --noEmit` — sem erros de TypeScript.
- ESLint focado nos arquivos da biblioteca/canvas — sem erros; o aviso de dependência do efeito foi corrigido.

Não foi executada build completa nem suíte completa de testes, conforme a orientação de evitar verificações demoradas durante esta tarefa.

## Arquivos principais

- `prisma/schema.prisma`
- `prisma/migrations/20260815090000_meal_plan_library/migration.sql`
- `src/validation/meal-plan-library.schema.ts`
- `src/services/meal-plan-library.service.ts`
- `src/actions/meal-plan-library.action.ts`
- `src/lib/meal-plan/library-types.ts`
- `src/lib/meal-plan/library-canvas.ts`
- `src/components/meal-plan-studio/StudioLibraryPanel.tsx`
- `src/components/meal-plan-studio/MealPlanStudio.tsx`
- `src/components/meal-plan-studio/TiptapCanvas.tsx`
- `src/components/meal-plan-studio/tiptap/MealExtension.ts`
- `src/components/meal-plan-studio/tiptap/MealNodeView.tsx`
- `src/services/meal-plan.service.ts`

## Abertura de modelos no Estúdio

- A URL do editor passou a ser criada por `routes.oficinaStudio(tenant, mealPlanId)` nos cards, na tabela e após duplicar um modelo. Isso evita variações entre os pontos de navegação.
- A rota dinâmica ganhou `loading.tsx`. Além do skeleton imediato, esse arquivo permite ao Next pré-carregar o segmento dinâmico antes do clique, inclusive quando o servidor de desenvolvimento ainda precisa compilar a rota.
- O botão **Abrir no Estúdio** inicia seu estado de loading no clique primário, preserva `Ctrl`/`Cmd` + clique para nova aba, informa `aria-busy` e bloqueia cliques duplicados.
- Criações de cardápio e duplicações agora invalidam também a URL exata do novo `mealPlanId`, além da listagem. Isso impede que uma resposta `not-found` antiga permaneça no Router Cache configurado por `staleTimes.dynamic`.
- A resolução no servidor continua filtrando simultaneamente `id` e `nutritionistId`, depois de `requirePermission("mealPlans", "edit", tenant)`. Portanto a correção de navegação não amplia acesso entre tenants.

## Loading assíncrono — cardápio e Estúdio

- `MealPlanClientView` separa `pendingAction` entre ativação e adição de refeição. Somente o botão que iniciou a operação mostra spinner; os demais comandos remotos ficam protegidos contra concorrência sem bloquear a edição do cardápio.
- A aplicação de um modelo a um paciente, na Oficina, usa `AsyncButton`, mantém o modal visível com `aria-busy` e spinner durante a criação/navegação e possui guarda contra clique duplicado.
- As ações remotas do `StudioToolbar` (`salvar`, `salvar modelo`, `duplicar`, `excluir` e `usar para paciente`) usam `AsyncButton`. O link direto de PDF usa `PendingButtonLink`.
- Duplicar, aplicar ao paciente, excluir e abrir a prévia PDF mantêm o loading até a URL de destino realmente substituir a tela. Em falha de validação/servidor, o estado é liberado para nova tentativa.
- Controles locais do canvas, incluindo edição inline, drag-and-drop, layout e blocos, permanecem interativos; somente ações remotas potencialmente concorrentes são protegidas.
- `StudioCanvas.tsx` foi auditado e atualmente não é importado/renderizado por nenhuma tela. O Estúdio ativo usa `TiptapCanvas`, portanto não foram adicionadas mudanças a código morto.

## Loading assíncrono — padrão do sistema

Foi feita uma auditoria estática dos componentes TSX do projeto (469 arquivos no snapshot da tarefa), cobrindo aproximadamente 513 botões, 177 links e 27 navegações programáticas. A classificação separou operações remotas de controles locais para que o sistema mostre progresso quando existe espera real, sem criar piscadas em abas, menus, tema/idioma, edição inline, drag-and-drop, undo/redo ou botões de abrir/fechar modal.

### Componentes compartilhados

- `AsyncButton`: executa handlers que retornam `Promise`, impede clique duplicado, preserva a largura do conteúdo e expõe `disabled`, `aria-busy` e região de status.
- `PendingSubmitButton`: usa `useFormStatus` para formulários React/Server Actions e mantém o mesmo padrão visual.
- `PendingButtonLink`: usa `useLinkStatus` dentro do `Link`, mostra spinner/texto durante a transição e preserva clique modificado/nova aba.
- `NavigationFeedback`: fallback global para links internos legados, com barra de progresso no topo; downloads, links externos e nova aba são ignorados.
- `ContextualHomeLink`: resolve o início correto para dashboard, portal e admin, evitando enviar uma nutricionista autenticada à landing page a partir de um 404.

### Cobertura aplicada

- administração, dashboard, cards de configuração, notificações e navegação mobile;
- pacientes, avaliações antropométricas, prontuário, metas, tags e equipe;
- agenda, atendimento clínico, chat, links do paciente e encerramento/reabertura de sessão;
- login/logout do nutricionista e do portal do paciente;
- Oficina de Planos, cardápios, biblioteca, aplicação ao paciente e visualização PDF;
- auditoria, alertas de segurança, sessões, armazenamento administrativo e transcrições;
- tarefas/metas do portal, lista de compras e histórico de dobras cutâneas.

Nos painéis com várias linhas, o estado usa uma chave de ação + ID. Assim, somente o item acionado mostra spinner; os demais itens não fingem estar processando a mesma operação. Downloads e clipboard mantêm feedback próprio (`download`/`Copiado`) em vez de um loading de navegação.

### Verificação desta etapa

- documentação do Next 16 para navegação, `useLinkStatus` e `loading.tsx` lida antes da implementação;
- `npx tsc --noEmit` aprovado;
- ESLint focado nos componentes compartilhados e domínios alterados aprovado;
- testes focados de rotas/Estúdio aprovados pelo fluxo da correção (25 casos);
- build e suíte completa não foram executados, conforme a orientação de evitar ciclos demorados nesta etapa.

## Prévia das refeições salvas na biblioteca

- Cada card de refeição salva agora calcula, a partir dos alimentos já carregados, os totais de calorias, carboidratos, proteínas e gorduras; nenhuma tabela ou action nova foi criada.
- O card cresce suavemente no hover e no foco de teclado para revelar até cinco alimentos com nome e quantidade. Listas maiores exibem `+N`, sem impor altura fixa quando abertas.
- O indicador de quantidade também funciona como botão com `aria-expanded`, permitindo manter a prévia aberta em telas touch e fechá-la novamente.
- Drag-and-drop e ações de adicionar/excluir foram preservados. O botão assíncrono de adicionar uma única refeição de um modelo usa loading direcionado e bloqueia somente o clique duplicado daquele item.
