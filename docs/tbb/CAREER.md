# Área de Carreira

Expansão do módulo existente, implementada em 02/11/2026. A pesquisa e as decisões anteriores à interface estão em [CAREER_DESIGN.md](CAREER_DESIGN.md).

## Rotas e fluxos disponíveis

| Rota | Uso |
|---|---|
| `/career` | Planilha central, indicadores, agenda compacta, pendências, metas e links |
| `/career/applications` | Tabela, cards e kanban; filtros, agrupamentos, seleção e edições em lote |
| `/career/calendar` | Mês, semana e agenda; entrevistas, prazos, follow-ups, metas e lembretes |
| `/career/resumes` | Perfil base, biblioteca, editor estruturado, PDF, Markdown e versões |
| `/career/pitch` | Perguntas, histórias STAR/CAR, prática e histórico de sessões |
| `/career/links` | Sites, páginas de carreiras e materiais, com prioridade e favoritos |
| `/career/statistics` | Tendências, etapas, respostas, conversões e metas |
| `/career/companies` | Empresas-alvo, prioridade, acompanhamento e páginas de carreiras |
| `/career/contacts` | Contatos anteriores e novos |
| `/career/documents` | Links de documentos anteriores e novos |

`/career/interviews` continua disponível como calendário. Os links antigos `/career/applications/:id` verificam leitura e workspace e abrem o novo drawer. Breadcrumb e Voltar seguem o registro central de navegação; as entradas adicionadas à sidebar têm traduções PT/EN/ES. O conteúdo principal desta primeira entrega é em português, com currículos em PT/EN/ES.

### Planilha

Empresa/cargo ficam fixos durante a rolagem horizontal. Etapa, retorno, data da candidatura e data de follow-up são editáveis nas células. O drawer contém salário, stack, senioridade, modalidade, localização, links, origem, datas, requisitos, currículo enviado, carta, tags, notas e histórico. Entrevistas podem ser marcadas a partir da própria linha ou dos detalhes.

Busca e filtros compostos são aplicados no banco; a busca em stacks e tags também aceita trechos sem diferenciar maiúsculas/minúsculas. Ordenação e agrupamento são independentes. A página carrega 40 registros; cards e kanban representam essa mesma página, enquanto KPIs consideram o pipeline completo. IDs explicitamente selecionados e suas versões são usados nas alterações em lote; um conflito ou referência a outro espaço desfaz o lote inteiro.

Filtros, visualização, agrupamento, ordem e página ficam na URL. Preferências de colunas e larguras ficam no navegador, separadas por pessoa e workspace. Visualizações nomeadas ficam no banco, também por pessoa/espaço, incluindo filtros e colunas. Abrir detalhes não remove os filtros. Tab navega pelos controles, Alt + setas percorre os controles das células e Espaço abre os detalhes da vaga selecionada. Formulários mantêm texto quando há erro e avisam antes de descartar alterações não salvas.

### Calendário

`Interview` é a fonte das entrevistas. `CareerEvent` guarda os outros eventos; não recebe cópias das entrevistas. Follow-ups e prazos são projetados a partir de `Application`, e prazos de metas de `CareerGoal`. Mês, semana, lista e mini calendário usam a mesma projeção.

Eventos têm duração, estado, vínculo opcional com a vaga e link de reunião. Entrevistas exigem vaga, com notas e checklist de preparação. Remarcar atualiza o mesmo registro; cancelar preserva o histórico. Horários de entrada são convertidos do fuso do workspace para UTC, e exibidos novamente nesse fuso. O calendário inclui dados reais dos dias de meses adjacentes. Entrevistas canceladas saem da agenda geral e da lista de próximos compromissos; permanecem identificadas no calendário de carreira.

### Currículos

O perfil base reúne contato, competências e seções estruturadas de experiência, formação, projetos e certificações. Cada currículo pode referenciar as seções desejadas sem copiar obrigatoriamente todo o perfil, ter seções próprias e alterar sua ordem. Título, stack, idioma, situação, favorito, tags, notas, template e espaçamento são editáveis.

Salvar cria uma versão imutável contendo o conteúdo resolvido. Alterar o perfil base não altera o documento que já foi enviado. A candidatura aponta para `ResumeVersion`, e não para um documento mutável. A biblioteca permite duplicar, usar como base, comparar lado a lado e recuperar o conteúdo de uma versão no editor antes de salvar uma nova.

A prévia é o próprio PDF gerado localmente no navegador; salvar e baixar ficam no topo. O PDF é produzido por jsPDF com operadores de texto e anotações de links: não usa screenshot nem rasterização. Há paginação, margens, contagem de páginas e templates Clássico/Editorial, ambos em uma coluna. Markdown também pode ser baixado. `/api/career/resumes/:versionId` exporta a versão preservada, após verificar leitura e workspace. Não há pontuação ATS nem garantia de seleção.

### Preparação e prática

Perguntas têm resposta principal, curta, completa, inglês, pontos-chave, evidências, melhorias, stack, tags, confiança e história real associada. Histórias STAR/CAR guardam contexto, desafio, ações, decisões, resultados, aprendizados e evidências. Nenhuma resposta ou realização profissional é inventada.

A pessoa pode adicionar explicitamente a base de perguntas editáveis. O treino tem meta padrão de 45 minutos, configurável entre 5 e 180, com três blocos sugeridos: apresentação; experiência/problemas; comportamental. O servidor registra início, pausa, retomada, tempo por pergunta, respostas praticadas, confiança e notas. Pausas não contam no tempo. Só pode haver uma sessão aberta por pessoa/espaço, com proteção contra comandos desatualizados.

Atingir a duração não encerra a sessão. Ao escolher **Encerrar e revisar**, a sessão só fica `COMPLETED` se a meta tiver sido atingida e houver uma pergunta explicitamente revisada. Caso contrário, fica como `REVIEW`, preservando a prática realizada sem afirmar que a meta foi concluída. O histórico mostra tempo, respostas, notas e comparação com a sessão anterior.

### Metas e indicadores

Metas podem medir candidaturas, entrevistas, follow-ups enviados, versões de currículo revisadas, treinos concluídos, minutos de prática, empresas acompanhadas ou progresso manual. Cada uma tem período e quantidade, com progresso calculado a partir dos registros nesse período. Filtros da planilha não distorcem os KPIs globais.

O histórico de etapas preserva conversões de processos encerrados. A visão geral aponta follow-ups vencidos, candidaturas paradas, prazos próximos, entrevistas em até um dia sem preparação, currículos sem revisão há 60 dias e empresas-alvo sem candidatura. Cada indicador tem um destino funcional.

## Persistência e segurança

Modelos existentes ampliados: `Application`, `Company` e `Interview`; `Contact`, `Offer`, `CareerDocument` e `ActivityEvent` são mantidos. O indicador de retorno considera apenas respostas de candidaturas efetivamente enviadas; contatos recebidos antes de aplicar não inflam essa taxa. O histórico preserva as conversões, inclusive após arquivar.

Novos modelos: `ProfessionalProfile`, `ResumeProfile`, `ResumeVersion`, `InterviewStory`, `InterviewAnswer`, `PracticeSession`, `CareerEvent`, `CareerGoal`, `CareerLink` e `CareerView`.

As migrações `20261102120000_career_workspace` e `20261102130000_career_query_indexes` são aditivas. A segunda inclui índices para paginação e datas das candidaturas. Foram aplicadas localmente após backup completo com restauração de verificação em banco separado. A auditoria de integridade comparou os registros anteriores em 20 tabelas de identidade, finanças e carreira; os hashes permaneceram iguais. Nenhum dado de demonstração foi adicionado ao banco real.

Leituras usam `READ`; operações usam `WRITE`, independentemente dos botões estarem ocultos. Relações de empresa, currículo, história, entrevista e vaga são verificadas no workspace. Visões e práticas também são separadas por pessoa. Edições dos registros com controle de versão rejeitam formulários desatualizados. Transações protegem versões, histórico, importações e lotes.

Não há dependência de IA, chamadas a modelos ou envio automático de currículos. Os links úteis abrem em nova aba. Links sugeridos e perguntas só são criados após ação explícita; produção inicia com os registros do usuário ou estados vazios.

## Importação e exportação

- `GET /api/career/export` respeita os filtros e exporta CSV UTF-8 de até 10.000 vagas; exige leitura.
- A importação usa esse CSV como modelo, com limite de 100 linhas e 2 MB. Valida o arquivo completo antes de gravar e usa uma transação para o lote. IDs que já existem no workspace são preservados, sem sobrescrever notas. Reenvio do mesmo arquivo é reconhecido por checksum e não cria o lote de novo. Cabeçalho e delimitador seguem o formato exportado.
- Campos potencialmente interpretados como fórmulas por planilhas são protegidos na exportação.
- PDFs e CSV têm cache privado desabilitado; os endpoints não concedem acesso a outros workspaces.

## Validação

Testes de domínio, PostgreSQL, PDF, autorização e navegador usam exclusivamente fixtures sintéticas. O banco de QA é separado; nenhuma captura inclui dados reais.

Jornadas executadas: criar vaga e associar currículo; registrar retorno inline; agendar entrevista e localizá-la no calendário; editar/versionar currículo e obter PDF; praticar com pausa, resposta e revisão; revisar follow-ups da semana. Também foram conferidos seleção em lote, colunas persistidas, visualização salva, exportações, estado vazio e usuário somente leitura.

As capturas em `.data/career-screenshots/` abrangem 1440×900, 1280×800, 768×1024 e 390×844, em temas claro e escuro. Na revisão, os checkboxes foram alinhados, as ações do currículo foram levadas ao topo, a biblioteca foi reorganizada no tablet e os atalhos flutuantes ficaram horizontais nesta área para cobrir menos controles. Nenhuma infraestrutura Playwright estava instalada; a verificação usa Chrome/CDP, sem alegar baselines visuais.

Resultado: 927 testes da suíte padrão passaram; 110 testes dependentes de configuração específica foram explicitamente pulados. Os testes específicos de Carreira foram executados com PostgreSQL e passaram nos 26 casos: 14 de domínio/autorização/PDF e 12 de persistência, isolamento, concorrência e privacidade entre pessoas. Lint, tipos, consistência dos fragmentos Prisma e build de produção passaram. O PDF foi validado por extração de texto, anotações de links e ausência de imagens rasterizadas.

O navegador confirmou as seis jornadas principais, erro de importação, reenvio idempotente de CSV, visualizações salvas, preferências de colunas, operação em lote, endpoints de exportação, usuário somente leitura e estados vazios. Não houve erro de hidratação ou execução nesses cenários. Os artefatos detalhados e as capturas permanecem em `.data`, fora do Git. Durante a validação final, um arquivo de tipos gerado pelo Next terminou com um trecho duplicado; o artefato foi reparado sem apagar o cache do servidor, e a validação passou novamente.

Comandos de validação: `npm test`, `npm run typecheck`, `npm run lint`, `node node_modules/next/dist/bin/next build` e `npm run prisma:check`. O cliente Prisma foi gerado antes do build. No Windows, foi usado um diretório temporário para gerar o cliente sem sobrescrever o engine carregado pelo servidor; depois o servidor local foi reiniciado. A compilação mantém um aviso anterior de rastreamento de arquivos no módulo de storage, sem falha de build.

Os testes de integração de carreira usam `CAREER_TEST_DB_URL` apontando para banco separado terminado em `_qa`, com migrações aplicadas. Sem essa variável, esses testes são explicitamente pulados pela suíte padrão.

## Limites desta entrega

- Arrastar eventos no calendário e arrastar cartões no kanban não foram implementados; agendamento e mudança de etapa usam controles acessíveis.
- Comparação de currículos é textual lado a lado; não há diff semântico nem leitura automática de PDFs externos.
- A data do follow-up representa o próximo contato, e o envio é registrado manualmente. O TBB não envia mensagens ou candidaturas.
- As três partes do treino são orientações de prática; não há gravação de áudio/vídeo ou avaliação automática.
- PDF usa fontes padrão com foco nos idiomas PT/EN/ES; alfabetos que exigem fontes adicionais não fazem parte desta validação.

Próximos refinamentos possíveis são integrar lembretes externos e ampliar templates documentais conforme o uso real, preservando os mesmos dados e fluxos.
