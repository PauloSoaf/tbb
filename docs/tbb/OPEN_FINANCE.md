# Open Finance pelo Meu Pluggy

Integração de **uso pessoal**, gratuita, para trazer saldos bancários, movimentos, compras de cartão e faturas do titular para o TBB. Não é uma integração comercial, não guarda senhas bancárias e não usa APIs não oficiais nem scraping.

## O que a documentação oficial confirma (consultada em 17/10/2026)

- **Custo e limite.** O Meu Pluggy é gratuito para uso pessoal, sem diligência prévia, com até **5 conexões** e sem uso comercial. Quem constrói produto para terceiros deve usar a integração regular.
- **Como conecta.** O titular conecta cada banco em meu.pluggy.ai (cada banco é autorizado separadamente). No Dashboard da Pluggy, com a mesma conta, cria uma aplicação, mantém o conector **MeuPluggy** ativo e, em Aplicações → Demo → Conectar Conta, escolhe MeuPluggy. Cada banco vira um *item*; o `itemId` está em Itens Conectados.
- **Autenticação.** `POST https://api.pluggy.ai/auth` com `clientId` e `clientSecret` devolve uma `apiKey`, usada no cabeçalho `X-API-KEY`. A chave vale 2 horas. O Client Secret aparece uma única vez no Dashboard e só pode existir no servidor.
- **Atualização.** O Meu Pluggy atualiza os dados a cada 24 horas. Os itens **não podem ser atualizados manualmente**. `GET /v2/items` não existe para o Meu Pluggy, por isso o `itemId` é guardado pelo TBB.
- **Endpoints usados.** `GET /items/{id}`, `GET /accounts?itemId=`, `GET /v2/transactions?accountId=` (paginação por cursor, página de até 500). O `GET /transactions` antigo está **descontinuado e some em 31/12/2026**; contas de aplicação criadas antes de junho de 2026 continuam valendo por ora, as novas devem usar o v2.
- **Limites de taxa.** 360 requisições por minuto, por IP e por endpoint; excedido, a Pluggy responde 429 com `Retry-After: 60`. A página tem mais de um ano, então os números podem ter mudado.
- **Modelo da transação.** `type` (`DEBIT` ou `CREDIT`) é independente do sinal de `amount`. Em cartão, valor positivo é cobrança. `status` é `PENDING` (inclui parcelas futuras e fatura aberta) ou `POSTED`. `providerId` só vem de conectores Open Finance. Uma transação pode ser **apagada e recriada com outro id** quando data, descrição ou valor mudam demais; `transactions/deleted` traz só ids e pode reaparecer.
- **Duplicidade.** Reconectar um banco cria um item novo com ids novos, e a Pluggy não deduplica entre itens.
- **Webhooks.** Exigem URL HTTPS pública (localhost não é aceito) e não têm assinatura. O TBB roda no computador do titular, então **não usa webhooks**: consulta por agendamento.

## O que a documentação não responde e precisa de validação prática

| Ponto | Por que importa | Como validar |
|---|---|---|
| Quais bancos o próprio Meu Pluggy expõe (Nubank, Itaú, PicPay) | A tabela de cobertura lista Nubank, Itaú e PicPay no Open Finance regular, mas a linha MeuPluggy não diz quais instituições estão disponíveis | Conectar em meu.pluggy.ai |
| Sentido do valor em conta corrente | Não está documentado; o TBB usa `type`, não o sinal | `npm run open-finance:probe` |
| `providerId` presente no MeuPluggy | Identidade estável para não duplicar | Probe |
| Formato do `next` do cursor v2 | O cliente aceita query string, caminho, URL da Pluggy ou cursor simples, mas só a prática confirma | Probe |
| Faturas (`/bills`) e `billId` para cartões | O retorno depende do conector; uma compra sem fatura/ciclo confirmado exige revisão | Probe e conciliação de crédito |
| Parcelamento (`installmentNumber`, `totalInstallments`) | `totalAmount` não vem de conectores Open Finance | Probe |
| Data como meia-noite UTC ou com horário | Evita deslocar o dia em fuso atrás de UTC | Probe |
| Renovação de consentimento | A autorização da aplicação dura um ano e é separada do consentimento de cada banco | Reautorizar MeuPluggy na Demo do Dashboard e conferir o novo `itemId` antes de retomar |

O probe imprime **só a estrutura** (nomes de campos, enums, contagens, sinais), nunca descrição, valor, nome, documento ou id.

## Primeiro acesso após conectar o banco

1. Entre no [Dashboard da Pluggy](https://dashboard.pluggy.ai) com a mesma conta do Meu Pluggy. Em **Customização → Conectores**, habilite **MeuPluggy** se usar seleção personalizada.
2. Em **Aplicações → sua aplicação → Demo → Conectar Conta**, escolha **MeuPluggy** e autorize a aplicação. Depois copie o `itemId` do banco em **Itens Conectados**. Essa autorização permite ao TBB ler a conexão que você já criou no Meu Pluggy.
3. Guarde o Client ID e o Client Secret dessa aplicação apenas no `.env` local, nos campos `PLUGGY_CLIENT_ID` e `PLUGGY_CLIENT_SECRET`. O script usa `@next/env` para carregar os arquivos de ambiente do projeto, inclusive `.env.local`, respeitando sua precedência.
4. Na raiz do TBB, execute o diagnóstico somente de leitura. No **PowerShell**:

```powershell
$env:PLUGGY_ITEM_ID = "ITEM_ID_COPIADO_DO_DASHBOARD"
npm run open-finance:probe
Remove-Item Env:\PLUGGY_ITEM_ID
```

O diagnóstico autentica na Pluggy e consulta item, contas, transações e, se houver cartão, a estrutura de faturas. Não acessa o Prisma, não grava no banco do TBB e não sincroniza nem ajusta saldos. A leitura real ainda precisa ser validada; testes com respostas simuladas não a substituem.

5. Aplique a migração no banco real somente após revisar as migrações pendentes, verificar um backup recuperável e obter autorização do titular. Essa etapa é separada do diagnóstico.
6. Com a migração aplicada e as credenciais configuradas, abra **Integrações → Open Finance** e adicione a conexão pelo Item ID. O padrão é sincronizar todas as contas e cartões, buscando o histórico mais antigo disponível, sem impor uma data de início. O TBB reutiliza contas identificadas sem ambiguidade e cria os produtos que ainda não existem. Se vários cartões puderem corresponder ao mesmo cadastro antigo, escolha esse vínculo em **Ajustes avançados** antes de sincronizar novamente. O botão **Sincronizar todos os bancos · histórico completo** aplica esse padrão às conexões ativas.

### Renovação da autorização

A [documentação oficial do Meu Pluggy](https://docs.pluggy.ai/pt/docs/guides/meu-pluggy-personal-use), conferida em 21/10/2026, informa que a autorização de leitura da aplicação dura **um ano**. Ela é separada do consentimento concedido a cada banco. A gratuidade do uso pessoal continua após o período de teste do Dashboard.

Para renovar, repita **Aplicações → sua aplicação → Demo → Conectar Conta → MeuPluggy** e autorize novamente. Uma sincronização ou atualização pela API não renova essa autorização. Confira o `itemId` resultante: ele pode mudar. Se mudou, pause a conexão antiga e valide a nova antes de habilitá-la, conciliando o histórico já importado. O TBB não migra automaticamente vínculos entre Item IDs distintos.

### Adicionar Itaú e PicPay junto ao Nubank

Em **Bancos conectados → Seus bancos no TBB**, os atalhos **Conectar Itaú** e **Conectar PicPay** abrem o cadastro com o nome preenchido e as instruções de autorização. Use a mesma aplicação e as credenciais que já estão no servidor; cada banco precisa do seu próprio Item ID. Cole-o diretamente no TBB, sem enviar identificadores ou dados bancários pelo chat.

Ao cadastrar cada conexão, o TBB tenta sincronizar automaticamente. Não é preciso preencher uma data nem salvar cada produto. Em **Ajustes avançados**, é possível corrigir um vínculo, desabilitar um produto ou limitar o período; uma data vazia significa todo o histórico disponível. **Sincronizar seleção** respeita esses filtros, assim como a execução agendada. **Sincronizar tudo** habilita todos os produtos identificados e volta a consultar o histórico completo. Produtos ambíguos nunca são reunidos automaticamente num único cartão antigo.

Cada revisão de fatura identifica a conexão e o cartão, e oferece somente as faturas daquele cartão. Isso evita confundir bancos que tenham o mesmo vencimento. O motor de débito/crédito é compartilhado: detalhes entram como já incluídos, pagamentos e transferências incertos aguardam conciliação, e faturas incompletas exigem conferência. O conector pode oferecer produtos e campos diferentes em cada instituição; o cadastro não confirma que um banco foi autorizado ou que publicou sua fatura atual.

Os testes com respostas sintéticas cobrem Nubank, Itaú e PicPay no mesmo espaço: identidades de movimentos iguais entre bancos, contas e faturas existentes, repetição sem duplicatas, PIX próprio já registrado e falha isolada de um cartão. A validação real de uma instituição exige a conexão autorizada pelo titular, conforme o [guia oficial do Meu Pluggy](https://docs.pluggy.ai/pt/docs/guides/meu-pluggy-personal-use).

## Arquitetura

```
Nubank / Itaú / PicPay
        │  (consentimento do titular)
   Meu Pluggy  ── atualiza a cada 24 h
        │  HTTPS, X-API-KEY (só no servidor)
 Next.js: pluggy-client  ─ retry com backoff, Retry-After, cursor, validação lenta
        │
 sync.ts ── reserva por conexão ── janela por conta ── normalize.ts
        │
 Revisão de documentos existente (FinancialSource / FinancialEvidence)
   · identidade estável (providerId, senão id da Pluggy)
   · possível duplicata ⇒ revisão
   · espelho de transferência própria já registrada ⇒ liquidado
        │  só o inequívoco é criado
 Banco do TBB (FinanceTransaction, source DOCUMENT_V2, desfazível por lote)
```

Nada duplica a modelagem de transações: o Open Finance entra como mais uma origem do pipeline de documentos que já concilia, revisa e desfaz.

## Banco de dados

Três tabelas novas e nenhuma alteração nas existentes (migração `20261017150000_open_finance_foundation`):

- `OpenFinanceConnection`: o `itemId` fica **criptografado** (AES-256-GCM) com um hash chaveado só para impedir conexão repetida. Guarda estado do provedor, última sincronização, próximo ciclo do Meu Pluggy, prazo de consentimento, código do último erro (curto) e a reserva contra sincronizações simultâneas.
- `OpenFinanceAccountLink`: cada conta do banco, a conta do TBB que a recebe, a **data de início opcional**, se está habilitada e o último saldo informado pelo banco. A descoberta cria o vínculo desabilitado; a configuração automática habilita os produtos identificados e deixa a data vazia para consultar todo o histórico disponível.
- `OpenFinanceSyncRun`: histórico com contagens (lidos, criados, para revisar, já conhecidos, pendentes ignorados, fora da janela) e código de erro. Sem valores nem descrições.

## Regras de sincronização e conciliação

1. **Histórico completo por padrão.** O pedido à Pluggy omite `dateFrom` na sincronização completa; o limite real é o histórico que o banco disponibiliza. Uma correspondência única reutiliza o cadastro local. Números finais ou nomes específicos ajudam a distinguir produtos; vários candidatos exigem escolha. Produtos novos recebem cadastro próprio, sem substituir saldos ou faturas dos demais.
2. **Identidade.** `providerId` quando existe, senão o id da Pluggy, sempre no escopo da conta. O mesmo movimento é preparado uma vez só. A execução agendada usa uma janela de 10 dias antes do último movimento; a sincronização manual completa consulta novamente todo o histórico e reconhece os registros já existentes. Ampliar um período também limpa o cursor anterior.
3. **Só o inequívoco é criado sozinho:** entrada ou saída simples, estorno, tarifa, IOF e juros, com todos os dados confirmados. Vai para a **revisão** (Importar → Retomar revisão de um original): possível duplicata de lançamento manual (mesma conta, valor, tipo, até 3 dias e nome parecido), pagamento de fatura de cartão, movimento entre contas da mesma titularidade e qualquer linha com dado incerto.
4. **Pagamento de fatura nunca vira gasto**: as compras do cartão já contam.
5. **Transferência própria.** Um PIX que o titular já registrou como transferência entre contas aparece no banco como entrada ou saída. A prévia da revisão reconhece essa linha e a liquida, em vez de contar o dinheiro duas vezes. Para identificar a mesma titularidade, compara-se o documento da contraparte: o recebedor nas saídas e o pagador nas entradas. A presença do titular no seu próprio lado do PIX não transforma um pagamento a terceiros ou um recebimento em transferência própria. Essa interpretação segue os campos `payer`, `receiver` e `type` da [documentação de transações da Pluggy](https://docs.pluggy.ai/pt/docs/products/transactions).
6. **Pendentes** (`PENDING`) da conta bancária não são importados; entram quando liquidam. No cartão, compras da fatura aberta e parcelas futuras podem ser pendentes e são aceitas quando a fatura/ciclo está confirmado. Isso não cria saída na conta de débito.
7. **Id mudou na Pluggy** (apagado e recriado): o movimento reaparece com outro id e é tratado como possível duplicata, não como novo.
8. **Dados pessoais.** O número do documento de pagador e recebedor é usado só em memória para reconhecer a mesma titularidade e nunca é gravado.
9. **Erros** viram código curto e mensagem em português; o corpo da resposta do provedor nunca é registrado.

## Cartões, faturas e parcelas

- **Vínculo.** Uma conta `CREDIT` da Pluggy só pode apontar para `CREDIT_CARD` no mesmo workspace. A data inicial é opcional; sem ela, busca todo o histórico disponível. A conta bancária continua separada e seus saldos não são ajustados pelo fluxo do cartão.
- **Leitura completa.** `/bills` é percorrido por página; `/v2/transactions` usa cursor. Um retorno inválido impede a conciliação daquele cartão e aparece como falha parcial da conexão, preservando o restante.
- **Identidade da fatura.** O vínculo é guardado em `FinancialSnapshot`, com origem imutável em `FinancialSource`. Na primeira conciliação, vencimento exato ou uma previsão única do período permitem reaproveitar o ID existente. Uma previsão passa a fatura conhecida; datas divergentes ou múltiplos candidatos exigem revisão. Nenhuma tabela adicional é necessária para crédito.
- **Atualização do total.** O total do banco é o valor de face, separado dos pagamentos registrados. Compras importadas recebem `ALREADY_INCLUDED`; não são somadas novamente à fatura. Quando existem compras manuais `ADDED_TO_STATEMENT`, a base armazenada é o total do banco menos esses acréscimos, mantendo o total efetivo uma vez só.
- **Fatura ainda não publicada.** No Meu Pluggy/Open Finance, `Account.balance` representa limite utilizado, incluindo compromissos futuros, conforme a [documentação de contas](https://docs.pluggy.ai/en/docs/products/accounts). Esse valor nunca é convertido em total de fatura. Sem uma fatura publicada em `/bills`, o cadastro conferido permanece preservado e compras sem ciclo confirmado aguardam revisão.
- **Preservação.** Em Sincronizar tudo, uma fatura aberta com cartão e datas compatíveis pode adotar o valor bancário. Datas divergentes, alterações manuais posteriores, detalhamento maior que o total, saldo restante, sobreposição, transporte de saldo e faturas quitadas são protegidos. O histórico já quitado mantém também suas datas e metadados locais em leituras repetidas. O snapshot guarda a versão da fatura e a identidade dos acréscimos manuais. Atualizações posteriores só são automáticas enquanto esse vínculo continua válido e a fonte não é mais antiga que a conciliação local.
- **Revisão de faturas.** Em Bancos conectados, “Faturas para conciliar” mostra total do banco, candidatos locais e situação. Confirmar exige selecionar o registro correto e conferir o total. O servidor verifica titularidade, conta, versão e colisões novamente. Uma quitação nova continua no fluxo de pagamento das Faturas, que também concilia a conta bancária.
- **Ciclo sem `billId`.** Uma compra pendente pode usar uma fatura publicada e conciliada quando os fechamentos anterior e atual são conhecidos e a data está estritamente entre eles. Limite utilizado não confirma esse ciclo. Na ausência desses dados, a compra aguarda revisão; vencimentos e parcelas restantes não são inventados.
- **Parcelamento.** Número, total de parcelas, data da compra e valor original são preservados quando informados. Cada lançamento representa somente sua parcela; `totalAmount` nunca multiplica o valor nem gera parcelas novas. A data de lançamento e a competência da fatura permanecem separadas da compra original.
- **Correções do provedor.** Um lançamento já importado cujo valor muda gera conflito, preservando o lançamento local. Uma ocorrência ainda não revisada pode receber nova evidência quando o banco completa a fatura; a fonte antiga permanece no histórico. Revisões feitas pelo titular não são substituídas.
- **Pagamentos e estornos.** Um pagamento de cartão nunca vira despesa nem receita; fica para conciliar com os pagamentos existentes. Estornos são classificados pela direção e tipo declarados. Nenhum pagamento ou ajuste de saldo é criado automaticamente só porque uma fatura venceu.
- **Privacidade.** Toda a conciliação roda no servidor local com regras determinísticas. O caminho de sincronização não chama APIs de IA e não registra respostas bancárias em logs.

## Estados da conexão

`ACTIVE`, `PAUSED`, `ERROR` (falha temporária ou reconexão necessária), `CONSENT_EXPIRED`. Pausada ou com consentimento expirado, a conexão não sincroniza até ser retomada. Remover uma conexão mantém os lançamentos já importados.

## Segurança

- `PLUGGY_CLIENT_ID` e `PLUGGY_CLIENT_SECRET` só no `.env` do servidor; nunca em `NEXT_PUBLIC_*`, nunca no git. Nenhuma credencial chega ao navegador.
- `OPEN_FINANCE_DATA_KEY` (opcional, 32+ caracteres) protege os `itemId`; sem ela usa `JWT_SECRET`.
- Somente o **titular** do espaço vê e opera as integrações; o modo parceiro não as expõe.
- O endpoint agendado exige `Authorization: Bearer` com `OPEN_FINANCE_CRON_SECRET` (24+ caracteres), comparado em tempo constante.
- Chamadas à Pluggy só para `https://api.pluggy.ai`, sem seguir redirecionamentos; um cursor que aponte para outro host é recusado.
- O modo privado (olho) cobre a tela de bancos conectados.

## Endpoints (prontos para o app React Native)

Todos sobre as mesmas funções de serviço; nenhuma regra fica no cliente.

| Rota | Uso |
|---|---|
| `GET /api/open-finance/connections` | Conexões, contas e as últimas sincronizações, sem `itemId` |
| `POST /api/open-finance/sync` `{ connectionId }` | Sincroniza uma conexão |
| `GET`/`POST /api/open-finance/cron` | Execução agendada; exige o segredo |

Hoje a autenticação é a sessão por cookie do app. Para o aplicativo móvel basta envolver estas rotas numa verificação de token de portador, sem mexer na lógica. A confirmação de conciliações usa as ações que a revisão de documentos já tem.

## Agendamento

O Meu Pluggy atualiza a cada 24 horas, então uma execução a cada 6 a 12 horas basta (a rota ignora conexões sincronizadas há menos de 3 horas).

- **Windows (computador do titular):** Agendador de Tarefas chamando `curl -H "Authorization: Bearer <segredo>" http://localhost:3000/api/open-finance/cron`.
- **Vercel:** adicionar em `vercel.json` `"crons": [{ "path": "/api/open-finance/cron", "schedule": "0 9 * * *" }]` e definir `CRON_SECRET` (a rota lê `OPEN_FINANCE_CRON_SECRET` ou `CRON_SECRET`). O plano gratuito limita a uma execução por dia. Não foi adicionado ao `vercel.json` porque o banco de produção pode ser outro.

## Custo recorrente estimado

R$ 0. Meu Pluggy gratuito (uso pessoal, até 5 conexões). Sem custo de API. Se o uso virar comercial ou passar de 5 conexões, o plano regular exige contato comercial.

## Fora do escopo desta etapa

- **Pagamentos de cartão automáticos.** A quitação e a conciliação com a conta de débito continuam no fluxo de pagamentos existente; o Open Finance apresenta a evidência para revisão.
- **Transferências entre duas contas conectadas** (PIX do titular para ele mesmo, entrando em uma e saindo da outra) sem registro prévio: hoje as duas linhas vão para a revisão por terem a mesma titularidade.
- Saldo do banco pré-preenchendo "Atualizar saldos" (a diferença já aparece na tela).
- Verificação de token de portador para o aplicativo móvel e captura de notificações do Android, que usará o mesmo mecanismo de conciliação.

## Validação do crédito

A cobertura inclui compras pendentes, ciclos sem `billId`, parcelas incompletas, paginação de faturas, repetição sem duplicatas, correções do provedor, preservação de pagamentos e histórico quitado, promoção de previsão, mudanças manuais e bloqueio do uso de limite como total de fatura. Os testes de PostgreSQL usam um banco descartável e respostas sintéticas da Pluggy.

A tela foi verificada em desktop, 390 px e 320 px, incluindo privacidade, escolha do cartão, confirmação de fatura, bloqueio para não titulares e erros de console/hidratação. Tipos, lint e compilação de produção também fazem parte da validação.

Sincronizar tudo usa os valores confirmados pelo banco para as faturas abertas que tenham correspondência segura, sem alterar histórico quitado ou inventar pagamentos. As divergências protegidas permanecem em **Faturas para conciliar**. Uma compra que exceda o valor da fatura aguarda revisão sem impedir a importação dos demais itens do lote. A ação lê os dados disponíveis; não solicita atualização do Meu Pluggy.

## Histórico e referências de saldo

Movimentos antigos entram nas datas originais para calendário e relatórios. Quando antecedem uma referência de saldo já acompanhada, o efeito líquido do histórico é compensado por um lançamento `ADJUSTMENT` de origem `OPEN_FINANCE_HISTORY`, sem consumo, receita ou despesa. O saldo inicial existente não é sobrescrito. Um saldo conferido explicitamente (`BALANCE_RECONCILIATION`) prevalece sobre datas sugeridas automaticamente: movimentos até esse dia já estão contemplados na referência; movimentos posteriores atualizam o saldo. A referência e a origem ficam preservadas em snapshots e no lote; a confirmação manual posterior de evidências usa a mesma proteção. Em contas novas, o saldo informado pelo banco é a referência inicial.

## Calendário após sincronizar

O calendário lê os lançamentos efetivamente confirmados. A página dedicada mostra até três itens por dia e mantém todos os detalhes ao selecionar a data; a visão geral conserva a grade compacta. Enquanto visível, o calendário atualiza a cada 30 segundos, além de atualizar ao recuperar foco e pelo botão Atualizar. Pendências da Pluggy aparecem separadas, com atalho para revisão, e não entram nos totais antes da conciliação. As compras importadas são identificadas como Pluggy nos detalhes.

### Verificação em 23/10/2026

- 876 testes da suíte padrão e 57 testes de integração com PostgreSQL passaram. Os cenários de integração usam dados sintéticos em banco separado e incluem repetição sem duplicatas, saldo conferido, ampliação do período e confirmação posterior do histórico.
- 25 verificações no navegador passaram em desktop, 390 px e 320 px: atualização após sincronizar sem trocar de aba, três itens por dia, histórico antigo, pendências separadas, ajustes avançados, privacidade e calendário compacto. Nenhum erro de console ou hidratação foi encontrado nesses cenários.
- Typecheck, lint e build de produção passaram. Nenhuma migração de schema é necessária para esta alteração.

## Conciliação entre origens

O seletor de origem distingue importações, Open Finance e cadastros manuais. Correspondências exatas compartilham o mesmo lançamento, mantendo ambas as evidências. Totais de fatura nunca são inferidos do limite utilizado do cartão. Regras, filtros e auditoria estão em [Origem dos dados financeiros](DATA_ORIGINS.md).
