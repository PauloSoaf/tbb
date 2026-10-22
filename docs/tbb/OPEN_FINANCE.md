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
6. Com o diagnóstico aprovado e a migração aplicada, abra **Integrações → Open Finance**, adicione a conexão pelo Item ID e sincronize para listar as contas. Inicialmente elas ficam desabilitadas. Vincule cada conta bancária à conta de débito correspondente e cada cartão ao cartão de crédito existente no TBB. Defina a data inicial e só então habilite a importação. O mesmo Item pode disponibilizar conta bancária e cartão; cada um tem seu próprio vínculo e pode ser pausado separadamente pelo checkbox.

### Renovação da autorização

A [documentação oficial do Meu Pluggy](https://docs.pluggy.ai/pt/docs/guides/meu-pluggy-personal-use), conferida em 21/10/2026, informa que a autorização de leitura da aplicação dura **um ano**. Ela é separada do consentimento concedido a cada banco. A gratuidade do uso pessoal continua após o período de teste do Dashboard.

Para renovar, repita **Aplicações → sua aplicação → Demo → Conectar Conta → MeuPluggy** e autorize novamente. Uma sincronização ou atualização pela API não renova essa autorização. Confira o `itemId` resultante: ele pode mudar. Se mudou, pause a conexão antiga e valide a nova antes de habilitá-la, conciliando o histórico já importado. O TBB não migra automaticamente vínculos entre Item IDs distintos.

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
- `OpenFinanceAccountLink`: cada conta do banco, a conta do TBB que a recebe, a **data de início**, se está habilitada (padrão desabilitada) e o último saldo informado pelo banco.
- `OpenFinanceSyncRun`: histórico com contagens (lidos, criados, para revisar, já conhecidos, pendentes ignorados, fora da janela) e código de erro. Sem valores nem descrições.

## Regras de sincronização e conciliação

1. **Nada é importado até a conta ser vinculada e habilitada.** Movimentos anteriores à data de início nunca entram, para que o saldo que o TBB já acompanha não mude por histórico lançado de outra forma. Para saldo, use "Atualizar saldos".
2. **Identidade.** `providerId` quando existe, senão o id da Pluggy. O mesmo movimento é preparado uma vez só (idempotente). Uma janela de 10 dias antes do último movimento cobre revisões do provedor, e o que já é conhecido não custa nada.
3. **Só o inequívoco é criado sozinho:** entrada ou saída simples, estorno, tarifa, IOF e juros, com todos os dados confirmados. Vai para a **revisão** (Importar → Retomar revisão de um original): possível duplicata de lançamento manual (mesma conta, valor, tipo, até 3 dias e nome parecido), pagamento de fatura de cartão, movimento entre contas da mesma titularidade e qualquer linha com dado incerto.
4. **Pagamento de fatura nunca vira gasto**: as compras do cartão já contam.
5. **Transferência própria.** Um PIX que o titular já registrou como transferência entre contas aparece no banco como entrada ou saída. A prévia da revisão reconhece essa linha e a liquida, em vez de contar o dinheiro duas vezes. Para identificar a mesma titularidade, compara-se o documento da contraparte: o recebedor nas saídas e o pagador nas entradas. A presença do titular no seu próprio lado do PIX não transforma um pagamento a terceiros ou um recebimento em transferência própria. Essa interpretação segue os campos `payer`, `receiver` e `type` da [documentação de transações da Pluggy](https://docs.pluggy.ai/pt/docs/products/transactions).
6. **Pendentes** (`PENDING`) da conta bancária não são importados; entram quando liquidam. No cartão, compras da fatura aberta e parcelas futuras podem ser pendentes e são aceitas quando a fatura/ciclo está confirmado. Isso não cria saída na conta de débito.
7. **Id mudou na Pluggy** (apagado e recriado): o movimento reaparece com outro id e é tratado como possível duplicata, não como novo.
8. **Dados pessoais.** O número do documento de pagador e recebedor é usado só em memória para reconhecer a mesma titularidade e nunca é gravado.
9. **Erros** viram código curto e mensagem em português; o corpo da resposta do provedor nunca é registrado.

## Cartões, faturas e parcelas

- **Vínculo.** Uma conta `CREDIT` da Pluggy só pode apontar para `CREDIT_CARD` no mesmo workspace; o servidor exige uma data inicial para compras. A conta bancária continua separada e seus saldos não são ajustados pelo fluxo do cartão.
- **Leitura completa.** `/bills` é percorrido por página; `/v2/transactions` usa cursor. Um retorno inválido impede a conciliação daquele cartão e aparece como falha parcial da conexão, preservando o restante.
- **Identidade da fatura.** O vínculo é guardado em `FinancialSnapshot`, com origem imutável em `FinancialSource`. Na primeira conciliação, vencimento exato ou uma previsão única do período permitem reaproveitar o ID existente. Uma previsão passa a fatura conhecida; datas divergentes ou múltiplos candidatos exigem revisão. Nenhuma tabela adicional é necessária para crédito.
- **Atualização do total.** O total do banco é o valor de face, separado dos pagamentos registrados. Compras importadas recebem `ALREADY_INCLUDED`; não são somadas novamente à fatura. Quando existem compras manuais `ADDED_TO_STATEMENT`, a base armazenada é o total do banco menos esses acréscimos, mantendo o total efetivo uma vez só.
- **Fatura ainda não publicada.** Alguns conectores retornam apenas faturas fechadas em `/bills`. Nesses casos, `Account.balance` representa o saldo ainda não pago da fatura aberta, conforme a [documentação de contas](https://docs.pluggy.ai/en/docs/products/accounts). O TBB propõe associá-lo à fatura atual já cadastrada e exige uma primeira conferência. O total conciliado soma ao saldo os pagamentos conhecidos até a data da fonte; a dedução normal desses pagamentos mantém o saldo uma vez só. Vencimento e fechamento vêm da fatura existente, sem inventar um novo ciclo. Pagamentos sem data ou alterações após a prévia bloqueiam a confirmação. Um vencimento antigo no cadastro de crédito não é usado para reabrir uma fatura histórica quitada.
- **Preservação.** Datas/valores divergentes na primeira leitura, alterações manuais posteriores, detalhamento maior que o total, saldo restante, sobreposição, transporte de saldo e faturas quitadas são protegidos. O histórico já quitado mantém também suas datas e metadados locais em leituras repetidas. O snapshot guarda a versão da fatura e a identidade dos acréscimos manuais. Atualizações posteriores só são automáticas enquanto esse vínculo continua válido e a fonte não é mais antiga que a conciliação local.
- **Revisão de faturas.** Em Bancos conectados, “Faturas para conciliar” mostra total do banco, candidatos locais e situação. Confirmar exige selecionar o registro correto e conferir o total. O servidor verifica titularidade, conta, versão e colisões novamente. Uma quitação nova continua no fluxo de pagamento das Faturas, que também concilia a conta bancária.
- **Ciclo sem `billId`.** Uma compra pendente pode usar a fatura atual apenas com vínculo confirmado, fechamentos anterior e atual conhecidos e data estritamente entre esses fechamentos. Para uma fatura ainda não publicada, o fechamento local exige a conferência explícita do titular junto ao saldo em aberto. O dia de fechamento e parcelas sem um ciclo confirmado aguardam revisão; não se inventam vencimentos nem parcelas restantes.
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

A cobertura inclui compras pendentes, ciclos sem `billId`, parcelas incompletas, paginação de faturas, repetição sem duplicatas, correções do provedor, preservação de pagamentos e histórico quitado, promoção de previsão, mudanças manuais e aprovação de saldo em aberto. Os testes de PostgreSQL usam um banco descartável e respostas sintéticas da Pluggy.

A tela foi verificada em desktop, 390 px e 320 px, incluindo privacidade, escolha do cartão, confirmação de fatura, bloqueio para não titulares e erros de console/hidratação. Tipos, lint e compilação de produção também fazem parte da validação.

A leitura de uma fatura incompleta não substitui silenciosamente o valor local: a primeira associação do saldo em aberto permanece em **Faturas para conciliar**. Após conferir e confirmar, use **Sincronizar agora** para importar o detalhamento já conciliado. Essa ação lê os dados disponíveis; não solicita atualização do Meu Pluggy.
