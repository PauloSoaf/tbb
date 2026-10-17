# Central de notificações — proposta técnica

Este documento descreve um trabalho futuro. Esta entrega não configura provedor, agenda mensagens, solicita credenciais ou envia e-mails e WhatsApp.

## Preferências e consentimento

Propor `NotificationPreference`, pertencente ao usuário e workspace, com: canal, evento habilitado, idioma, fuso IANA, frequência, dias da semana, horário preferido, antecedência, janela de silêncio, resumo ou mensagem individual, detalhamento financeiro permitido e versão do consentimento. Armazenar `consentedAt`, origem da confirmação e `revokedAt` por canal.

Começar desativado. Habilitar e-mail, WhatsApp oficial e notificações internas separadamente. Confirmar o destino com um fluxo próprio antes do primeiro envio. Não usar automação do WhatsApp Web. Consentimento de um membro não autoriza divulgar faturas do titular para outro membro ou parceiro.

## Agendamento

Converter o horário desejado pelo fuso do usuário; testar horário de verão, mudanças de fuso e períodos que cruzam meia-noite. Eventos financeiros usam o dia do workspace, não o dia UTC do servidor. Durante o silêncio, adiar para a próxima janela permitida, respeitando a validade do lembrete.

Uma fila durável contém referências mínimas: workspace, destinatário, tipo, entidade, janela temporal, versão da preferência, prazo de validade e chave de deduplicação. A restrição única deve abranger destinatário, canal, evento, entidade e período. O consumidor revalida permissão, consentimento e existência da pendência imediatamente antes do envio.

Exemplos de eventos: revisão de fatura, aproximação de limite, fechamento mensal, confirmação de um compromisso, objetivo sem reserva suficiente e conciliação bancária pendente. Resolver a pendência cancela as mensagens ainda não enviadas. O envio de lembrete nunca cria despesa ou altera limite, fatura ou objetivo.

## Transporte e falhas

Separar a composição da mensagem de um adaptador de transporte. Avaliar o cliente de e-mail já disponível no projeto e um provedor da API oficial do WhatsApp antes da implementação. A decisão depende de termos, residência de dados, contratos, disponibilidade e cotação vigentes; este documento não contrata nenhum serviço.

Usar chave idempotente também no provedor quando disponível. Registrar `scheduled`, `claimed`, `sent`, `delivered`, `failed`, `cancelled` e identificador opaco do provedor. Repetir somente falhas transitórias, com backoff exponencial, jitter e limite de tentativas. Erros de endereço, revogação e rejeição permanente encerram o envio. Reservas de processamento expiram para permitir recuperação após queda. Mensagens vencidas não são reemitidas como se ainda fossem atuais.

Monitorar atraso da fila, taxas de falha, cancelamentos, duplicidades impedidas e custo por canal. Logs não guardam valores financeiros, chave PIX, conteúdo integral da mensagem, tokens ou destinos em claro. Restringir acesso e retenção; separar métricas operacionais de conteúdo privado.

## Conteúdo e cancelamento

Por padrão, mensagens externas dizem apenas que há uma pendência no TBB, sem saldo, cartão, estabelecimento ou dívida. O link exige autenticação e autorização atual; parâmetros não contêm valores ou segredos. Resumos com valores requerem opção explícita. Não reutilizar o estado do botão visual de privacidade como consentimento para divulgação externa.

Uma ação de desativar revoga o canal e cancela sua fila pendente. Tratar descadastro, falha de confirmação, exclusão do usuário e remoção de acesso ao workspace. Disponibilizar interrupção global por ambiente e por provedor. Webhooks futuros devem ter assinatura verificada, proteção contra replay e vínculo ao destinatário original.

## Estimativa de custos

Usar a fórmula: infraestrutura fixa + quantidade de e-mails × preço unitário contratado + mensagens oficiais por categoria e país × preço vigente + armazenamento, tráfego e observabilidade.

Exemplo puramente hipotético: 100 usuários, dois lembretes semanais, aproximadamente 866 mensagens mensais. Com uma hipótese de R$ 0,01 por mensagem, o transporte seria R$ 8,66/mês, além dos demais itens. Esses números não são preços de um provedor nem orçamento aprovado. Antes de ativar, obter cotação oficial, comparar resumo com envios individuais e fixar teto mensal com interrupção automática. O canal interno pode evitar custos de transporte, mas ainda usa banco e processamento.

## Testes necessários antes de qualquer ativação

Cobrir consentimento ausente ou revogado, autorização perdida, fuso e silêncio, prazo vencido, pendência já resolvida, webhook repetido, queda entre envio e confirmação, retries, deduplicação, cancelamento e teto de custo. Usar transporte falso em desenvolvimento e uma lista autorizada em homologação. A publicação da interface de preferências não deve habilitar envio por si só.
