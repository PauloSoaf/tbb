# Open Finance pelo Meu Pluggy

Integração de **uso pessoal**, gratuita, para trazer saldos e movimentos das contas bancárias do titular para o TBB. Não é uma integração comercial, não guarda senhas bancárias e não usa APIs não oficiais nem scraping.

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
| Faturas (`/bills`) e `billId` para cartões | A cobertura não tem coluna de faturas | Probe |
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
6. Com o diagnóstico aprovado e a migração aplicada, abra **Integrações → Open Finance**, adicione a conexão pelo Item ID e sincronize para listar as contas. Inicialmente elas ficam desabilitadas. Vincule a conta bancária à conta de débito correspondente do TBB, defina a data inicial e só então habilite a importação. Cartões e faturas continuam fora da importação automática nesta etapa.

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
5. **Transferência própria.** Um PIX que o titular já registrou como transferência entre contas aparece no banco como entrada ou saída. A prévia da revisão reconhece essa linha e a liquida, em vez de contar o dinheiro duas vezes.
6. **Pendentes** (`PENDING`) não são importados; entram quando liquidam.
7. **Id mudou na Pluggy** (apagado e recriado): o movimento reaparece com outro id e é tratado como possível duplicata, não como novo.
8. **Dados pessoais.** O número do documento de pagador e recebedor é usado só em memória para reconhecer a mesma titularidade e nunca é gravado.
9. **Erros** viram código curto e mensagem em português; o corpo da resposta do provedor nunca é registrado.

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

- **Cartões e faturas.** A sincronização de cartão está desabilitada até o probe confirmar `billId`, faturas e parcelas; o TBB já tem regras próprias de fatura e parcela que não podem receber dados incompletos. Não se inventa parcela nem se altera vencimento sem evidência.
- **Transferências entre duas contas conectadas** (PIX do titular para ele mesmo, entrando em uma e saindo da outra) sem registro prévio: hoje as duas linhas vão para a revisão por terem a mesma titularidade.
- Saldo do banco pré-preenchendo "Atualizar saldos" (a diferença já aparece na tela).
- Verificação de token de portador para o aplicativo móvel e captura de notificações do Android, que usará o mesmo mecanismo de conciliação.
